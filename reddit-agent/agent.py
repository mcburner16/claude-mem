#!/usr/bin/env python3
"""
Reddit Organic Growth Agent — DigitalDrop Co
Scans relevant subreddits every 2 hours, finds threads where someone is asking
for freelance tools/resources, and posts a genuinely helpful reply that
naturally mentions the store at the end.
"""

import os
import sys
import time
import sqlite3
import logging
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
import praw
from openai import OpenAI
import schedule

load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────

LOG_DIR = Path.home() / ".reddit-agent"
LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_DIR / "agent.log"),
    ],
)
log = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────

REDDIT_CLIENT_ID     = os.getenv("REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
REDDIT_USERNAME      = os.getenv("REDDIT_USERNAME")
REDDIT_PASSWORD      = os.getenv("REDDIT_PASSWORD")
REDDIT_USER_AGENT    = os.getenv(
    "REDDIT_USER_AGENT",
    f"FreelancePromoBot/1.0 by u/{os.getenv('REDDIT_USERNAME', 'yourusername')}",
)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
STORE_URL      = os.getenv("STORE_URL", "https://digitaldrop-co.madethis.app")

STORE_NAME     = "DigitalDrop Co"
STORE_PRODUCTS = (
    "freelance proposal templates, contracts, invoices, cold email kits, "
    "rate calculators, portfolio templates, onboarding kits — "
    "all instant download, $9–$49"
)

SUBREDDITS = [
    "forhire",
    "freelance",
    "Entrepreneur",
    "digitalnomad",
    "sidehustle",
    "freelancewriting",
    "copywriting",
]

TRIGGER_KEYWORDS = [
    "proposal template",
    "client contract",
    "invoice",
    "rate calculator",
    "onboarding",
    "cold email",
    "portfolio",
    "freelance tools",
    "freelance resources",
]

HELP_SIGNALS = [
    "help", "where", "looking for", "need", "suggest", "recommend",
    "any", "best", "what", "how", "resource", "tool", "template",
]

NO_PROMO_FLAIRS = {"no self-promotion", "no promo", "no promotion"}

MAX_COMMENTS_PER_DAY     = 5
MIN_MINUTES_BTW_COMMENTS = 10
POSTS_PER_SCAN           = 25
DOWNVOTE_PAUSE_THRESHOLD = -2
DOWNVOTE_PAUSE_HOURS     = 24

DB_PATH = LOG_DIR / "agent.db"

# ── Database ──────────────────────────────────────────────────────────────────

def init_db() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            post_id    TEXT PRIMARY KEY,
            subreddit  TEXT,
            comment_id TEXT,
            text       TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS state (
            key   TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    con.commit()
    return con


def already_commented(con: sqlite3.Connection, post_id: str) -> bool:
    return con.execute(
        "SELECT 1 FROM comments WHERE post_id = ?", (post_id,)
    ).fetchone() is not None


def log_comment(con: sqlite3.Connection, post_id: str, subreddit: str,
                comment_id: str, text: str) -> None:
    con.execute(
        "INSERT OR REPLACE INTO comments (post_id, subreddit, comment_id, text) "
        "VALUES (?, ?, ?, ?)",
        (post_id, subreddit, comment_id, text),
    )
    con.commit()


def comments_today(con: sqlite3.Connection) -> int:
    row = con.execute(
        "SELECT COUNT(*) FROM comments WHERE created_at >= date('now')"
    ).fetchone()
    return row[0] if row else 0


def get_state(con: sqlite3.Connection, key: str, default=None):
    row = con.execute("SELECT value FROM state WHERE key = ?", (key,)).fetchone()
    return row[0] if row else default


def set_state(con: sqlite3.Connection, key: str, value: str) -> None:
    con.execute(
        "INSERT OR REPLACE INTO state (key, value) VALUES (?, ?)", (key, value)
    )
    con.commit()

# ── Scoring ───────────────────────────────────────────────────────────────────

def score_post(post) -> int:
    """Return relevance score >0 if worth replying to, else 0."""
    text = f"{post.title} {post.selftext}".lower()
    matched = sum(1 for kw in TRIGGER_KEYWORDS if kw in text)
    if matched == 0:
        return 0
    if not any(sig in text for sig in HELP_SIGNALS):
        return 0
    return matched

# ── Reply generation ──────────────────────────────────────────────────────────

def generate_reply(client: OpenAI, title: str, body: str) -> str | None:
    system = f"""You are a helpful freelancer replying in a Reddit thread.
You want to genuinely help and naturally mention {STORE_NAME} ({STORE_URL})
which sells: {STORE_PRODUCTS}.

Rules (non-negotiable):
- Directly answer the question or add genuine value in 2–3 sentences
- Mention the store ONCE at the very end — one natural line, one link
- Sound human and peer-to-peer, NOT like an ad
- Do NOT start with "I"
- Stay under 120 words total
"""
    prompt = f"Title: {title}\n\nBody: {body[:600]}"
    try:
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            max_tokens=200,
            temperature=0.7,
        )
        return resp.choices[0].message.content.strip()
    except Exception as exc:
        log.error("OpenAI error: %s", exc)
        return None

# ── Safety helpers ────────────────────────────────────────────────────────────

def is_paused(con: sqlite3.Connection) -> bool:
    paused_until = get_state(con, "paused_until")
    if paused_until and datetime.fromisoformat(paused_until) > datetime.now():
        log.info("Agent paused until %s (downvote protection).", paused_until)
        return True
    return False


def check_downvotes(reddit, con: sqlite3.Connection) -> None:
    rows = con.execute(
        "SELECT comment_id FROM comments ORDER BY created_at DESC LIMIT 20"
    ).fetchall()
    for (comment_id,) in rows:
        try:
            comment = reddit.comment(comment_id)
            if comment.score < DOWNVOTE_PAUSE_THRESHOLD:
                until = (datetime.now() + timedelta(hours=DOWNVOTE_PAUSE_HOURS)).isoformat()
                set_state(con, "paused_until", until)
                log.warning(
                    "Comment %s has score %d — pausing for %dh.",
                    comment_id, comment.score, DOWNVOTE_PAUSE_HOURS,
                )
                return
        except Exception:
            pass


def minutes_since_last_comment(con: sqlite3.Connection) -> float:
    row = con.execute(
        "SELECT created_at FROM comments ORDER BY created_at DESC LIMIT 1"
    ).fetchone()
    if not row:
        return float("inf")
    return (datetime.now() - datetime.fromisoformat(row[0])).total_seconds() / 60

# ── Main scan ─────────────────────────────────────────────────────────────────

def run_scan(reddit, openai_client: OpenAI, con: sqlite3.Connection,
             once: bool = False) -> None:
    """Run one scan. When once=True (e.g. GitHub Actions / cron), post at most
    one comment and return immediately — no in-run sleeping. The 2-hour cron
    cadence naturally spaces comments well above the 10-minute minimum."""
    log.info("=== Scan started%s ===", " (once)" if once else "")
    check_downvotes(reddit, con)

    if is_paused(con):
        return

    today = comments_today(con)
    if today >= MAX_COMMENTS_PER_DAY:
        log.info("Daily limit reached (%d/%d). Skipping.", today, MAX_COMMENTS_PER_DAY)
        return

    if minutes_since_last_comment(con) < MIN_MINUTES_BTW_COMMENTS:
        log.info("Last comment was < %d min ago. Skipping.", MIN_MINUTES_BTW_COMMENTS)
        return

    for sub_name in SUBREDDITS:
        today = comments_today(con)
        if today >= MAX_COMMENTS_PER_DAY:
            break

        try:
            sub = reddit.subreddit(sub_name)

            # Skip subreddits with strict no-promo rules
            try:
                rules_text = " ".join(r.short_name.lower() for r in sub.rules)
                if any(f in rules_text for f in NO_PROMO_FLAIRS):
                    log.info("r/%s has no-promo rules — skipping.", sub_name)
                    continue
            except Exception:
                pass

            for post in sub.new(limit=POSTS_PER_SCAN):
                if already_commented(con, post.id):
                    continue

                # Skip posts with no-promo flair
                flair = (post.link_flair_text or "").lower()
                if any(f in flair for f in NO_PROMO_FLAIRS):
                    continue

                # Don't comment on our own posts
                if post.author and post.author.name == REDDIT_USERNAME:
                    continue

                score = score_post(post)
                if score == 0:
                    continue

                log.info(
                    "Match [score=%d] r/%s: %s", score, sub_name, post.title[:80]
                )

                reply_text = generate_reply(openai_client, post.title, post.selftext)
                if not reply_text:
                    continue

                try:
                    comment = post.reply(reply_text)
                    log_comment(con, post.id, sub_name, comment.id, reply_text)
                    today += 1
                    log.info("Replied → comment %s (today: %d/%d)", comment.id, today, MAX_COMMENTS_PER_DAY)

                    if today >= MAX_COMMENTS_PER_DAY:
                        log.info("Daily limit hit. Done.")
                        return

                    # In once-mode (cron/Actions) post a single comment per run;
                    # the schedule itself provides the spacing between comments.
                    if once:
                        log.info("Once-mode: posted one comment. Done.")
                        return

                    # Respect the minimum gap before the next comment
                    time.sleep(MIN_MINUTES_BTW_COMMENTS * 60)

                except praw.exceptions.APIException as exc:
                    log.warning("Reddit API error on post %s: %s", post.id, exc)
                    time.sleep(60)

        except Exception as exc:
            log.error("Error scanning r/%s: %s", sub_name, exc)

    log.info("=== Scan complete. Comments today: %d/%d ===", comments_today(con), MAX_COMMENTS_PER_DAY)

# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    required = ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET",
                "REDDIT_USERNAME", "REDDIT_PASSWORD", "OPENAI_API_KEY"]
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        sys.exit(f"Missing env vars: {', '.join(missing)}\nCopy .env.example → .env and fill in your credentials.")

    reddit = praw.Reddit(
        client_id=REDDIT_CLIENT_ID,
        client_secret=REDDIT_CLIENT_SECRET,
        username=REDDIT_USERNAME,
        password=REDDIT_PASSWORD,
        user_agent=REDDIT_USER_AGENT,
    )
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
    con = init_db()

    # RUN_ONCE (or --once): do a single scan and exit. Used by GitHub Actions /
    # cron, where an external scheduler invokes us every 2 hours.
    run_once = (
        os.getenv("RUN_ONCE", "").lower() in ("1", "true", "yes")
        or "--once" in sys.argv
    )

    if run_once:
        log.info("Agent started in once-mode. Single scan, then exit.")
        run_scan(reddit, openai_client, con, once=True)
        return

    log.info("Agent started. Scanning now, then every 2 hours.")
    run_scan(reddit, openai_client, con)

    schedule.every(2).hours.do(run_scan, reddit=reddit, openai_client=openai_client, con=con)

    while True:
        schedule.run_pending()
        time.sleep(30)


if __name__ == "__main__":
    main()
