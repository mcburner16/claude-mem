# Reddit Survey Scraper

Monitors r/beermoney, r/surveys, r/paidstudies (and optional websites) for new paid survey opportunities. High-value posts trigger Discord and/or desktop notifications.

## Quick Start

### 1. Get Reddit API credentials

1. Go to https://www.reddit.com/prefs/apps → "create app"
2. Choose **script**, set redirect URI to `http://localhost`
3. Copy your **client ID** (under the app name) and **client secret**

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Set environment variables

```bash
export REDDIT_CLIENT_ID="your_client_id"
export REDDIT_CLIENT_SECRET="your_client_secret"
export REDDIT_USER_AGENT="survey-scraper/1.0 by u/your_reddit_username"

# Optional — enables Discord notifications
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
```

Or create a `.env` file and load it with `source .env` (or use `python-dotenv`).

### 4. Run

```bash
python scraper.py
```

Press **Ctrl+C** to stop gracefully.

---

## Configuration (`config.yaml`)

| Key | Default | Description |
|-----|---------|-------------|
| `subreddits` | `[beermoney, surveys, paidstudies]` | Subreddits to monitor |
| `lookback_minutes` | `15` | Only consider posts newer than this |
| `reddit_post_limit` | `50` | Max posts fetched per subreddit per cycle |
| `required_keywords` | `[survey, study, paid]` | Post must match at least one |
| `blocked_keywords` | `[scam, expired]` | Post is discarded if it matches any |
| `score_threshold` | `20` | Posts above this score are "high value" |
| `poll_interval_seconds` | `300` | Sleep time between cycles |
| `desktop_notifications` | `false` | Enable desktop pop-ups via `plyer` |
| `websites` | `[]` | Optional HTTP pages to scrape for survey links |

---

## Scoring Heuristic

```
score = upvotes × 0.4 + payout_estimate × 10
```

- **Payout estimate**: extracted from title patterns like `$15`, `15 USD`; defaults to `$10` if phrases like "high paying" or "$10+" are found.
- Posts with `score ≥ score_threshold` are colored **green** and trigger notifications.
- Lower-scoring (but still keyword-matching) posts are colored **yellow**.

---

## Example Console Output

```
[HIGH VALUE] Earn $25 for a 20-minute online study — Psychology Dept
  Source : r/paidstudies
  Link   : https://reddit.com/r/paidstudies/comments/abc123/...
  Payout : $25.00  |  Upvotes: 42  |  Score: 266.8

[MEDIUM] Paid survey — 5 mins, $2 gift card
  Source : r/surveys
  Link   : https://reddit.com/r/surveys/comments/xyz789/...
  Payout : $2.00  |  Upvotes: 3  |  Score: 21.2
```

## Example Discord Notification

```
Survey Scraper                                    [bot]
┌────────────────────────────────────────────────────┐
│ Earn $25 for a 20-minute online study             │
│ https://reddit.com/r/paidstudies/comments/abc123/ │
│                                                    │
│ Source          r/paidstudies                      │
│ Estimated Payout  $25.00                           │
│ Upvotes           42                               │
│ Score             266.8                            │
└────────────────────────────────────────────────────┘
```

---

## Files

| File | Purpose |
|------|---------|
| `scraper.py` | Main script |
| `config.yaml` | All configurable settings |
| `requirements.txt` | Python dependencies |
| `seen_posts.json` | Auto-generated cache of seen post IDs |
| `survey_scraper.log` | Error log (auto-generated) |

---

## Anti-Detection & Politeness

- **robots.txt** is checked before scraping any website URL
- **User-agent rotation** across five common browser UA strings
- **Random delay** of 1–4 seconds between HTTP requests
- **Seen-post cache** (`seen_posts.json`) prevents duplicate notifications across restarts

---

## Notes

- PRAW's read-only mode is used — no Reddit login required beyond the API credentials
- No browser automation; all scraping uses `requests` + a minimal HTML link extractor
- Errors are logged to `survey_scraper.log` but never crash the main loop
