# {{brand.name}} — reel captions

Ready to paste. One block per reel: hook, caption, ad cut, CTA, audience.
Every claim is checked against the profile (`tiers`, `neverClaim`) — read **Never say** before editing anything.

{{#if personas.allowed}}Any people in these films are personas written for the ads. Never call them customers, users, or "a real {{audienceNoun}}".{{/if}}

---

## {{n}} — `{{file}}` — {{title}}

{{durationSeconds}}s. {{oneLineShape — e.g. "typed hook, hard cut on the send"}}

**Hook (0–3s, on screen):** {{kicker, if any}} → **"{{hookLine}}"**
Beats after it: *{{beat1}}* → *{{beat2}}* → *{{beat3}}*

**Caption** (≤4 lines, ≤5 hashtags)

```
{{line1 — restate the hook, not the product}}
{{line2 — the mechanism, one sentence}}
{{line3 — the honest price/tier fact}}
{{cta}} → {{brand.domain}}

#{{tag1}} #{{tag2}} #{{tag3}} #{{tag4}} #{{tag5}}
```

**Ad cut (shorter)**

```
{{two lines, objection first, product second}}
{{brand.domain}}
```

**CTA line:** `{{ctaVerb}} → {{brand.domain}}{{ctaPath}}`

**Audience:** {{who, where they are, which placement (organic / cold paid / retarget), and which other reel they follow}}

---

<!-- repeat the block per reel; reels that are personality cuts of one message get a shared note: -->

> **{{n}}a / {{n}}b / {{n}}c are cuts of the same message.** A/B them — never post two on the same day, never in one ad set. One week (or one clean ad set) each, so the winner is the persona, not the slot.

---

## Posting notes

**Silent by design.** Every file is **1080×1920, 30fps, H.264, no audio track**. Add music **in-app** (Reels/TikTok editor), never in the export — an in-app trending track gets distribution weight, a baked-in one does not. Pick a beat that lands near the hard cuts. For paid cuts use a neutral licensed track so the ad is not muted by region.

**Feed cuts.** 4:5 letterboxed versions live in `{{outputDir}}/out/feed-4x5/` (`<name>-4x5.mp4`) for in-feed placements. Reels/Stories use the 9:16 originals in `{{outputDir}}/out/`.

**Cover frames.** Pre-picked stills in `{{outputDir}}/out/covers/` — same basename, `.jpg`; the frame where the hook line is complete but the camera has not moved. Contact sheets in `{{outputDir}}/out/sheets/`. Crop-check any replacement at 4:5 and 1:1 — centred headlines survive the grid crop, bottom captions do not.

**Tier facts, so the copy stays honest.**

| Tier | What it actually includes |
|---|---|
{{#each tiers}}| {{name}} | {{includes joined with ", "}} |
{{/each}}

Don't promise anything outside that table.

## Never say

<!-- auto-filled from profile.neverClaim, verbatim, one per line; then the approved phrasing from alwaysSay -->

{{#each neverClaim}}{{@index+1}}. {{this}}
{{/each}}
Say instead: {{alwaysSay joined with " · "}}
