# Autonomous Business Agent

Use this skill when the user asks about business status, pipeline, prospects, deals, outreach, revenue, or wants to interact with the autonomous business.

## What This Is

An autonomous B2B outreach business running on claude-mem infrastructure. The agent:
1. Researched the market and chose a niche on first run
2. Finds B2B prospects via Apollo.io daily
3. Creates personalized cold email drafts in Gmail (human sends them — the 5%)
4. Detects replies and creates deals automatically
5. Generates and delivers the service product when payment is confirmed

## Checking Business Status

```bash
curl -s http://localhost:37777/api/business/pipeline | jq .
curl -s http://localhost:37777/api/business/strategy | jq .
curl -s http://localhost:37777/api/business/stats | jq .
```

## Viewing Prospects

```bash
# All prospects by stage
curl -s "http://localhost:37777/api/business/prospects?stage=found" | jq .
curl -s "http://localhost:37777/api/business/prospects?stage=contacted" | jq .
curl -s "http://localhost:37777/api/business/prospects?stage=replied" | jq .
```

## Managing Deals

```bash
# View all deals
curl -s http://localhost:37777/api/business/deals | jq .

# Mark a deal as paid (the 5% human step — do this after payment received)
curl -s -X POST http://localhost:37777/api/business/deals/DEAL_ID/paid \
  -H "Content-Type: application/json" \
  -d '{"paymentReference": "stripe_ch_xxx", "paymentMethod": "stripe"}'
```

## Triggering the Loop Manually

```bash
curl -s -X POST http://localhost:37777/api/business/loop/run | jq .
```

## Updating the Stripe Payment Link

Once you've created a Stripe payment link, update it so the agent includes it in outreach:

```bash
curl -s -X POST http://localhost:37777/api/business/strategy \
  -H "Content-Type: application/json" \
  -d '{"stripe_payment_link": "https://buy.stripe.com/YOUR_LINK"}'
```

## Changing the Strategy

To update the niche, offer, or price:

```bash
curl -s -X POST http://localhost:37777/api/business/strategy \
  -H "Content-Type: application/json" \
  -d '{
    "niche": "new niche description",
    "offer_description": "new offer",
    "price_usd": 197
  }'
```

## Re-Running Autonomous Strategy Selection

If you want the agent to reconsider its niche:

```bash
curl -s -X POST http://localhost:37777/api/business/strategy/initialize | jq .
```

## Review Outreach Drafts

After the loop runs, check Gmail Drafts (gmail.com/drafts) to review and send the personalized outreach emails. This is the main 5% human task.

## Revenue Summary

```bash
curl -s http://localhost:37777/api/business/stats | jq '{
  revenue: .total_revenue_usd,
  deals_delivered: .deals_delivered,
  prospects_found: .stages.found,
  reply_rate: .reply_rate_pct
}'
```

## Workflow Summary

When the user asks what's happening with the business, always:
1. Call `GET /api/business/pipeline` to get current stage counts
2. Call `GET /api/business/stats` to get revenue
3. Check `GET /api/business/loop/status` for last run time
4. Surface any ACTION REQUIRED items:
   - Deals awaiting payment (share payment link with prospect)
   - New email drafts in Gmail to review and send
   - Delivered orders ready (check Gmail Drafts for delivery emails)
