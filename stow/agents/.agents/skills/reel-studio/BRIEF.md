# reel-studio — design brief (read before writing any file)

Portable Claude Code skill that turns a live web product into short-form
marketing reels. It generalises a working prototype (say4real, Aug 2026) that
produced eight 1080x1920 reels; the prototype's motion language and hard-won
rules are kept, its hand-rolled renderer is replaced by Remotion, its plate
recorder is kept and hardened.

## The loop (phases, in order — the user picks before anything is shot)

1. RESEARCH  — read the repo + crawl the running app → research.md
2. STRATEGY  — propose 4–8 reels (hook / audience / objection / beats /
               grammar+opener / plates / CTA) → user picks (AskUserQuestion)
3. SEED      — fictional personas + data in the product's own DB (never real
               users); generated gradient avatars; one-line bios; links on
               recognised platform domains
4. PLATES    — drive the REAL production app headlessly, frame by frame, into
               PNG sequence + mp4 per plate; inspect sample frames first
5. COMPOSE   — one Remotion composition per reel from a JSON spec; one
               transition grammar + one opener per reel
6. RENDER+QA — versioned output (out/vN, never overwrite), automated QA,
               contact sheet that the agent LOOKS at, covers, 4:5 cuts,
               CAPTIONS.md, deliver with SendUserFile

## Why two passes

Production apps send `frame-ancestors 'none'` and Remotion explicitly does not
support live iframes ("only animations using useCurrentFrame are supported").
So the product is shot first as plates by Puppeteer (real DOM work: React
native-value setter + input events, real clicks, scroll) and Remotion
composites plates + typography + transitions deterministically.

## Verified Remotion facts (4.0.513, installed and inspected)

- remotion: AbsoluteFill, Composition, Sequence, Series, Img, staticFile,
  useCurrentFrame, useVideoConfig, interpolate, spring, Easing, delayRender,
  continueRender, registerRoot
- @remotion/renderer: ensureBrowser, openBrowser, renderFrames, renderMedia,
  renderStill, selectComposition;  @remotion/bundler: bundle
- @remotion/transitions: TransitionSeries, linearTiming, springTiming,
  useTransitionProgress; presentations are SUBPATHS:
  @remotion/transitions/{fade,slide,wipe,flip,clock-wipe,none,dissolve,
  push-cut,zoom-blur,linear-blur,cross-zoom,dreamy-zoom,film-burn,ripple,
  swap,book-flip,crosswarp,zoom-in-out}
- @remotion/motion-blur: CameraMotionBlur, Trail
- @remotion/layout-utils: fitText, fitTextOnNLines, fillTextBox, measureText
- @remotion/media (ESM-ONLY): Video, Audio   ← use <Video>, not OffthreadVideo
- @remotion/captions: createTikTokStyleCaptions, parseSrt, serializeSrt
- @remotion/google-fonts: subpath per font, e.g.
  import { loadFont } from '@remotion/google-fonts/BricolageGrotesque'
  import { loadFont } from '@remotion/google-fonts/PlusJakartaSans'
- React peer >= 16.8 (use React 19). Render from Node without Studio:
  bundle() → selectComposition() → renderMedia({codec:'h264'}).
- Determinism: NO Date.now / Math.random / setTimeout / rAF / CSS
  animations or transitions inside compositions. Everything from the frame.

## Licence (verified, state it once in SKILL.md)

Free for individuals and companies with ≤3 people. Otherwise Company
License: $25/seat/month (Creators) or $0.01/render with $100/month minimum
(Automators — "prompt-to-video pipelines" count). Shipping a desktop app that
renders with Remotion is allowed if end-users cannot view/edit Remotion code.

## Non-negotiables (from the prototype's scar tissue)

- Frame 0 already in motion; beats overlap ≥0.2s; ≥2 caption changes;
  12–15s; end on wordmark + CTA pill; domain in true small-caps.
- ONE grammar + ONE opener per reel; never the same pair twice in a set.
  Grammars: whip, through, deck, jump, rise. Openers: snap, settle, bloom,
  typeLine.
- Device is a seamless slab: no status bar, no notch, no home indicator.
- Captions small (≈38px) and BELOW the device, never over product footage.
- A plate's LAST frame is what the viewer sees longest (compositions hold
  on it): never let it be a screen you don't want. If the app paints a screen
  within ~100ms of an action, do not perform the action.
- Plates arrive mid-action (never start at app-state frame 0).
- Strip dev overlays (elements whose tagName starts with `nextjs-`), install
  banners, localhost chips, QR coins, any real-person identifiers.
- Collapse app animations (duration 1ms, transition none); `unfreezeAt` only
  when the animation IS the beat.
- Shoot against a PRODUCTION build served on the port baked into its
  NEXT_PUBLIC_* URL; the dev server drags its overlay into shot.
- Versioned outputs (out/vN); never overwrite a delivered set.
- Inspect frames (plate sheets, reel contact sheet) before claiming done.
- Never film real users; claim discipline from the profile's neverClaim.

## Portability

No product names, personas, URLs or brand tokens in scripts/ or templates/.
Everything product-specific lives in reel-studio.config.json and reels.json.
