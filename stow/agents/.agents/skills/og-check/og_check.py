#!/usr/bin/env python3
"""og-check: fetch a URL and validate Open Graph / Twitter link-preview meta tags.

Usage: python3 og_check.py <url> [--ua meta|twitter|default]
No third-party deps. Exits 0 if no blockers, 1 if blockers found.
"""
import re
import sys
import urllib.request
from html.parser import HTMLParser

UAS = {
    "meta": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "twitter": "Twitterbot/1.0",
    "default": "Mozilla/5.0 (compatible; og-check/1.0)",
}

GREEN, YELLOW, RED, RESET = "\033[32m", "\033[33m", "\033[31m", "\033[0m"


class MetaParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = {}

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "meta":
            return
        a = {k.lower(): (v or "") for k, v in attrs}
        key = a.get("property") or a.get("name")
        if key and "content" in a:
            self.tags[key.lower()] = a["content"]


def line(sym, label, val):
    print(f"{sym} {label:<20} {val}")


def main():
    if len(sys.argv) < 2:
        print("usage: og_check.py <url> [--ua meta|twitter|default]")
        sys.exit(2)

    url = sys.argv[1]
    ua = "meta"
    if "--ua" in sys.argv:
        ua = sys.argv[sys.argv.index("--ua") + 1]

    req = urllib.request.Request(
        url,
        headers={"User-Agent": UAS.get(ua, UAS["default"]), "Accept": "text/html"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            html = r.read(2_000_000).decode("utf-8", "replace")
    except Exception as e:
        print(f"{RED}✗ fetch failed: {e}{RESET}")
        sys.exit(1)

    p = MetaParser()
    p.feed(html)
    t = p.tags
    blockers = 0

    def ok(label, val):
        line(f"{GREEN}✓{RESET}", label, val)

    def warn(label, val):
        line(f"{YELLOW}⚠{RESET}", label, val)

    def bad(label, val):
        nonlocal blockers
        blockers += 1
        line(f"{RED}✗{RESET}", label, val)

    print(f"\nog-check {url}  (UA: {ua})\n")

    img = t.get("og:image") or t.get("og:image:url")
    if not img:
        bad("og:image", "MISSING")
    elif not re.match(r"^https?://", img):
        bad("og:image", f"relative URL (Meta needs absolute): {img[:80]}")
    else:
        ok("og:image", img[:80] + ("…" if len(img) > 80 else ""))
        if "/_next/image" in img:
            warn("og:image note", "routed through _next/image (optimizer transcodes format)")

    w = t.get("og:image:width")
    h = t.get("og:image:height")
    if not w or not h:
        bad(
            "og:image dims",
            f"width={w or 'MISSING'} height={h or 'MISSING'} → Meta may show narrow card",
        )
    else:
        ok("og:image:width", w)
        ok("og:image:height", h)
        try:
            ratio = int(w) / int(h)
            if 1.85 <= ratio <= 1.95:
                ok("ratio", f"{ratio:.2f}:1 (large card)")
            elif ratio >= 1.0:
                warn("ratio", f"{ratio:.2f}:1 (not ~1.91 — may not get the wide card)")
            else:
                warn("ratio", f"{ratio:.2f}:1 (portrait)")
            if int(w) < 600 or int(h) < 315:
                bad("min size", f"{w}x{h} below Meta's 600x315 large-card minimum")
        except ValueError:
            warn("ratio", "non-numeric width/height")

    typ = t.get("og:image:type")
    (ok if typ else warn)("og:image:type", typ or "absent (recommended image/png or image/jpeg)")

    for k in ("og:title", "og:description", "og:url", "og:type"):
        v = t.get(k)
        (ok if v else warn)(k, v[:60] if v else "absent")

    card = t.get("twitter:card")
    (ok if card == "summary_large_image" else warn)(
        "twitter:card", card or "absent (want summary_large_image)"
    )
    timg = t.get("twitter:image")
    (ok if timg else warn)("twitter:image", (timg[:60] if timg else "absent"))

    print()
    if blockers:
        print(f"{RED}{blockers} blocker(s) — Meta will likely render a narrow/no preview.{RESET}")
        sys.exit(1)
    print(f"{GREEN}No blockers — large-card requirements met.{RESET}")
    sys.exit(0)


if __name__ == "__main__":
    main()
