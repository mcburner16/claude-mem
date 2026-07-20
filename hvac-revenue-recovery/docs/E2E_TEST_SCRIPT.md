# Manual End-to-End Test Script

Run after every deploy and before every sales demo. Sections 1–5 need only demo
mode; section 6 needs a real Twilio number.
Expected total time: ~15 minutes.

Setup: signed in as the demo-company user. Start clean:
Dashboard → Demo Controls → **Reset demo data** (or `node scripts/seed-demo.mjs`).

## 1. Seeded data sanity

- [ ] Leads list shows 7 leads: AC-not-cooling (appointment booked), system failure
      (job won), heating issue (qualified), maintenance (contacted), after-hours
      (new), spam, and an ⚠️ emergency lead
- [ ] Overview tiles show non-zero missed calls / texts / qualified counts
- [ ] Emergency lead shows the red banner + emergency message in the conversation

## 2. Missed call → recovery text

- [ ] Demo Controls → **Simulate missed call** → log shows "lead created, recovery
      text sent"
- [ ] Leads list (refresh) shows the new lead, status **new**
- [ ] Lead page shows the outbound outreach text containing the company name and
      "Reply STOP to opt out"

## 3. Full qualification conversation

Using the quick-script buttons in order (YES → name → issue → system down →
urgency → ZIP → callback):

- [ ] Each reply gets exactly one bot response, asking the next question
- [ ] After the callback answer: status becomes **qualified**, stage **completed**
- [ ] Completion text does NOT promise an appointment/arrival time/price
- [ ] Lead details show name/issue/system-down/urgency/ZIP/callback all captured

## 4. Edge flows (simulate a fresh missed call before each)

- [ ] **Emergency**: reply "I smell gas near the furnace" at any stage → emergency
      response (leave, call 911) sent; lead flagged ⚠️; bot silent on further texts
- [ ] **STOP**: reply STOP → status **opted_out**; further replies get nothing;
      START restarts the flow
- [ ] **Human request**: reply "can I talk to a real person" → human-takeover reply,
      then silence
- [ ] **Unclear loop**: reply gibberish ("@@@@") 3× at the name question → hand-off
      message, stage human_takeover (no endless loop)
- [ ] **No consent**: reply "no wrong number" → polite close, status closed_lost
- [ ] **Duplicate call**: simulate a call, then simulate another with the same
      number (log the `from` and pass it via curl, or just simulate twice quickly
      and check) → second call adds a note, does NOT send a second outreach

## 5. Lead management + reporting

- [ ] On a qualified lead: set status **appointment_booked**, set an appointment
      time, job value 389.00, type Estimate → Save → persists after refresh
- [ ] Set status **job_won**, value type Confirmed → Reports (7 days) shows it under
      Confirmed revenue; estimates and unreported counts are separate lines
- [ ] Search finds leads by name/phone fragment; status filter works
- [ ] Settings: change a template, save, simulate a new missed call → new wording
      used; change it back
- [ ] Audit: Supabase `audit_log` has rows for the status/settings changes

## 6. Real telephony (per real client number)

- [ ] Call the Twilio number, **answer** the forwarded call → no text sent
- [ ] Call again, let it ring out → recovery text within ~15s; owner SMS + email
      arrive; lead in dashboard
- [ ] Reply from the real phone and complete the flow → owner "QUALIFIED LEAD"
      notification arrives
- [ ] Text STOP from the real phone → Twilio's confirmation arrives; app shows
      opted_out; no further texts
- [ ] Weekly report manual run returns stats:
      `curl https://APP/api/cron/weekly-report -H "Authorization: Bearer $CRON_SECRET"`

## 7. Isolation spot-check (once per new client)

- [ ] Sign in as client A: only client A's leads visible; `/dashboard/leads/<client-B-lead-id>`
      returns 404
- [ ] Demo endpoints with a non-demo session return 401
