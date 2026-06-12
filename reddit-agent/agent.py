#!/usr/bin/env python3
"""
Reddit Organic Growth Agent — DigitalDrop Co (Playwright/browser edition)
Logs into Reddit like a human using browser automation.
No Reddit API credentials needed — just username and password.
"""

from __future__ import annotations

import os
import sys
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
    await page.goto("https://www.reddit.com/login/", wait_until="networkidle")
    await page.wait_for_timeout(2000)

    await page.wait_for_selector("input[name='username']", timeout=15000)
    await page.fill("input[name='username']", REDDIT_USERNAME)
    await page.fill("input[name='password']", REDDIT_PASSWORD)
    await page.click("button[type='submit']")
    await page.wait_for_timeout(5000)

    if "/login" in page.url:
        raise RuntimeError(
            "Reddit login failed — check REDDIT_USERNAME and REDDIT_PASSWORD in .env"
        )
    log.info("Logged in as %s.", REDDIT_USERNAME)


async def get_posts_from_sub(page, sub_name: str) -> list[tuple[str, str, str]]:
    """Return list of (post_id, title, comments_url) from subreddit's /new feed."""
    await page.goto(
        f"https://old.reddit.com/r/{sub_name}/new/", wait_until="domcontentloaded"
    )
    await page.wait_for_timeout(2000)

    posts = []
    for thing in await page.query_selector_all(".thing.link"):
        try:
            post_id  = await thing.get_attribute("data-fullname") or ""
            author   = await thing.get_attribute("data-author") or ""
            title_el = await thing.query_selector("a.title")
            title    = await title_el.inner_text() if title_el else ""
            url_el   = await thing.query_selector("a.comments")
            url      = await url_el.get_attribute("href") if url_el else None
            flair_el = await thing.query_selector(".flair")
            flair    = (await flair_el.inner_text() if flair_el else "").lower()

            if not post_id or not title or not url:
                continue
            if author == REDDIT_USERNAME:
                continue
            if any(f in flair for f in NO_PROMO_FLAIRS):
                continue

            posts.append((post_id, title, url))
        except Exception:
            pass

    return posts[:POSTS_PER_SUB]


async def get_post_body(page, url: str) -> str:
    try:
        await page.goto(url, wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        el = await page.query_selector(".expando .md")
        return await el.inner_text() if el else ""
    except Exception:
        return ""


async def post_comment(page, url: str, text: str) -> None:
    await page.goto(url, wait_until="domcontentloaded")
    await page.wait_for_timeout(2000)

    textarea = await page.query_selector("#commentarea .usertext-edit textarea")
    if not textarea:
        raise RuntimeError("Comment textarea not found")

    await textarea.click()
    await textarea.fill(text)
    await page.wait_for_timeout(500)

    save_btn = await page.query_selector("#commentarea .usertext-edit .save")
    if not save_btn:
        raise RuntimeError("Save button not found")

    await save_btn.click()
    await page.wait_for_timeout(3000)

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

                    for post_id, title, url in posts:
                        if already_commented(con, post_id):
                            continue

                        body  = await get_post_body(page, url)
                        score = score_post(title, body)

                        if score == 0:
                            continue

                        log.info("Match [score=%d] r/%s: %s", score, sub_name, title[:80])

                        reply_text = generate_reply(openai_client, title, body)
                        if not reply_text:
                            continue

                        try:
                            await post_comment(page, url, reply_text)
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
