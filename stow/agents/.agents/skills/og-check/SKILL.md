---
name: og-check
description: Validate Open Graph / Twitter link-preview meta tags for a URL (og:image, og:image:width/height/type, ratio, twitter:card) without any external service. Use when checking why a Meta/Facebook/Twitter/LinkedIn link preview renders narrow, blank, or wrong, or to verify OG tags after changing page metadata. Triggers on "og check", "check og tags", "link preview tags", "meta sharing debugger", "validate open graph", "/og-check <url>".
---

# og-check

Validates social link-preview metadata for a URL locally — no MCP, no Facebook token, no third-party service.

## Run

```bash
python3 ~/.claude/skills/og-check/og_check.py <url> [--ua meta|twitter|default]
```

- `<url>` should be **public/deployed** for a real Meta check — Meta's scraper cannot reach `localhost`. A `localhost` URL still validates the *emitted* tags (useful right after a metadata change).
- `--ua meta` (default) sends a `facebookexternalhit` user-agent; `--ua twitter` sends `Twitterbot`. Some apps vary metadata by UA.
- Exit code is `1` when there is at least one blocker, else `0` — usable in scripts/CI.

## What it checks

- `og:image` present and **absolute** (Meta rejects relative URLs).
- `og:image:width` / `og:image:height` present + numeric; ratio ~1.91:1 and ≥ 600×315 (Meta's large-card threshold). **Missing dims are the usual cause of a narrowed mobile/comment card.**
- `og:image:type`, `og:title` / `og:description` / `og:url` / `og:type`.
- `twitter:card` (= `summary_large_image`) and `twitter:image`.
- Warns when `og:image` is routed through Next.js `/_next/image` (the optimizer transcodes format, which some scrapers handle inconsistently).

## Beyond tags

For the actually-rendered card (not just tags), run the deployed URL through the Meta Sharing Debugger: https://developers.facebook.com/tools/debug/ — and "Scrape Again" after deploying, since Meta caches aggressively.
