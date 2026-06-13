#!/usr/bin/env python3
"""
Reddit Organic Growth Agent — DigitalDrop Co (Playwright/browser edition)
Logs into Reddit like a human using browser automation.
No Reddit API credentials needed — just username and password.
"""

from __future__ import annotations

import os
import sys
import json
import asyncio
import sqlite3
import logging
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from playwright.async_api import async_playwright

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

REDDIT_USERNAME = os.getenv("REDDIT_USERNAME")
REDDIT_PASSWORD = os.getenv("REDDIT_PASSWORD")
OPENAI_API_KEY  = os.getenv("OPENAI_API_KEY")
STORE_URL       = os.getenv("STORE_URL", "https://digitaldrop-co.madethis.app")

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
POSTS_PER_SUB            = 25

DB_PATH = LOG_DIR / "agent.db"

# ── Database ──────────────────────────────────────────────────────────────────

def init_db() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            post_id    TEXT PRIMARY KEY,
            subreddit  TEXT,
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


def log_comment(con: sqlite3.Connection, post_id: str, subreddit: str, text: str) -> None:
    con.execute(
        "INSERT OR REPLACE INTO comments (post_id, subreddit, text) VALUES (?, ?, ?)",
        (post_id, subreddit, text),
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
    con.execute("INSERT OR REPLACE INTO state (key, value) VALUES (?, ?)", (key, value))
    con.commit()

# ── Scoring ───────────────────────────────────────────────────────────────────

def score_post(title: str, body: str) -> int:
    text = f"{title} {body}".lower()
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
    try:
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"Title: {title}\n\nBody: {body[:600]}"},
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
        log.info("Agent paused until %s.", paused_until)
        return True
    return False


def minutes_since_last_comment(con: sqlite3.Connection) -> float:
    row = con.execute(
        "SELECT created_at FROM comments ORDER BY created_at DESC LIMIT 1"
    ).fetchone()
    if not row:
        return float("inf")
    return (datetime.now() - datetime.fromisoformat(row[0])).total_seconds() / 60

# ── Browser helpers ───────────────────────────────────────────────────────────

async def login_reddit(page) -> None:
    log.info("Logging in to Reddit...")
    await page.goto("https://www.reddit.com/login/", wait_until="domcontentloaded")
    await page.wait_for_timeout(3000)

    await page.wait_for_selector("input[name='username']", timeout=15000)
    await page.fill("input[name='username']", REDDIT_USERNAME)
    await page.wait_for_timeout(500)
    await page.fill("input[name='password']", REDDIT_PASSWORD)
    await page.wait_for_timeout(500)
    await page.keyboard.press("Enter")

    # Wait for redirect away from login — up to 15 seconds
    for _ in range(15):
        await page.wait_for_timeout(1000)
        if "/login" not in page.url:
            break

    # Verify by checking for user session via API
    try:
        me = await page.evaluate("""
            async () => {
                const r = await fetch('https://www.reddit.com/api/me.json');
                const d = await r.json();
                return d.data && d.data.name ? d.data.name : null;
            }
        """)
        if not me:
            raise RuntimeError("Not logged in")
        log.info("Logged in as %s.", me)
    except Exception:
        raise RuntimeError(
            "Reddit login failed — check REDDIT_USERNAME and REDDIT_PASSWORD in .env"
        )


async def get_posts_from_sub(page, sub_name: str) -> list[tuple[str, str, str, str]]:
    """Return list of (post_id, title, body, url) using the Reddit JSON API."""
    await page.goto(
        f"https://www.reddit.com/r/{sub_name}/new.json?limit={POSTS_PER_SUB}",
        wait_until="domcontentloaded",
    )
    await page.wait_for_timeout(1500)

    try:
        raw = await page.inner_text("pre")
        data = json.loads(raw)
    except Exception as exc:
        log.error("Failed to parse JSON for r/%s: %s", sub_name, exc)
        return []

    posts = []
    for child in data.get("data", {}).get("children", []):
        p = child.get("data", {})
        post_id = p.get("name", "")
        title   = p.get("title", "")
        body    = p.get("selftext", "")
        author  = p.get("author", "")
        flair   = (p.get("link_flair_text") or "").lower()
        url     = f"https://www.reddit.com{p.get('permalink', '')}"

        if not post_id or not title:
            continue
        if author == REDDIT_USERNAME:
            continue
        if any(f in flair for f in NO_PROMO_FLAIRS):
            continue

        posts.append((post_id, title, body, url))

    return posts


async def post_comment(page, post_id: str, text: str) -> None:
    """Post via Reddit's web API using the browser session — no UI scraping."""
    result = await page.evaluate("""
        async ([thing_id, comment_text]) => {
            const meResp = await fetch('https://www.reddit.com/api/me.json');
            const meData = await meResp.json();
            const modhash = meData.data.modhash;

            const resp = await fetch('https://www.reddit.com/api/comment', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: new URLSearchParams({
                    api_type: 'json',
                    text: comment_text,
                    thing_id: thing_id,
                    uh: modhash
                }).toString()
            });
            const data = await resp.json();
            return JSON.stringify(data);
        }
    """, [post_id, text])

    data = json.loads(result)
    errors = data.get("json", {}).get("errors", [])
    if errors:
        raise RuntimeError(f"Reddit API errors: {errors}")

# ── Main scan ─────────────────────────────────────────────────────────────────

async def run_scan(openai_client: OpenAI, con: sqlite3.Connection,
                   once: bool = False) -> None:
    log.info("=== Scan started%s ===", " (once)" if once else "")

    if is_paused(con):
        return

    today = comments_today(con)
    if today >= MAX_COMMENTS_PER_DAY:
        log.info("Daily limit reached (%d/%d). Skipping.", today, MAX_COMMENTS_PER_DAY)
        return

    if minutes_since_last_comment(con) < MIN_MINUTES_BTW_COMMENTS:
        log.info("Last comment < %d min ago. Skipping.", MIN_MINUTES_BTW_COMMENTS)
        return

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        )
        page = await ctx.new_page()

        try:
            await login_reddit(page)

            for sub_name in SUBREDDITS:
                today = comments_today(con)
                if today >= MAX_COMMENTS_PER_DAY:
                    break

                try:
                    posts = await get_posts_from_sub(page, sub_name)
                    log.info("r/%s: %d posts to check.", sub_name, len(posts))

                    for post_id, title, body, url in posts:
                        if already_commented(con, post_id):
                            continue

                        score = score_post(title, body)

                        if score == 0:
                            continue

                        log.info("Match [score=%d] r/%s: %s", score, sub_name, title[:80])

                        reply_text = generate_reply(openai_client, title, body)
                        if not reply_text:
                            continue

                        try:
                            await post_comment(page, post_id, reply_text)
                            log_comment(con, post_id, sub_name, reply_text)
                            today += 1
                            log.info("Commented. Today: %d/%d", today, MAX_COMMENTS_PER_DAY)

                            if today >= MAX_COMMENTS_PER_DAY:
                                log.info("Daily limit hit. Done.")
                                return

                            if once:
                                log.info("Once-mode: done.")
                                return

                            await asyncio.sleep(MIN_MINUTES_BTW_COMMENTS * 60)

                        except Exception as exc:
                            log.warning("Failed to comment on %s: %s", post_id, exc)
                            await asyncio.sleep(30)

                except Exception as exc:
                    log.error("Error scanning r/%s: %s", sub_name, exc)

        finally:
            await browser.close()

    log.info("=== Scan complete. Comments today: %d/%d ===",
             comments_today(con), MAX_COMMENTS_PER_DAY)

# ── Entry point ───────────────────────────────────────────────────────────────

async def main_async() -> None:
    missing = [k for k in ["REDDIT_USERNAME", "REDDIT_PASSWORD", "OPENAI_API_KEY"]
               if not os.getenv(k)]
    if missing:
        sys.exit(f"Missing env vars: {', '.join(missing)}\nCopy .env.example → .env and fill in.")

    openai_client = OpenAI(api_key=OPENAI_API_KEY)
    con = init_db()

    run_once = (
        os.getenv("RUN_ONCE", "").lower() in ("1", "true", "yes")
        or "--once" in sys.argv
    )

    if run_once:
        log.info("Once-mode: single scan then exit.")
        await run_scan(openai_client, con, once=True)
        return

    log.info("Agent started. Scanning now, then every 2 hours.")
    while True:
        await run_scan(openai_client, con)
        log.info("Next scan in 2 hours.")
        await asyncio.sleep(2 * 60 * 60)


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
