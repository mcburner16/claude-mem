# Troubleshooting

## No recovery text after a missed call

1. **Did the dial "complete"?** Check the calls table (or Twilio Console → Monitor →
   Calls → the call → child call). If `DialCallStatus=completed`, their **voicemail
   answered the call**. Lower the dial timeout below the voicemail pickup time
   (Settings → Phone).
2. **Quiet hours**: between 21:00 and 08:00 local, leads are created but the first
   text is held. The lead will show in the dashboard with no outbound message.
3. **Opt-out**: the caller previously texted STOP. Check the lead's status /
   `opt_outs` table. They must text START to resume.
4. **Duplicate window**: same caller already had a lead in the last 24h → by design
   no second text; the repeat call is noted on the existing lead.
5. **Message send error**: open the lead — messages that failed to send show
   "NOT SENT: <error>" under the bubble. Common: unverified destination on a Twilio
   trial account; A2P campaign not approved (error 30034); number not SMS-capable.
6. **Webhook not firing**: Twilio Console → Monitor → Errors. 403 = signature
   validation failed (see below). 11200 = your app URL unreachable/timeout.

## Twilio returns 403 "Invalid Twilio signature"

`NEXT_PUBLIC_APP_URL` must exactly match the public URL configured in Twilio
(https, exact host, no trailing slash, no different subdomain). Behind a proxy the
app reconstructs the signed URL from that env var — fix the env var, redeploy.

## Calls don't ring the company phone

- `forward_to_number` empty or not E.164 (`+1...`) → Settings → Phone.
- Company phone blocking unknown callers or the Twilio caller ID.
- Check Twilio call logs for the child leg's status/error.

## Owner not getting notifications

- SMS: `notify_sms_numbers` must be E.164; check the notifications table for the
  error column; on a trial account, recipient must be verified.
- Email: `RESEND_API_KEY` set? `EMAIL_FROM` domain verified in Resend? Check the
  notifications table `error` column.
- Event toggles: Settings → Notifications (emergency alerts always send).

## Dashboard login fails

- Account provisioned? (`scripts/provision-company.mjs` creates user + membership.)
- User exists but sees nothing: missing `company_users` row — rerun the provision
  script (it's idempotent) or insert the membership manually.
- Password reset: Supabase Dashboard → Authentication → Users → reset.

## Wrong company received the lead

The app routes by the Twilio number that was called (`companies.twilio_number`).
Two companies must never share a number; verify the number on the company row
matches the number in the Twilio console exactly (E.164).

## Weekly report didn't arrive

- Vercel → Project → Crons: did the run fire and succeed?
- `CRON_SECRET` env var present in Vercel? (Vercel sends it automatically.)
- Resend domain verified? Check spam folder.
- Manual run: `curl https://APP/api/cron/weekly-report -H "Authorization: Bearer $CRON_SECRET"`

## Conversation stuck / bot stopped replying

By design the bot goes silent in `human_takeover`, `emergency`, and `opted_out`
stages — a human is expected to take over (the owner was notified). The caller can
text `RESTART` to start over. Also by design: after 2 unparseable answers at one
stage or 25 total messages, it hands off rather than looping.

## Where to look

- **Lead page** — full conversation, send errors, system notes.
- **Supabase** — `calls` (dial status, raw webhook payload), `messages`,
  `notifications`, `audit_log`, `opt_outs`.
- **Twilio Console → Monitor** — Errors, call logs, message logs (delivery status).
- **Vercel → Logs** — `[voice]`, `[dial-complete]`, `[sms]` prefixed errors.
