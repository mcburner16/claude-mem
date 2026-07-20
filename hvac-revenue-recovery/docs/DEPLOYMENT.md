# Deployment — Supabase + Vercel

Total time: ~45 minutes the first time.

## 1. Supabase

1. Create a project at https://supabase.com (free tier is fine for the pilot).
   Choose a region near Dallas (`us-east-1` or `us-west-1`).
2. SQL Editor → paste and run `supabase/migrations/0001_init.sql`.
3. Authentication → Providers → Email: **disable "Allow new users to sign up"**
   (accounts are provisioned by you, not self-serve).
4. Settings → API: copy the **Project URL**, **anon key**, and **service_role key**.

## 2. Vercel

1. Import the repository at https://vercel.com/new. Set the **Root Directory** to
   `hvac-revenue-recovery` if the repo contains other code.
2. Add environment variables (Production + Preview) — every key from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
   - `RESEND_API_KEY`, `EMAIL_FROM`
   - `NEXT_PUBLIC_APP_URL` = your production URL (e.g. `https://recovery.yourdomain.com`)
   - `CRON_SECRET`, `DEMO_SECRET` = `openssl rand -hex 32` each
   - `DRY_RUN=false`, `SKIP_TWILIO_SIGNATURE_VALIDATION=false`
3. Deploy. `vercel.json` already schedules the weekly report cron
   (Mondays 13:00 UTC ≈ 8am Dallas); Vercel automatically sends `CRON_SECRET` as the
   bearer token — just make sure the env var exists.
4. **Important**: `NEXT_PUBLIC_APP_URL` must exactly match the public URL Twilio
   calls (scheme + host, no trailing slash) or signature validation will fail.

## 3. Resend

1. Create an API key at https://resend.com.
2. Verify a sending domain (or use `onboarding@resend.dev` for testing only).
3. Set `EMAIL_FROM` to a verified address, e.g.
   `"HVAC Revenue Recovery <reports@yourdomain.com>"`.

## 4. Twilio

Follow [TWILIO_SETUP.md](TWILIO_SETUP.md) — buy a number per client and point its
Voice and Messaging webhooks at the deployed URL.

## 5. First accounts

```bash
# demo company for sales calls
node scripts/provision-company.mjs --name "Lone Star Air Solutions (DEMO)" \
  --slug demo-hvac --email you@yourdomain.com --password '...' --demo
node scripts/seed-demo.mjs https://your-app.vercel.app

# first real client
node scripts/provision-company.mjs --name "Client Co" --slug client-co \
  --email owner@client.com --password '...' \
  --twilio-number +1214... --forward-to +1214...
```

(The scripts read `.env.local`; for production run them locally with the production
Supabase keys in your shell env.)

## 6. Post-deploy smoke test

1. `curl -s -X POST https://your-app/api/demo/reset -H "x-demo-secret: $DEMO_SECRET"` → `{"ok":true,...}`
2. Sign in at `/login` with the demo account → dashboard shows 7 sample leads.
3. Run the [E2E test script](E2E_TEST_SCRIPT.md) sections 1–3.
4. `curl -s https://your-app/api/cron/weekly-report -H "Authorization: Bearer $CRON_SECRET"` → JSON stats.

## Updating

Push to `main` → Vercel redeploys. Database changes: add a new numbered file in
`supabase/migrations/` and run it in the SQL Editor. Never edit `0001_init.sql`
after it has run in production.
