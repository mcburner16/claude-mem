#!/usr/bin/env python3
"""Reddit survey scraper — uses Reddit's public JSON feed, no API keys required."""

import argparse
import json
import logging
import os
import random
import re
import signal
import sys
import time
import urllib.robotparser
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests
import yaml
from colorama import Fore, Style, init as colorama_init

# ── init ──────────────────────────────────────────────────────────────────────
colorama_init(autoreset=True)

logging.basicConfig(
    filename="survey_scraper.log",
    level=logging.ERROR,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

CACHE_FILE = Path("seen_posts.json")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
]

# ── config ────────────────────────────────────────────────────────────────────

def load_config(path: str = "config.yaml") -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


# ── cache ─────────────────────────────────────────────────────────────────────

def load_cache() -> set:
    if CACHE_FILE.exists():
        try:
            data = json.loads(CACHE_FILE.read_text())
            return set(data.get("seen", []))
        except Exception:
            pass
    return set()


def save_cache(seen: set) -> None:
    CACHE_FILE.write_text(json.dumps({"seen": list(seen)}, indent=2))


# ── payout estimation ─────────────────────────────────────────────────────────

_DOLLAR_RE = re.compile(r"\$\s*(\d+(?:\.\d+)?)")
_USD_RE = re.compile(r"(\d+(?:\.\d+)?)\s*USD", re.IGNORECASE)
_HIGH_PHRASES = re.compile(r"high\s+paying|well\s+paid|\$10\+", re.IGNORECASE)


def estimate_payout(title: str) -> Optional[float]:
    for pattern in (_DOLLAR_RE, _USD_RE):
        m = pattern.search(title)
        if m:
            return float(m.group(1))
    if _HIGH_PHRASES.search(title):
        return 10.0
    return None


# ── scoring ───────────────────────────────────────────────────────────────────

def score_post(upvotes: int, payout: Optional[float]) -> float:
    return upvotes * 0.4 + (payout * 10 if payout is not None else 0)


# ── keyword filtering ─────────────────────────────────────────────────────────

def matches_keywords(title: str, cfg: dict) -> bool:
    text = title.lower()
    required = cfg.get("required_keywords", ["survey", "study", "paid"])
    blocked = cfg.get("blocked_keywords", ["scam", "expired"])
    return any(kw in text for kw in required) and not any(kw in text for kw in blocked)


# ── robots.txt ────────────────────────────────────────────────────────────────

_robots_cache: dict[str, urllib.robotparser.RobotFileParser] = {}


def can_fetch(url: str, ua: str) -> bool:
    from urllib.parse import urlparse
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    if base not in _robots_cache:
        rp = urllib.robotparser.RobotFileParser()
        rp.set_url(f"{base}/robots.txt")
        try:
            rp.read()
        except Exception:
            return True
        _robots_cache[base] = rp
    return _robots_cache[base].can_fetch(ua, url)


# ── reddit scraping (public JSON, no API key) ─────────────────────────────────

def fetch_reddit_posts(cfg: dict, seen: set) -> list[dict]:
    results = []
    lookback_minutes = cfg.get("lookback_minutes", 15)
    cutoff = time.time() - lookback_minutes * 60
    limit = cfg.get("reddit_post_limit", 50)
    ua = random.choice(USER_AGENTS)

    for sub_name in cfg.get("subreddits", []):
        url = f"https://www.reddit.com/r/{sub_name}/new.json?limit={limit}"
        try:
            time.sleep(random.uniform(1, 3))
            resp = requests.get(url, headers={"User-Agent": ua}, timeout=15)
            resp.raise_for_status()
            posts = resp.json()["data"]["children"]
        except Exception as exc:
            logging.error("Reddit JSON fetch error for r/%s: %s", sub_name, exc)
            continue

        for item in posts:
            post = item["data"]
            if post["created_utc"] < cutoff:
                continue
            if post["id"] in seen:
                continue
            if not matches_keywords(post["title"], cfg):
                continue

            payout = estimate_payout(post["title"])
            s = score_post(post["score"], payout)
            results.append({
                "id": post["id"],
                "source": f"r/{sub_name}",
                "title": post["title"],
                "url": post.get("url", ""),
                "permalink": f"https://reddit.com{post['permalink']}",
                "upvotes": post["score"],
                "comments": post["num_comments"],
                "payout": payout,
                "score": s,
            })
            seen.add(post["id"])

    return results


# ── optional website scraping ─────────────────────────────────────────────────

def fetch_website_posts(cfg: dict, seen: set) -> list[dict]:
    results = []
    sites = cfg.get("websites", [])
    if not sites:
        return results

    ua = random.choice(USER_AGENTS)
    for site in sites:
        url = site.get("url")
        if not url:
            continue
        if not can_fetch(url, ua):
            print(f"  {Fore.YELLOW}robots.txt disallows {url}, skipping.")
            continue

        time.sleep(random.uniform(1, 4))
        try:
            resp = requests.get(url, headers={"User-Agent": ua}, timeout=15)
            resp.raise_for_status()
        except Exception as exc:
            logging.error("HTTP fetch error for %s: %s", url, exc)
            continue

        from html.parser import HTMLParser

        class LinkExtractor(HTMLParser):
            def __init__(self):
                super().__init__()
                self.links = []
                self._cur_href = None
                self._cur_text = []

            def handle_starttag(self, tag, attrs):
                if tag == "a":
                    self._cur_href = dict(attrs).get("href", "")
                    self._cur_text = []

            def handle_data(self, data):
                if self._cur_href is not None:
                    self._cur_text.append(data)

            def handle_endtag(self, tag):
                if tag == "a" and self._cur_href is not None:
                    text = " ".join(self._cur_text).strip()
                    if text:
                        self.links.append((self._cur_href, text))
                    self._cur_href = None
                    self._cur_text = []

        parser = LinkExtractor()
        parser.feed(resp.text)

        for href, text in parser.links:
            cache_key = f"web:{href}"
            if cache_key in seen:
                continue
            if not matches_keywords(text, cfg):
                continue

            payout = estimate_payout(text)
            s = score_post(0, payout)
            results.append({
                "id": cache_key,
                "source": site.get("name", url),
                "title": text,
                "url": href if href.startswith("http") else url,
                "permalink": href if href.startswith("http") else url,
                "upvotes": 0,
                "comments": 0,
                "payout": payout,
                "score": s,
            })
            seen.add(cache_key)

    return results


# ── output & notifications ────────────────────────────────────────────────────

def print_post(post: dict, threshold: float) -> None:
    color = Fore.GREEN if post["score"] >= threshold else Fore.YELLOW
    label = "HIGH VALUE" if post["score"] >= threshold else "MEDIUM"
    payout_str = f"${post['payout']:.2f}" if post["payout"] is not None else "unknown"
    print(
        f"{color}[{label}] {post['title']}\n"
        f"  Source : {post['source']}\n"
        f"  Link   : {post['permalink']}\n"
        f"  Payout : {payout_str}  |  Upvotes: {post['upvotes']}  |  Score: {post['score']:.1f}\n"
        f"{Style.RESET_ALL}"
    )


def send_discord(post: dict, webhook_url: str) -> None:
    payout_str = f"${post['payout']:.2f}" if post["payout"] is not None else "unknown"
    payload = {
        "username": "Survey Scraper",
        "embeds": [
            {
                "title": post["title"],
                "url": post["permalink"],
                "color": 0x00FF00,
                "fields": [
                    {"name": "Source", "value": post["source"], "inline": True},
                    {"name": "Estimated Payout", "value": payout_str, "inline": True},
                    {"name": "Upvotes", "value": str(post["upvotes"]), "inline": True},
                    {"name": "Score", "value": f"{post['score']:.1f}", "inline": True},
                ],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ],
    }
    try:
        resp = requests.post(webhook_url, json=payload, timeout=10)
        resp.raise_for_status()
    except Exception as exc:
        logging.error("Discord webhook error: %s", exc)


def send_desktop_notification(post: dict) -> None:
    payout_str = f"${post['payout']:.2f}" if post["payout"] is not None else "unknown"
    message = f"{post['source']} — Payout: {payout_str}\n{post['permalink']}"
    try:
        from plyer import notification  # type: ignore
        notification.notify(title=f"Survey: {post['title'][:60]}", message=message, timeout=10)
        return
    except Exception:
        pass
    if sys.platform.startswith("linux"):
        try:
            import subprocess
            subprocess.run(["notify-send", f"Survey: {post['title'][:60]}", message], check=False)
        except Exception:
            pass


# ── main ──────────────────────────────────────────────────────────────────────

def run_once(cfg: dict, seen: set, discord_url: Optional[str]) -> None:
    threshold = cfg.get("score_threshold", 20)
    desktop_notify = cfg.get("desktop_notifications", False)

    posts = fetch_reddit_posts(cfg, seen)
    posts += fetch_website_posts(cfg, seen)

    if not posts:
        print(f"{Fore.CYAN}[{datetime.now().strftime('%H:%M:%S')}] No new matching posts found.")
        return

    posts.sort(key=lambda p: p["score"], reverse=True)
    for post in posts:
        print_post(post, threshold)
        if post["score"] >= threshold:
            if discord_url:
                send_discord(post, discord_url)
            if desktop_notify:
                send_desktop_notification(post)

    save_cache(seen)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="Run one cycle and exit (for CI/cron)")
    args = parser.parse_args()

    cfg = load_config()
    seen = load_cache()
    discord_url = os.environ.get("DISCORD_WEBHOOK_URL")
    interval = cfg.get("poll_interval_seconds", 300)

    if args.once:
        run_once(cfg, seen, discord_url)
        return

    print(f"{Fore.CYAN}Survey scraper started. Poll interval: {interval}s. Press Ctrl+C to stop.\n")

    def handle_sigint(_sig, _frame):
        print(f"\n{Fore.CYAN}Shutting down gracefully.")
        save_cache(seen)
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_sigint)

    while True:
        try:
            run_once(cfg, seen, discord_url)
        except Exception as exc:
            logging.error("Unexpected error in run_once: %s", exc)
            print(f"{Fore.RED}Error (logged): {exc}")
        time.sleep(interval)


if __name__ == "__main__":
    main()
