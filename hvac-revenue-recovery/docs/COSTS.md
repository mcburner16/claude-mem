# Monthly Operating Costs

Assumptions per client: ~60 forwarded calls/mo (avg 4 min), ~20 missed calls → 20
recovery conversations (~14 SMS segments each incl. owner notifications), weekly
report emails. Prices are July 2026 US list prices; check current pricing.

## Fixed platform costs (shared across all clients)

| Service | 1 client | 5 clients | 20 clients |
|---|---|---|---|
| Vercel | $0 (Hobby)* | $20 (Pro) | $20 (Pro) |
| Supabase | $0 (Free) | $0–25 | $25 (Pro) |
| Resend | $0 (3k emails/mo free) | $0 | $20 (50k) |
| Twilio A2P campaign fee | $2 | $2 | $2 |
| **Platform subtotal** | **~$2** | **~$25–50** | **~$67** |

\* Vercel Hobby prohibits most commercial use — fine while demoing to yourself, but
move to Pro ($20) at your first paying client. Budget accordingly: treat 1-client
platform cost as ~$22.

## Per-client Twilio usage

| Item | Est. |
|---|---|
| Phone number | $1.15 |
| Voice: 60 calls × 4 min × ($0.0085 in + $0.014 out) | ~$5.40 |
| SMS: 20 convos × 14 segments × $0.0079 + owner alerts | ~$2.60 |
| **Per client** | **~$9–10** |

## Totals

| Clients | Platform | Twilio | **Total** | Revenue @ $99/client | Margin |
|---|---|---|---|---|---|
| 1 | ~$22 | ~$10 | **~$32** | $99 | ~68% |
| 5 | ~$45 | ~$50 | **~$95** | $495 | ~81% |
| 20 | ~$67 | ~$195 | **~$262** | $1,980 | ~87% |

One-time: Twilio A2P brand registration $4 + campaign vetting $15; a domain ~$12/yr.

Notes:
- Voice forwarding minutes are the swing factor. A client with heavy call volume
  (300+ calls/mo) costs ~$25–30 alone — still fine at $99, but watch it.
- No paid AI usage: the conversation engine is deterministic.
- At 20 clients consider Twilio committed-use discounts and Supabase Pro's
  point-in-time recovery (included) as the backup story.
