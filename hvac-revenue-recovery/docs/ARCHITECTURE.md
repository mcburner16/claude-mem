# Architecture Decisions — HVAC Revenue Recovery

## What this is

A missed-call → SMS recovery system for independent HVAC companies. When a call to a
company's tracking number goes unanswered, the caller gets a text within seconds, a
deterministic SMS conversation qualifies the service request, the owner is notified,
and the lead is tracked through booking in a dashboard.

## Stack (and why)

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 14 (App Router, TypeScript) | One deployable for webhooks + dashboard; free tier on Vercel |
| Database + auth | Supabase (Postgres, RLS, email/password auth) | RLS gives real tenant isolation without building it; free tier fits 1–20 clients |
| Telephony | Twilio (Voice + SMS on one number per client) | Industry default; `<Dial>` + status callbacks give reliable missed-call detection |
| Email | Resend | Simple API, cheap, good deliverability for notifications and weekly reports |
| Styling | Tailwind | Fast to build a clean, mobile-friendly dashboard |
| Tests | Vitest | Fast unit tests over the pure-logic core |

Deliberately **not** used: queues, Redis, microservices, ORMs, the Twilio SDK
(webhook signature validation is ~20 lines of documented HMAC), or any AI dependency
in the critical path. At 1–20 clients this is a single Vercel project and a single
Supabase project.

## Phone routing: how missed-call detection actually works

You cannot passively "monitor" a company's existing phone line. The call has to flow
through something we control. The options:

| Method | How | Verdict for pilot |
|---|---|---|
| **Twilio tracking number (chosen)** | We buy a local Twilio number; it forwards every call to the company's real line via `<Dial>`. The company advertises the tracking number (Google Business Profile, website). | ✅ Simplest, zero risk to their existing line, working in one day |
| Conditional call forwarding | The company keeps advertising their existing number and sets carrier-level "forward when busy/no-answer" (e.g. `*71`/`*90` codes on most carriers) to the Twilio number. Missed calls land on our number directly. | ⭐ Best upgrade path after the pilot: real number stays primary. Slightly more onboarding friction (carrier codes vary), and we can't distinguish busy vs. no-answer as precisely |
| Port the existing number to Twilio | Full control, but porting takes 2–4 weeks, risks downtime, and is scary for a pilot customer | ❌ Not for pilot |
| Integrate their VoIP provider (RingCentral etc.) | Per-provider APIs and webhooks | ❌ Only if a specific client demands it |
| Demo mode | Server-side simulation of the exact webhook code paths | ✅ Built in — used for sales demos and testing |

### Chosen flow (tracking number)

```
Caller → Twilio number → POST /api/twilio/voice
  → TwiML <Dial timeout=20 action=/api/twilio/dial-complete> company's real phone
      answered (DialCallStatus=completed)  → hang up, do nothing
      no-answer / busy / failed / canceled → create lead → SMS caller (≈5–15s)
                                           → notify owner (SMS + email)
Caller replies → POST /api/twilio/sms → state machine → next question / done
```

**Critical config**: the dial timeout must be *shorter* than the company's voicemail
pickup (typically 25–30s), otherwise voicemail "answers" the call and we treat it as
answered. Default 20s, configurable 5–55s per company. This is a documented
limitation of call-forwarding-based detection: if their voicemail picks up early, we
can't tell. Human answering machine detection is a post-pilot option.

After-hours calls: per-company setting — either still ring the real line (text only
if unanswered) or skip the dial and go straight to the recovery text.

## Multi-tenancy

- Every table carries `company_id`. Postgres RLS policies restrict dashboard users
  (via `company_users`) to their own company's rows.
- Dashboard reads/writes use the user's session client → RLS enforced by the DB.
- Webhooks/cron use the service-role key (RLS bypassed) but resolve the company from
  the Twilio number called and scope every query explicitly by `company_id`.
- Designed comfortably for 1–20 companies; no enterprise machinery.

## Conversation engine

A pure, unit-tested state machine (`src/lib/conversation/`): stages
`initial_outreach → consent → name → issue → system_down → urgency → zip →
callback → completed`, plus `human_takeover`, `opted_out`, `emergency`.

- Deterministic regex/keyword parsers; no AI in the loop (an AI classification layer
  is a documented feature-flag extension point, not built).
- STOP/START/HELP handled per carrier rules; STOP recorded in `opt_outs` and Twilio's
  own suppression also applies.
- Two unclear answers at any stage, a request for a human, or >25 total messages →
  human takeover; automation goes silent and the owner is alerted.
- Emergency keywords (gas, CO, smoke, fire…) short-circuit everything with a
  configurable safety message and an always-on owner alert. The wording ships with a
  "needs company review" flag that any edit resets.
- Scripted replies never promise appointments, arrival times, prices, service-area
  coverage, or emergency availability — enforced by a test.

## Reliability

- **Idempotency**: unique `(company_id, call_sid)` on calls and
  `(company_id, twilio_sid)` on messages — replayed webhooks are no-ops.
- **Duplicate-text protection**: a caller with an active lead in the last 24h gets a
  note on the existing lead, not a second outreach; plus a 12-texts/hour/caller rate
  limit via an atomic DB counter.
- **Webhook auth**: X-Twilio-Signature HMAC validation (constant-time compare);
  demo endpoints need the demo session or `DEMO_SECRET`; cron needs `CRON_SECRET`.
- **Fail-safe TwiML**: any voice-webhook error still returns speech + hangup, never
  dead air on a customer call.
- **Quiet hours**: per-company mode governs the caller text during 9pm–8am local
  (configurable) — `immediate` (send anyway), `schedule` (hold and release at the
  next permitted time via the release cron, with an atomic claim so it can't send
  twice), or `notify_only` (never text). The lead is always created and the owner
  always notified, so no lead is lost. Each business must review its consent policy
  before choosing.
- Env vars validated with zod at first use; audit log on lead/settings changes.

## Revenue reporting honesty

The system never invents revenue. Reports split: **confirmed** (owner-entered actual
values on won jobs), **estimated** (owner-entered values marked estimate), and a
count of qualified leads with **no value recorded**. Appointment/job outcomes are
manual dashboard entries in the MVP.

## Extension points (deliberately stubbed, not built)

- `notify_on` config → more event types later
- `a2p_registration` jsonb → carrier registration tracking
- Feature-flag slot for AI classification of unclear replies
- `data_retention_days` stored now; automated purge job is post-pilot
- Conditional call forwarding as tier-2 onboarding option
