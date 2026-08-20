---
name: reel-studio
description: Turn a live web product into production-grade short-form marketing reels (9:16, also 4:5) — explores the product, proposes a content strategy and shot list, drives the real app headlessly into frame-exact plates, composites them with a per-reel motion grammar in Remotion, runs automated QA, and delivers MP4s + covers + captions. Use for Instagram/TikTok/Facebook reels, ads, app-store previews, launch videos, or any "make a video of my product".
---

# Reel Studio

A frame-exact compositor that drives the **real** product. Two passes: Puppeteer
shoots the app as numbered PNG "plates" (real DOM: typed input, real clicks,
real scroll), then Remotion composites plates + typography + transitions
deterministically and renders H.264.

- **Is:** rendered, not recorded. Same spec → same pixels. Re-cut in minutes.
- **Is not:** a screen recorder, a slideshow, a Loom. Never film in real time.
- **Why plates:** production apps send `frame-ancestors 'none'` and Remotion
  supports no live iframes ("only animations using useCurrentFrame"). So the
  product is shot first, top-level, with its cookie first-party.
- **Remotion inside.** Licence: free for individuals and companies of ≤3
  people; otherwise Company License ($25/seat/mo, or $0.01/render with a
  $100/mo minimum — automated pipelines count). Say this once, up front.

Files: `scripts/plate.mjs`, `scripts/render.mjs`, `scripts/qa.mjs`,
`templates/` (compositions + config schema), `reference/grammars.md`,
`reference/rules.md`. Everything product-specific lives in the project's
`reel-studio.config.json` and `reels.json`; nothing in scripts/templates is.

## Phases

Run in order. The user picks before anything is shot.

### 1. RESEARCH

Agent: read the repo (README, routes, schema, copy files, landing pages); crawl
the running app — public pages, plus logged-in areas if a session is provided;
list features, personas/audiences, brand tokens (fonts, colours, radius, logo),
competitors if named, and the profile's `neverClaim` list verbatim. Spawn a
subagent for the crawl. Output `research.md` in the project's reels dir.
User decides: nothing yet — but read research.md back to them in five lines.

### 2. STRATEGY

Agent: propose 4–8 reels as a table — hook · audience · objection it answers ·
story beats · grammar + opener · plates needed · CTA. One objection per reel.
No two reels share a grammar+opener pair (see `reference/grammars.md`).
Then **STOP** and AskUserQuestion (multi-select): pick, edit, reorder.
Never shoot before the pick. Write the picked set to `reels.json`.

### 3. SEED

Agent: if the profile has `seedScript`, create fictional personas + data in the
product's own local DB through it. Never film real users or the owner's profile.
Avatars: generated gradients with initials (new initials → **new filename**, the
app caches by path). Bios one line. Links on recognised platform domains so they
render as platform rows, not raw URLs. Enough volume that no empty state shows.
User decides: persona names/handles if they care (offer three).

### 4. PLATES

Agent: write the plate map — per plate: URL, driver, what to hide, scroll start,
when/if to act. Shoot with `scripts/plate.mjs <name>`. Then **Read three sample
frames per plate** (first, middle, last) before compositing anything.

Rules:
- Arrive mid-action. A plate never starts at the app state's frame 0.
- The plate's **last frame is what the viewer sees longest** (compositions hold
  on it). If the app paints a screen within ~100 ms of an action (post-send
  cards, toasts), do not perform the action — type up to the press and stop.
- Strip: dev overlays (tagName starting `nextjs-`), install banners, localhost
  chips, QR coins, owner controls, any real-person identifier.
- Collapse app animations (duration 1 ms, transition none). `unfreezeAt` only
  when the animation IS the beat.
- Shoot the production build on the port baked into its `NEXT_PUBLIC_*` URL.
User decides: nothing — unless a plate needs a real send (notifications fire).

### 5. COMPOSE

Agent: one Remotion composition per reel from `templates/`: hook → product
beats → CTA. Per reel: ONE grammar + ONE opener. Captions ≈38 px, **below** the
device, never over footage. Device is a seamless slab — no status bar, notch or
home bar. Domain in true small caps. Frame 0 already in motion (it is the
thumbnail). Beats overlap ≥0.2 s. ≥2 caption changes. 12–15 s. End on wordmark +
CTA pill. All motion from `useCurrentFrame`; plates via `<Img>`/`staticFile`
sequences or `<Video>` from `@remotion/media`.
User decides: copy edits after the first contact sheet.

### 6. RENDER + QA

Agent: `scripts/render.mjs <reel>` → `out/vN/` (new N each delivery; never
overwrite). Then `scripts/qa.mjs out/vN` — black frames, static stretches,
safe-area violations, first-frame-empty, duration/size/fps, forbidden text on
the last plate frame (from the plate map) — plus a 12-frame contact sheet per
reel. **Read the sheet.** Fix. Re-render. Deliver with SendUserFile: MP4s,
4:5 cuts, covers, `CAPTIONS.md` (hook, caption, ad cut, CTA, audience,
never-say list per reel).
User decides: ship, or a change list → back to COMPOSE.

## Project profile — `reel-studio.config.json`

Schema in `templates/reel-studio.config.schema.json`. Lives in the project root
(or the reels dir). On first run, if absent, AskUserQuestion for each, with
guesses from the repo as defaults:

| Key | What |
|---|---|
| `baseUrl` | prod-build origin, e.g. `http://localhost:3001` — must equal the baked `NEXT_PUBLIC_*` URL |
| `prodStartCommand` | how to serve the prod build on that port |
| `auth` | `none` · `cookie` (`{ name, valueFrom }`) · `login` (`{ url, steps }`) |
| `brand` | `name`, `domain`, `wordmark` (path), `fonts` (`display`, `body`), `colors`, `radius` |
| `neverClaim` | phrases/claims the reels must not make — the allow-list's inverse |
| `seedScript` | optional command that seeds personas/data idempotently |
| `outDir` | reels dir, gitignored (default `NOGIT/reels`) |
| `hide` | selectors/text patterns to strip from every plate |

## Non-negotiables

- Versioned outputs. `out/vN/`. Never overwrite a delivered set.
- Inspect frames (plate samples, reel contact sheet) before claiming done.
- No phone chrome. Seamless slab.
- Captions small and below the device. Never over product footage.
- One grammar + one opener per reel; never the same pair twice in a set.
- Frame 0 in motion. Beats overlap. End on wordmark + CTA.
- Plates arrive mid-action and end on a safe frame.
- Never film real users, the owner, or real identifiers.
- Claim discipline: nothing from `neverClaim`; nothing the product can't do.
- Remotion determinism: no `Date.now`, `Math.random`, `setTimeout`, rAF, CSS
  animations/transitions in compositions. Everything from `useCurrentFrame`.
- Production build, not dev server. Port must match the baked URL.
- Seed/personas/outputs stay in the gitignored reels dir. Clean up test
  sessions and seeded rows when asked; never leave them in a shared DB.

## Commands

```bash
# scaffold the workspace (templates + scripts + config) into <project>/reels/
node <skill>/scripts/init.mjs <project> --baseUrl http://localhost:3001 \
   --start "pnpm exec next start --port 3001"
cd <project>/reels && pnpm install

# serve the PRODUCTION build on the port baked into its NEXT_PUBLIC_* URL
pnpm build && pnpm exec next start --port 3001

node scripts/plate.mjs <plate>       # → public/plates/<plate>/0000.png…, .mp4,
                                     #   .sheet.jpg — LOOK at the sheet first
node scripts/render.mjs <reel>       # → out/vN/<reel>.mp4 + qa + contact sheet
node scripts/render.mjs all          # every reel in src/reels.json
node scripts/render.mjs <reel> --feed   # 1080x1350 variant (`<reel>-feed`)
node scripts/qa.mjs out/vN           # re-check a whole version; non-zero on FAIL
node scripts/sheet.mjs <mp4>         # contact sheet + cover for one file
```

`src/reels.json` is the spec `render.mjs` reads: per reel — id, grammar,
opener, brand, hook, beats (plate / chips / lock), cta. Start from
`src/reels.example.json`. Plates and the logo live under `public/`.

## Stop and ask

- Before shooting: the strategy pick (always).
- Anything that would film real user data, the owner's profile, or a real name.
- Any claim not backed by the product or present in `neverClaim`.
- A plate that must perform a real, externally visible action (send, publish,
  notify).
- The user says the company is >3 people → Remotion licence, before rendering.
- The app has no prod build / no way to run on the baked port.
