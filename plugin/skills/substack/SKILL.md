# Substack Article Agent

Use this skill when the user wants to publish or draft an article on Substack, or asks about posting to their newsletter.

## What This Does

Posts or drafts articles to Substack via the worker API on localhost:37777.
Accepts content as inline markdown text or a path to a `.md` file.
After posting, returns the published URL or draft editor link.

---

## One-Time Setup

Before posting, verify credentials are configured:

```bash
curl -s http://localhost:37777/api/substack/status | jq .
```

If `configured` is `false`, the user must add two values to `~/.claude-mem/settings.json`:

| Key | Value |
|-----|-------|
| `SUBSTACK_SESSION_COOKIE` | The `substack.sid` cookie from a logged-in browser |
| `SUBSTACK_PUBLICATION_URL` | Your publication root, e.g. `https://yourname.substack.com` |

### How to get the session cookie

1. Log in at substack.com in Chrome/Firefox
2. Open DevTools → Application → Cookies → `substack.com`
3. Find `substack.sid` and copy its value

Then set it:

```bash
curl -s -X POST http://localhost:37777/api/settings \
  -H "Content-Type: application/json" \
  -d '{
    "SUBSTACK_SESSION_COOKIE": "PASTE_COOKIE_VALUE_HERE",
    "SUBSTACK_PUBLICATION_URL": "https://yourname.substack.com"
  }' | jq .
```

---

## Posting an Article (publish immediately)

### From inline markdown

```bash
curl -s -X POST http://localhost:37777/api/substack/post \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Your Article Title",
    "subtitle": "Optional tagline",
    "content": "# Introduction\n\nYour markdown content here...",
    "sendEmail": false
  }' | jq .
```

### From a markdown file

```bash
curl -s -X POST http://localhost:37777/api/substack/post \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Your Article Title",
    "content": "/path/to/article.md",
    "contentIsFile": true
  }' | jq .
```

### Response

```json
{
  "success": true,
  "draftId": 12345,
  "draftUrl": "https://yourname.substack.com/publish/post/12345",
  "published": true,
  "postUrl": "https://yourname.substack.com/p/your-article-title",
  "slug": "your-article-title"
}
```

---

## Saving as Draft (no publish)

```bash
curl -s -X POST http://localhost:37777/api/substack/draft \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Draft Title",
    "content": "Draft content in **markdown**.",
    "subtitle": "Optional subtitle"
  }' | jq .
```

Response includes `draftUrl` to open in the Substack editor for review before publishing.

---

## Post Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | required | Article headline |
| `content` | string | required | Markdown text or file path |
| `contentIsFile` | boolean | `false` | Set `true` when `content` is a file path |
| `subtitle` | string | `""` | Shown below the title |
| `audience` | `"everyone"` \| `"only_paid"` | `"everyone"` | Who can read |
| `sendEmail` | boolean | `false` | Send as email to subscribers |

---

## Workflow

When the user asks to post an article to Substack:

1. **Check credentials** — call `GET /api/substack/status`. If not configured, walk the user through setup above.
2. **Get the content** — read from a file path they provide, or use the markdown they paste.
3. **Show the content to the user** — print the full article title and body in chat so they can review it before anything is sent.
4. **Always save as draft first** — call `POST /api/substack/draft`. Return the `draftUrl` so the user can inspect it in the Substack editor.
5. **Ask explicitly for publish confirmation** — say something like: *"Draft saved at [url]. Reply 'publish' to make it live, or let me know if you'd like changes."*
6. **Only publish after the user explicitly confirms** — if and only if the user replies with a clear affirmative ("yes", "publish", "go ahead", etc.), call `POST /api/substack/post` with `publishImmediately: true`.
7. **Never auto-publish** — no matter how confident you are in the content, do not skip steps 4–6. A human must explicitly approve every publish action.

> **Rule:** Treat publishing as an irreversible action. Draft is always free; publish is never automatic.

## Supported Markdown

The agent converts markdown to Substack's editor format:

- `#`, `##`, `###` headings
- `**bold**`, `*italic*`, `~~strikethrough~~`
- `` `inline code` `` and ```` ```code blocks``` ````
- `[links](url)`
- `- bullet lists` and `1. ordered lists`
- `> blockquotes`
- `---` horizontal rules
