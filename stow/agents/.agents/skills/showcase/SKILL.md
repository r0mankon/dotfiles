---
name: showcase
description: Produce store-ready screenshots, feature graphics, portfolio images, GIFs and demo video for a web app or PWA — seeds realistic demo data, captures real UI at true phone sizes, composites branded frames, and verifies every asset against store specs. Use for Play Store / App Store listings, landing-page shots, README images, or a launch clip.
---

# Showcase

Turn a running app into a complete set of marketing assets: phone screenshots,
store screenshots with headlines, feature graphic, portfolio collage, GIF, video.

The hard part is never the screenshot. It is **making the app show something
worth photographing**, and **not lying** while doing it. Most of this file is
about those two things.

## Ground rules

1. **Never fabricate a signal the product cannot produce.** If the UI shows
   "Switched to Wi-Fi", the app must actually detect that. Seed the *data* that
   makes a real feature fire; never edit rendered text to claim something the
   code can't do. If asked for a label the app can't back, say so and offer the
   honest nearest thing.
2. **Screenshots are a product review.** Every bug you photograph is a bug real
   users hit — a truncated string, a lowercase value, a stat stuck at 0%. Fix it
   in the app, then re-shoot. This is where most of the value comes from.
3. **Demo data must be plausible.** No city-hopping mid-conversation, no
   unanswered message buried under old ones, no metric that contradicts another
   on the same screen.
4. **Leave nothing behind.** Demo rows, test sessions, temp env vars and stray
   artifacts all get cleaned up. Work in a gitignored directory.

## Workflow

### 1. Scope it

Ask (or infer) three things and state your assumptions:

- **Which surfaces sell the product?** Pick one hook per shot. Play allows
  **max 8** phone screenshots, so 8 is the budget, not a target.
- **Who is the persona?** Use one consistent fictional person everywhere. If the
  project already has a landing-page demo persona, reuse that name/avatar — the
  site and the store should show the same human.
- **Whose identity is at risk?** Never screenshot the owner's real profile
  unless they ask. A store listing is public and permanent.

Write the shot list as `headline → screen` before capturing anything.

### 2. Seed the demo data

Put a seed script in the gitignored dir (e.g. `NOGIT/seed-demo.ts`) that writes
directly to the *local* DB. Make it idempotent — you will run it 15+ times.

Requirements learned the hard way:

- **Wipe first, including incidental rows.** Page views, analytics events and
  sessions accumulate FKs that block deleting the demo user. Delete those too.
- **Preserve per-user encryption keys across re-seeds.** If rows are encrypted
  under a per-user key, deleting and recreating the user mints a new key while a
  long-running server still caches the old one — every field then decrypts to
  null. Carry the wrapped key forward.
- **Seed enough volume.** Empty states are the enemy: maps with one pin,
  analytics with 3 visits, a thread with one message. Hundreds of rows spread
  over the reporting window.
- **Weight recency correctly.** A trend line should slope the way the story
  needs; check the sign of your exponent (`(i/n)**1.5` recent-heavy vs
  `**0.6` old-heavy).
- **Put unread/new items at the top by making them genuinely newest** — don't
  change the app's sort order to flatter a screenshot.
- **Drift telemetry on the rows the feature actually diffs.** If a "changed"
  chip compares consecutive *inbound* rows, drifting an outbound row does
  nothing.
- Give each tile/variant a **different** prompt/message so a grid doesn't repeat.

Then verify by **reading the API**, not the page — caches lie (see §6).

### 3. Capture

Use chrome-devtools MCP. Settings that matter:

```
emulate viewport: 390x844x3,mobile,touch     → 1170×2532 raw, a real phone width
```

- **Do not capture at 540+ CSS px.** The app lays out near-tablet and the result
  looks subtly wrong. 390 is an iPhone-class width; 412 for Android-class.
- **Shorter viewports crop for free.** Need only the header/bio band? Emulate
  `390x520x3`. The layout re-centres, so re-measure after changing height.
- **Strip dev chrome before every shot**, and note it re-injects on reload:
  ```js
  document.querySelectorAll('nextjs-portal').forEach(n => n.remove())
  ```
  Also dismiss onboarding nags and remove PWA "Install" affordances — those are
  hidden inside a real TWA/standalone app anyway, so they don't belong in a
  store shot.
- **Anchor scroll on content, never a magic offset.** Measure the element, the
  sticky header height, and the floating nav, then assert clearance:
  ```js
  scrollTo(absTop - headerH - 20)   // then verify chipTop > headerBottom
  ```
- **Translucent sticky headers ghost whatever is behind them.** If a row shows
  through the blur, hide that row for the capture rather than scrolling until
  something else breaks.
- **Bottom-anchored panels scroll the page.** If a header vanishes from frame,
  `window.scrollTo(0,0)` before shooting.

#### Freezing animated text

Rotating placeholders and typewriters will change between your check and the
screenshot — MCP round-trips take seconds. Setting `textContent` loses to the
next React render. The reliable recipe: **wait for the target, then freeze every
timer**.

```js
() => new Promise(resolve => {
  const node = () => [...document.querySelectorAll('span,div,p')]
    .find(e => e.children.length === 0 && /* stable class match */);
  const t = setInterval(() => {
    if (/TARGET/i.test(node()?.textContent ?? '')) {
      clearInterval(t);
      setTimeout(() => {
        const hiT = setTimeout(() => {}, 0);
        for (let i = 1; i <= hiT; i++) clearTimeout(i);
        const hiI = setInterval(() => {}, 999999);
        for (let i = 1; i <= hiI; i++) clearInterval(i);
        resolve({ frozen: node().textContent });
      }, 700);            // let the typewriter finish
    }
  }, 80);
})
```

To force *which* line appears, narrow the source data (e.g. set the prompt pool
to a single entry), capture, then restore. Prefer that over DOM surgery.

#### Logged-out views

Owner controls (Edit/Delete) leak into public-page shots. Capture those in an
isolated context instead of logging out:
`new_page(url, { isolatedContext: 'public' })`.

### 4. Composite

Templates in `assets/` take everything by query string, so re-rendering is
deterministic and re-runnable:

- `frame.html?img=…&h=…&s=…` — one phone, headline, subline
- `frame-mosaic.html?imgs=a,b,c,d,e,f&h=…&s=…` — 6-tile theme/variant wall
- `feature.html?img=…` — 1024×500 feature graphic

Render at `1080x1920x1` (or `1024x500x1`) and screenshot. Rules baked into the
templates, each one learned by breaking it:

- **The copy sits in a fixed-height band** so the device lands at the same Y on
  every frame. Without it a one-line headline lifts the phone and a two-line one
  drops it, and the set visibly jitters in the listing.
- **The screen derives its height from the capture's aspect ratio.** A fixed
  screen height silently crops the bottom of every shot.
- **Never `object-fit: cover` on a fixed-size tile** — it fills the height and
  slices the sides off. Choose the crop at *capture* time (viewport height)
  instead.
- **No notch/dynamic-island drawing.** It dates the asset and looks fake.
- Headline: display font ~80px/700 with open tracking; tight negative tracking
  at heavy weights fuses words into a block at thumbnail size.
- Subline: the app's **body** font, at a weight you actually imported —
  synthesized weights look off-brand.

Always verify after render:

```js
{ phoneTop, clipped: img.height > screen.height + 1, imgs: [...].every(loaded) }
```

### 5. Beyond the store

- **Portfolio / README collage** — reuse `frame-mosaic.html` with fewer tiles,
  or place 2–3 composed frames on a wide canvas (1600×900) for a case study.
- **GIF** — `scripts/frames-to-gif.sh` (palette-based, so gradients don't band).
- **Video** — `scripts/still-video.sh` turns composed stills into a paced clip
  with Ken Burns + crossfades. For *real* motion (animated maps, send
  animations, theme switches), capture a burst of screenshots in a loop and feed
  the frames in at 8–12fps — genuine UI motion beats a slideshow.
- Google Play's promo video is a **YouTube URL, not an upload** — deliver the
  file and let the user post it. App Store previews *are* uploads, with strict
  per-device resolutions.

### 6. Verify, then clean up

Before declaring done:

| Check | How |
|---|---|
| Dimensions + count | `sips -g pixelWidth -g pixelHeight`, ≤8 phone shots |
| Nothing cropped | assert image height == screen height in the frame |
| Device position identical | `phoneTop` equal across all single-phone frames |
| No dev/debug chrome | scan the raw for the framework badge, install banners |
| Data is coherent | numbers on one screen don't contradict another |

**Caches will show you stale data.** Two that burned an entire pass:

- **ISR/route caches** keep serving an old render after a DB change. Trigger the
  app's own revalidation path (save something through its API) rather than
  deleting cache directories.
- **ETag/`304`** can pin a client to a stale body indefinitely if the ETag is
  computed from metadata that didn't change. Fetch the API with
  `cache: 'no-store'` and compare against what the page shows — if they differ,
  it's the cache, not the seed.

Also: **some dev servers don't hot-reload on network volumes.** If a source edit
seems to have no effect, confirm by fetching the API and checking for your new
field before you go debugging the code. Restart the dev server when in doubt —
ask first if it isn't yours.

Cleanup checklist: delete demo rows, remove any test sessions you minted, restore
mutated settings (prompts, themes, feature flags), restore env files, and keep
every artifact in the gitignored dir.

## Store specs

See `reference/specs.md` for Play/App Store dimensions, counts and limits.
