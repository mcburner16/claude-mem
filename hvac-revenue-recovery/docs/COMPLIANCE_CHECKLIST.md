# Compliance Review Checklist

**This software does not make you or your clients automatically compliant.** It
implements reasonable safeguards; the items below need human review — several by a
lawyer familiar with TCPA/telemarketing law — before and during operation.
Last reviewed: 2026-07. Laws and carrier rules change; re-review quarterly.

## Built into the software (verify, don't assume)

- [x] STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT handled; opt-outs stored per company;
      no further automated texts after opt-out (START re-subscribes)
- [x] HELP returns business identification and opt-out instructions
- [x] Initial message identifies the business and includes "Reply STOP to opt out"
- [x] Quiet hours: no first-contact texts 21:00–08:00 recipient-local (configurable;
      TCPA safe harbor is 8am–9pm *called party's* local time — the app uses the
      company's timezone as a proxy; fine for local HVAC service areas)
- [x] Full message log retained; per-caller outbound rate limit; duplicate-text
      protection
- [x] Emergency-language safety response with mandatory company review flag

## Legal review required (owner: you)

- [ ] **TCPA consent theory**: this system texts a consumer who called the business
      and wasn't answered. The position that a customer-initiated call to a business
      constitutes consent to a follow-up text about that inquiry is common in the
      missed-call-textback industry but is **not risk-free**. Have a lawyer review
      the theory, the message wording, and the single-follow-up design. Do not add
      marketing/promotional content to these texts — that changes the analysis
      entirely.
- [ ] Confirm no automated *marketing* texts are ever sent (system is transactional/
      conversational by design; keep it that way without legal review)
- [ ] Texas telemarketing/telephone solicitation rules (and each new state you enter)
- [ ] Client contract: clarify who is the "sender" of messages, indemnification,
      and who owns the lead data
- [ ] Privacy policy + terms for the dashboard and for message recipients; disclose
      data sharing (Twilio, Supabase, Vercel, Resend as processors)

## Carrier / Twilio (owner: you)

- [ ] A2P 10DLC brand + campaign registered and **approved before go-live**
      (unregistered traffic is filtered and fined)
- [ ] Campaign use-case description matches actual behavior (customer-initiated
      missed-call follow-up, customer care)
- [ ] Each client number attached to the campaign; SIDs recorded in Settings →
      Compliance
- [ ] Twilio Acceptable Use + Messaging Policy reviewed
- [ ] Twilio default STOP handling left enabled

## Per-client (owner: you + client, at onboarding)

- [ ] Client approved the exact initial outreach wording (their business name must
      be accurate — it's their identity on the line)
- [ ] **Client reviewed and approved the emergency safety response wording** (click
      "Mark reviewed" in Settings; any edit re-requires review)
- [ ] Client understands staff must not paste customer PII into notes beyond what's
      needed
- [ ] Data retention setting agreed (default 730 days); deletion process on contract
      end agreed
- [ ] If using conditional call forwarding: client's carrier terms permit it

## Operational

- [ ] Quarterly: sample real conversations for tone/claims (no pricing promises, no
      appointment guarantees — the bot never makes them; humans shouldn't either in
      the first automated exchange)
- [ ] Monitor Twilio error 30034/30007 (filtering) — spikes mean carrier problems
- [ ] Opt-out rate monitored; >2–3% means the outreach wording needs work
- [ ] Incident plan: how to shut off all outbound SMS fast (set DRY_RUN=true and
      redeploy, or clear the company's twilio_number)
