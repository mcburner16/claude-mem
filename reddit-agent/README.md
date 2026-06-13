# Reddit Organic Growth Agent

Monitors relevant subreddits every 2 hours, finds threads where someone is asking for freelance tools or resources, and posts a genuinely helpful reply that naturally mentions DigitalDrop Co at the end.

## Safety limits (built-in)

| Limit | Value |
|---|---|
| Max comments per day | 5 |
| Min time between comments | 10 min |
| Downvote pause threshold | score < -2 → 24 h pause |
| Posts scanned per subreddit | 25 newest |

---

## ⭐ Recommended: run 24/7 in the cloud + control from your iPhone (GitHub Actions)

This is the easiest way to run the agent **without keeping any computer awake**. GitHub runs it for free every 2 hours, and you control the whole thing from the **GitHub mobile app** on iOS — start it, pause it, and read its logs from your phone.

### 1 — Add your credentials as GitHub Secrets

On the GitHub website (or mobile browser), open this repo and go to:

**Settings → Secrets and variables → Actions → New repository secret**

Add each of these (name on the left, your value on the right):

| Secret name | Value |
|---|---|
| `REDDIT_CLIENT_ID` | your Reddit app client ID |
| `REDDIT_CLIENT_SECRET` | your Reddit app client secret |
| `REDDIT_USERNAME` | your Reddit username |
| `REDDIT_PASSWORD` | your Reddit password |
| `REDDIT_USER_AGENT` | `FreelancePromoBot/1.0 by u/yourusername` |
| `OPENAI_API_KEY` | your OpenAI key (`sk-...`) |
| `STORE_URL` | `https://digitaldrop-co.madethis.app` |

Secrets are encrypted — they're never visible in logs or to anyone browsing the repo.

### 2 — Merge this branch into `main`

GitHub only runs **scheduled** workflows from the default branch. Once the pull request is merged to `main`, the agent automatically starts running every 2 hours. (The manual "Run now" button works even before merging.)

### 3 — Control it from your iPhone

Install the **GitHub** app from the App Store and open this repo → **Actions** tab → **Reddit Growth Agent**:

- ▶️ **Run workflow** — trigger a scan right now
- ⏸️ **Disable workflow** (⋯ menu) — pause the agent entirely; **Enable** to resume
- 📜 **Tap any run** — see the full log of what it scanned and posted
- 📎 Each run also saves an `agent-log` artifact you can download

That's your full control panel — no terminal, no laptop, all from your phone.

### How it behaves on Actions

- Runs once every 2 hours and exits (set via `RUN_ONCE`/`--once` mode)
- Posts **at most one comment per run** — the 2-hour cadence spaces comments naturally, well above the 10-minute minimum
- Remembers which posts it already replied to and the daily count between runs (state is cached)
- All safety limits (5/day cap, downvote pause) still apply

---

## Running on iOS (iSH)

> The GitHub Actions method above is recommended — it doesn't require keeping any device awake. Use iSH only if you specifically want the agent running on the phone itself.

**iSH** is a free App Store app that runs Alpine Linux on your iPhone/iPad. It's the most compatible environment for Python agents on iOS.

### 1 — Install iSH

Download **iSH Shell** from the App Store (free).

### 2 — Install Python and pip inside iSH

```sh
apk update
apk add python3 py3-pip git
```

### 3 — Get the agent

```sh
# Clone just the reddit-agent folder (sparse checkout)
git clone --no-checkout https://github.com/mcburner16/claude-mem.git
cd claude-mem
git sparse-checkout init --cone
git sparse-checkout set reddit-agent
git checkout claude/ios-support-nrajjf
cd reddit-agent
```

Or simply copy the three files (`agent.py`, `requirements.txt`, `.env.example`) into iSH using the Files app and iSH's `/root` folder.

### 4 — Install dependencies

```sh
pip install -r requirements.txt
```

> If pip is slow on iSH, add `--no-cache-dir` to speed it up.

### 5 — Configure credentials

```sh
cp .env.example .env
vi .env   # or: cat > .env (paste, then Ctrl-D)
```

Fill in all five Reddit fields plus your OpenAI key. See "Getting credentials" below.

### 6 — Run

```sh
python3 agent.py
```

Keep iSH open (or use the iSH background-execution toggle in Settings). The agent will scan immediately, then every 2 hours. Logs are written to `~/.reddit-agent/agent.log`.

### Keep it running overnight

iSH supports background execution: go to **iSH → Settings → Allow iSH to Run in Background** (toggle on). The app stays alive even when you lock your screen.

---

## Running on macOS / Linux / Windows (WSL)

```sh
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# fill in .env
python3 agent.py
```

---

## Getting Reddit API credentials

1. Log in to Reddit and go to <https://www.reddit.com/prefs/apps>
2. Click **"create another app…"** at the bottom
3. Name: anything (e.g. `FreelancePromoBot`)
4. Type: **script**
5. Redirect URI: `http://localhost:8080`
6. Copy the **client ID** (shown under the app name) and the **client secret**

---

## Subreddits monitored

`r/forhire`, `r/freelance`, `r/Entrepreneur`, `r/digitalnomad`, `r/sidehustle`, `r/freelancewriting`, `r/copywriting`

Edit the `SUBREDDITS` list in `agent.py` to add or remove.

## Trigger keywords

Post title/body must contain one of these AND a help signal ("need", "recommend", "looking for", etc.):

`proposal template`, `client contract`, `invoice`, `rate calculator`, `onboarding`, `cold email`, `portfolio`, `freelance tools`, `freelance resources`

Edit `TRIGGER_KEYWORDS` and `HELP_SIGNALS` in `agent.py` to customise.

---

## Logs and data

| Path | Contents |
|---|---|
| `~/.reddit-agent/agent.log` | Full activity log |
| `~/.reddit-agent/agent.db` | SQLite — commented posts, state |

To view recent activity:

```sh
tail -f ~/.reddit-agent/agent.log
```

To check how many comments were made today:

```sh
python3 -c "import sqlite3; c=sqlite3.connect('$HOME/.reddit-agent/agent.db'); print(c.execute(\"SELECT COUNT(*) FROM comments WHERE created_at >= date('now')\").fetchone()[0], 'comments today')"
```
