# Traps

Each one cost at least an hour in the prototype. Format: trap → symptom → fix.
`plate.mjs` and `qa.mjs` encode the mechanical ones; the rest are judgement.

## Shooting plates

**Dev server in shot** → framework overlay/toast/build-watcher badge in the
corner of every frame; hot-reload flicker between frames → shoot a
**production build**. Also remove anything whose `tagName` starts with
`nextjs-` (or the framework's equivalent) in the freeze style, since a reload
re-injects it.

**Prod build on the wrong port** → page loads, but every send/submit hangs or
fails CORS; the client calls the origin baked in at build time
(`NEXT_PUBLIC_APP_URL` etc.) → serve on **exactly** the port the build was made
for; `baseUrl` in the profile must equal it. Rebuild if you need another port.

**`frame-ancestors 'none'`** → the app refuses to render inside a composition
iframe; Remotion would not support it anyway → plates. Load each page
top-level in Puppeteer, write PNGs, composite those.

**Lax session cookie not sent cross-site** → dashboard shots come back logged
out even though the cookie was set → plates keep the cookie first-party. If an
iframe is ever unavoidable, set `sameSite: 'None', secure: true` (localhost
counts as secure).

**Pausing app animations** → cards stuck at 0% opacity, invisible for the
whole shot → never `animation-play-state: paused`. **Collapse** instead:
`animation-duration: 1ms; animation-delay: 0s; animation-iteration-count: 1;
transition: none` so every state change lands on its END state next frame.
`caret-color: transparent` too, or the caret strobes.

**Animation IS the beat** → with the collapse, a reply bubble "flying in"
looks like a cut → `unfreezeAt: <seconds>` removes the freeze style from that
moment on, so the real animation plays across captured frames.

**Plate's last frame** → the composition holds the last plate frame for the
rest of the beat and the CTA; whatever is on it is the most-seen frame of the
reel (a post-send upsell card, a toast, a modal) → decide the last frame
first. If the app paints something within ~100 ms of an action, **do not
perform the action**: type up to the press and end the plate there. `qa.mjs`
checks the last frame for `forbidLast` text from the plate map.

**Plate starts at frame 0 of the app** → first captured frames show an empty
composer/landing at rest; frame 0 of the reel is the thumbnail and reads as a
stall → `settle` scrolls/opens/focuses before the clock starts; drivers begin
mid-action (text already partly typed, map already zoomed).

**`requestSubmit()` on a non-form composer** → nothing happens, silently → find
and `.click()` the visible send button (`aria-label`/`title` match, then
`getClientRects().length > 0`).

**Controlled React inputs** → setting `.value` is invisible to React → native
prototype setter + `dispatchEvent(new Event('input', { bubbles: true }))`.

**Two composers in the DOM** (desktop column + mobile panel) → driver types
into the hidden one → pick the element with `getClientRects().length > 0`.

**Hand-built `MouseEvent` on a card link** → navigates away instead of opening
the product's drawer → use `el.click()`; it is cancelable so the app's own
handler can `preventDefault`.

**Status bar / notch injected into flow** → removing only its CSS left markup
in normal flow; the plate shifted down and the composer was clipped → no phone
chrome at all. One seamless slab, plate fills the device rect.

**QR coin / avatar flip mid-animation** → first frames catch a 3D coin at
90°, a sliver → hide it in `settle` (match `aria-label`), or wait one full
cycle; the collapse style alone does not help because it is already mid-flip.

**Install banner, "localhost" referrer chips, "viewed N×" chips, demo-mode
pills** → dev-only truth leaking into an ad → hide by text match in `settle`
AND in the driver (they re-render). Keep honest small "demo data" labels where
the product has them.

**Real identifiers on the page** → the demo profile linked a real GitHub
account; a tester's name in the inbox → hide those blocks before rolling and
**Read** sample frames. Every new plate gets an identity pass.

**Scroll to a magic offset** → header overlaps the content you wanted; layout
differs between runs → measure the target element, subtract sticky header
height, assert clearance; scroll in `settle`, not in the driver's first frame.

**Marketing footer in a "their page" shot** → the scroll ran into the product's
own "Get yours" CTA, so the persona's page looked like our ad → cap the scroll
travel above it.

**Scrollbars, LCD text, colour profile** → hairline scrollbar, fringe colours,
mismatched tone against the composition → Chrome flags `--hide-scrollbars
--force-color-profile=srgb --disable-lcd-text`, `deviceScaleFactor: 2`.

**Not waiting two rAFs** → screenshot taken before the DOM write painted; a
frame lags by one → `await rAF(rAF)` before every capture.

## Seeding

**Cached avatars** → new initials render with the old image; the app (and the
browser) cache the avatar by path → **new filename per change**
(`-v2`, hash), never overwrite in place.

**Unrecognised link hosts** → link rows render title + raw URL, ugly and
off-brand → give personas links on platform domains the product recognises
(calendly, linkedin, youtube, substack-style).

**Empty states** → one pin, three visits, one message → seed volume, recency-
weighted; or use the product's own "preview with demo data" switch if it has
one (real UI, sample data, honest chip).

**Deleting a seeded user** → FKs (sessions, views, events) block it; per-user
encryption keys rotate on recreate and a warm server decrypts to null → wipe
incidental rows first; carry wrapped keys forward; idempotent seed script.

**Session for dashboard plates** → no login UI to drive headlessly → mint a
session row directly and sign it the way the auth lib does; store in
`session.json` inside the reels dir (gitignored); profile `auth.cookie`.

## Composing

**Non-deterministic composition** → the same second renders differently on
the next pass; Remotion's parallel frame rendering makes it visibly flicker →
no `Date.now`, `Math.random`, `setTimeout`, rAF, CSS `animation`/`transition`
in any composition. Everything from `useCurrentFrame()`. Pseudo-random from a
seeded hash of the frame/index.

**`<img src>` swap per frame** → frame still decoding at capture; smear →
plates as `<Img>` (Remotion waits for decode) or `<Video>` from
`@remotion/media`; never raw `<img>`.

**Words split by `<br>`** → a per-word splitter on `textContent` glues two
words ("guessingwho's") → keep headline markup flat; break lines with width or
`fitTextOnNLines`, not `<br>`.

**Gradient text with per-word transforms** → a transformed child escapes the
ancestor's `background-clip: text`; words go flat → gradient per word, with
`background-size`/`position` measured so the sweep stitches back together.

**Captions over footage** → unreadable on busy screens; covers the product →
captions ≈38 px, below the device. Always.

**Same pair twice** → the set feels templated → one grammar + one opener per
reel, unique pairs per set (`reference/grammars.md`).

**Held frame at the start** → empty first frame = bad thumbnail and a
perceived stall → frame 0 already mid-motion (opener at ~15% progress,
background drifting).

**Hard cut between beats** → reads as an error rather than a grammar → beats
overlap ≥ 0.2 s unless the grammar is `jump`, which has its settle.

**Domain as normal text** → looks like a typed URL → `font-variant-caps:
small-caps`, lowercase source, tracked 0.15–0.2 em, 70–80% opacity.

**Sound** → reels are watched muted and platforms attach their own audio →
ship silent, burn copy in; if audio is ever mastered, cut to the beat map.

## Rendering and delivery

**Overwrote the delivered set** → v1 is gone; the client asks for "the one
from before" → `out/vN/`, new N per delivery, never write into an existing N.

**Claimed done without looking** → black frame, clipped composer, wrong last
frame shipped → the `.sheet.jpg` plate.mjs writes per plate, and the contact sheet render.mjs writes per
reel, `qa.mjs` per set, and **Read the images** before SendUserFile.

**Exotic encode** → platform re-encodes harder and softens type → H.264 high
profile, level 4.2, yuv420p, CRF 18, `+faststart`, 30 fps, 1080×1920; 4:5 cut
at 1080×1350.

**Claims** → "we can't see who sent it", "unlimited", "free forever" when a
tier says otherwise → every caption and on-screen line checked against the
profile's `neverClaim`; the CAPTIONS.md never-say block is copied from it.
Personas are personas: never call them users or customers.
