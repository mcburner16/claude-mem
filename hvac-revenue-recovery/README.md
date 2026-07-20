# HVAC Revenue Recovery

Missed-call → SMS lead recovery for independent HVAC companies. When nobody answers
the phone, the caller gets a text within seconds, an automated conversation collects
the service details, the owner gets an instant summary, and the lead is tracked to
booked/won in a dashboard.

**Docs index**

| Doc | Purpose |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture decisions + phone-routing explanation |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Supabase + Vercel deployment |
| [docs/TWILIO_SETUP.md](docs/TWILIO_SETUP.md) | Twilio number + webhook configuration |
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | Client onboarding checklist |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common failures and fixes |
| [docs/COMPLIANCE_CHECKLIST.md](docs/COMPLIANCE_CHECKLIST.md) | TCPA / A2P 10DLC / carrier review items |
| [docs/E2E_TEST_SCRIPT.md](docs/E2E_TEST_SCRIPT.md) | Manual end-to-end test script |
| [docs/SALES_DEMO_SCRIPT.md](docs/SALES_DEMO_SCRIPT.md) | 10-minute sales demo script |
| [docs/COSTS.md](docs/COSTS.md) | Operating costs at 1 / 5 / 20 clients |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Pilot-first roadmap |

## Local setup

Prereqs: Node 18+ (22 recommended), a free [Supabase](https://supabase.com) project,
a [Twilio](https://twilio.com) account (trial works for dev), optionally
[Resend](https://resend.com) for email.

```bash
cd hvac-revenue-recovery
npm install
cp .env.example .env.local        # fill in the values (see .env.example comments)
```

1. **Database**: in the Supabase dashboard → SQL Editor, run
   `supabase/migrations/0001_init.sql` (or `supabase db push` with the CLI).
2. **Demo company + login**:
   ```bash
   node scripts/provision-company.mjs \
     --name "Lone Star Air Solutions (DEMO)" --slug demo-hvac \
     --email demo@example.com --password 'choose-a-password' --demo
   npm run dev                      # then, in another terminal:
   node scripts/seed-demo.mjs       # seeds the 7 sample leads
   ```
3. Open http://localhost:3000, sign in with the demo login, and use
   **Demo Controls** to simulate a missed call end-to-end. No Twilio needed for
   demo mode.

For real telephony locally, expose the dev server with `ngrok http 3000`, set
`NEXT_PUBLIC_APP_URL` to the ngrok URL, and point the Twilio number's webhooks at
it (see docs/TWILIO_SETUP.md). Set `SKIP_TWILIO_SIGNATURE_VALIDATION=true` only if
you're testing webhooks with curl instead of real Twilio requests.

## Commands

```bash
npm run dev          # dev server on :3000
npm run build        # production build (also lints)
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm test             # vitest unit tests (state machine, parsers, safety, signatures)
```

## Provisioning a real client

```bash
node scripts/provision-company.mjs \
  --name "Smith Air & Heat" --slug smith-air \
  --email owner@smithair.com --password 'temp-password' \
  --twilio-number +12145550100 --forward-to +12145551234
```

Then follow [docs/ONBOARDING.md](docs/ONBOARDING.md).

## Repository layout

```
src/lib/conversation/   state machine, parsers, emergency detection (pure, tested)
src/lib/                twilio client+signature, leads service, notify, reporting, demo
src/app/api/twilio/     voice, dial-complete, sms webhooks
src/app/api/demo/       simulate-call, simulate-reply, reset
src/app/api/cron/       weekly report (Vercel cron, Mondays)
src/app/dashboard/      owner dashboard (overview, leads, reports, settings, demo)
supabase/migrations/    schema + RLS policies
scripts/                provision-company.mjs, seed-demo.mjs
tests/                  vitest suites (79 tests)
```
