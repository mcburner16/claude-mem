# Client Onboarding Checklist

Target: live within 2 business days of signed pilot agreement ($99 setup / $99 mo).

## Before the kickoff call (you)

- [ ] Buy a local Twilio number for the client; configure Voice + SMS webhooks
      ([TWILIO_SETUP.md](TWILIO_SETUP.md))
- [ ] Attach the number to your A2P 10DLC campaign
- [ ] Provision the company + owner login:
      `node scripts/provision-company.mjs --name ... --slug ... --email ... --password ... --twilio-number ... --forward-to ...`

## Kickoff call with the client (30 min)

Collect and enter in Dashboard → Settings:

- [ ] Exact business name as it should appear in texts
- [ ] Forwarding number (the phone that should ring) — confirm it's E.164 correct
- [ ] **Voicemail timing**: call their line together, count seconds to voicemail,
      set dial timeout ≥5s below it
- [ ] Business hours + timezone; after-hours behavior (still ring vs. straight to text)
- [ ] Owner/dispatcher cell number(s) and email(s) for notifications
- [ ] Review every message template with the owner, especially:
  - [ ] Initial outreach text (their name, their tone)
  - [ ] **Emergency safety response — the owner must read and approve it; click
        "Mark reviewed" in Settings after they confirm** (wording involves
        life-safety instructions and is the company's responsibility)
- [ ] Average job value (used only for clearly-labeled estimates)
- [ ] Walk through [COMPLIANCE_CHECKLIST.md](COMPLIANCE_CHECKLIST.md) items marked "client"

## Go-live steps

- [ ] Test call #1: answer the forwarded call → verify NO text is sent
- [ ] Test call #2: let it ring out → verify caller text, owner SMS + email, lead in dashboard
- [ ] Complete the SMS conversation as the "caller" → verify qualified notification
- [ ] Update the lead to appointment_booked → verify it shows in Reports
- [ ] Client updates the phone number they advertise:
  - [ ] Google Business Profile → tracking number
  - [ ] Website header/footer/contact page
  - [ ] (Optional, keep old number alive) carrier conditional forwarding from the
        old number to the tracking number for busy/no-answer
- [ ] Owner bookmarked the dashboard on their phone; signed in successfully
- [ ] Owner knows: reply to any lead by calling/texting the customer directly from
      their own phone; update lead status + job value in the dashboard
- [ ] Weekly report recipients confirmed

## One week later

- [ ] Review the first weekly report together
- [ ] Confirm job values are being entered (this powers the case study)
- [ ] Ask for the testimonial/case-study commitment agreed in the pilot deal
