# Roadmap

## Must complete before the first pilot (blocking)

- [ ] Deploy to production (Supabase + Vercel + Resend) per DEPLOYMENT.md
- [ ] **A2P 10DLC brand + campaign registered and approved** — longest lead time,
      start immediately; texts will be carrier-filtered without it
- [ ] Buy first client Twilio number; run E2E_TEST_SCRIPT section 6 with real phones
- [ ] Lawyer review of the TCPA consent theory + outreach wording
      (COMPLIANCE_CHECKLIST.md)
- [ ] Pilot agreement doc: $99/$99, cancel-any-month, case-study commitment, who is
      the message sender, data ownership
- [ ] Password manager entry + break-glass: how to disable all outbound SMS in
      <5 minutes (DRY_RUN=true redeploy)
- [ ] Run the full manual E2E script on production

## Improvements after the first client (validated pain, not speculation)

- Password reset + invite flow (today: you reset via Supabase dashboard)
- Owner reply-from-dashboard (manual SMS into the thread, takeover button)
- Conditional call forwarding onboarding guide per carrier (AT&T/Verizon/T-Mobile
  codes) so clients keep advertising their existing number
- Missed-call detection hardening: answering-machine detection (AMD) to catch
  fast-voicemail cases
- Automated data-retention purge job (setting exists; job doesn't)
- CSV export of leads
- Per-client Twilio subaccounts for cleaner billing separation
- In-dashboard weekly report history

## Wait for proven demand (do NOT build early)

- Stripe billing / self-serve signup (invoice the first 5 clients manually)
- AI classification of unclear replies (feature-flag slot exists; deterministic
  flow is converting fine until data says otherwise)
- AI voice answering, full appointment scheduling, calendar integration
- CRM integrations (ServiceTitan, Housecall Pro, Jobber)
- Native mobile app (the dashboard is mobile-friendly)
- Review requests, reactivation campaigns, estimate-follow-up campaigns
- Multi-location/franchise features, custom branding beyond company name
- Marketing website (sell the first 5 clients by phone and demo)
