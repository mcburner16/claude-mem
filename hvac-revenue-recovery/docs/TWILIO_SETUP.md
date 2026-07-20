# Twilio Configuration

One local Twilio number per client. ~10 minutes per client once the account exists.

## Account-level (once)

1. Create/upgrade a Twilio account (trial numbers can only text verified numbers —
   fine for dev, not for production).
2. Console → Account → copy **Account SID** and **Auth Token** into the app env.
3. **A2P 10DLC registration** (required by US carriers for application SMS):
   - Console → Messaging → Regulatory Compliance → create a **Brand** (your
     business EIN) and a **Campaign** (use case: "Customer Care"; sample messages:
     the initial outreach + a qualification question; opt-in description: "Customer
     initiates by calling the business; SMS follows their missed call. STOP to
     opt out.").
   - Attach each client number to the campaign as you onboard them.
   - Until approval (days–weeks), throughput is limited and filtering is likely —
     start registration **before** the first pilot goes live.
   - Record brand/campaign SIDs in Dashboard → Settings → Compliance for each client.

## Per-client number setup

1. **Buy a number**: Console → Phone Numbers → Buy a Number. Local to the client
   (e.g. 214/469/972 for Dallas). Voice + SMS capable.
2. **Voice webhook**: number → Voice Configuration →
   - "A call comes in": **Webhook**, `https://YOUR-APP/api/twilio/voice`, HTTP POST
3. **Messaging webhook**: number → Messaging Configuration →
   - "A message comes in": **Webhook**, `https://YOUR-APP/api/twilio/sms`, HTTP POST
4. **Register the number in the app**: set `twilio_number` when provisioning the
   company (`--twilio-number`), or update the company row. The app routes inbound
   webhooks to the right client by matching the called number.
5. **Attach the number to the A2P campaign** (above).
6. **Opt-out handling**: Twilio's Advanced Opt-Out is left at defaults — Twilio
   auto-replies to STOP/START/HELP at the carrier level *and* the app records
   opt-outs itself. Do not disable Twilio's default handling.

## The dial-timeout rule (read this twice)

The app forwards calls with `<Dial timeout=N>` (default N=20). If the client's
voicemail answers before N seconds, Twilio sees "completed" and **no recovery text
is sent**. During onboarding:

1. Call the client's real line; count seconds until voicemail picks up.
2. Set the app's dial timeout (Dashboard → Settings → Phone) at least 5s **below** that.
3. If their voicemail picks up very fast (< 15s), have them lengthen it with their
   carrier, or accept that voicemail races the text.

## Verify

Call the Twilio number:
- Answer the forwarded call → **no** text should arrive.
- Let it ring out → caller gets the recovery text within ~15s, owner gets the
  "NEW MISSED-CALL LEAD" SMS/email, and the lead appears in the dashboard.

## Costs (per client, approximate)

- Number: ~$1.15/mo
- Voice: ~$0.0085/min inbound + ~$0.014/min forwarded leg
- SMS: ~$0.0079 per segment each way; a full qualification ≈ 12–16 segments ≈ $0.12
- A2P: $2/mo campaign fee (+ one-time $4 brand + $15 campaign vetting)

See [COSTS.md](COSTS.md) for totals.
