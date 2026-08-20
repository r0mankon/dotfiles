# Remotion cheat-sheet (verified against v4.0.513)

Facts only. Anything not listed here: read the `.md` version of the doc page
(`https://www.remotion.dev/docs/<page>.md`), or `https://www.remotion.dev/llms.txt`.
Official agent skills: `npx skills add remotion-dev/skills`. No MCP.

## Mental model

Remotion is `seek(t)` formalised: a composition is a pure function of
`useCurrentFrame()`. Frames render in parallel across browser tabs, so anything
that is not derived from the frame number is a bug.

Determinism rules (same as the prototype's `seek(t)` contract):
- no `Date.now`, `Math.random`, `setTimeout`, rAF, CSS animations/transitions
- no live `<iframe>` — explicitly unsupported ("only animations using
  `useCurrentFrame` are supported"). That is why plates exist: record the real
  app first, composite the recording second.
- async work (font load, image decode) goes through `delayRender()` /
  `continueRender()`; never await in the render body.
- `spring()` and `interpolate()` are pure; use them instead of hand-rolled state.

## Imports

```ts
import { AbsoluteFill, Composition, Sequence, Series, Img, staticFile,
   useCurrentFrame, useVideoConfig, interpolate, spring, Easing,
   delayRender, continueRender, registerRoot } from 'remotion';

import { TransitionSeries, linearTiming, springTiming, useTransitionProgress } from '@remotion/transitions';
// presentations are SUBPATH imports
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
// also: /flip /clock-wipe /none /dissolve /push-cut /zoom-blur /linear-blur
//       /cross-zoom /dreamy-zoom /film-burn /ripple /swap /book-flip /crosswarp /zoom-in-out

import { CameraMotionBlur, Trail } from '@remotion/motion-blur';
import { fitText, fitTextOnNLines, fillTextBox, measureText } from '@remotion/layout-utils';
import { Video, Audio } from '@remotion/media';          // ESM-only package
import { createTikTokStyleCaptions, parseSrt, serializeSrt } from '@remotion/captions';
import { loadFont } from '@remotion/google-fonts/BricolageGrotesque';  // one subpath per family

import { bundle } from '@remotion/bundler';
import { ensureBrowser, openBrowser, renderFrames, renderMedia, renderStill, selectComposition } from '@remotion/renderer';
```

React peer `>=16.8`; use React 19. Project is ESM (`"type": "module"`); keep
`.mjs` scripts and `.tsx` comps.

## Plates: `<Video>` vs `<Img>` sequence

| | `<Video>` from `@remotion/media` | `<Img src={staticFile(`plates/x/${frame}.png`)}>` |
|---|---|---|
| source | one mp4 per plate (encode PNGs with ffmpeg) | the raw PNG sequence |
| frame accuracy | frame-exact (Mediabunny decoder), seek via `startFrom`/`trimBefore` | exact by construction |
| disk | small | large, regenerable |
| speed ramps / holds | `playbackRate`, but non-integer rates resample | trivial: compute the index yourself |
| cost | decode per frame, fine at 30fps 1080p | many small files; `staticFile` must exist at bundle time |

Rule: **`<Img>` sequence while iterating** (holds, reverses, jump-cuts are just
index math — the prototype's `drawPlate`); **`<Video>` for the final archive**
once the plate is locked. Do NOT use `OffthreadVideo` — `@remotion/media`
`<Video>` supersedes it. Pad the index (`String(i).padStart(4,'0')`) and clamp
to the last frame so a long comp never requests a missing file.

## Text

`fitText({ text, withinWidth, fontFamily, fontWeight, letterSpacing })` returns
`{ fontSize }` — call it in render (it measures synchronously via canvas) after
`loadFont()` has resolved, so wrap the comp in `delayRender` until fonts are in.
`fitTextOnNLines` for 2-line hooks; `fillTextBox` for paragraph captions.
Headline markup stays flat (no `<br>` inside a word-split span).

Fonts: `const { fontFamily, waitUntilDone } = loadFont('normal', { weights: ['700'], subsets: ['latin'] })`;
await `waitUntilDone()` behind `delayRender`. Only load weights the brand
actually ships — synthesised weights look off-brand.

## Motion blur

`<CameraMotionBlur shutterAngle={180} samples={10}>` re-renders its children
`samples` times per frame with sub-frame offsets — render cost multiplies by
`samples`. Use it only on whip/through/jump grammars, wrap just the moving
layer, keep `samples` 6–10, and drop it for contact-sheet previews. `<Trail>` is
for trailing copies (ghost sweep), not camera blur.

## Rendering from Node

```js
import { bundle } from '@remotion/bundler';
import { ensureBrowser, renderMedia, selectComposition } from '@remotion/renderer';

await ensureBrowser();                                  // downloads Chrome Headless Shell once
const serveUrl = await bundle({ entryPoint: 'src/index.ts', publicDir: 'public' });
const composition = await selectComposition({ serveUrl, id: 'reel-01', inputProps });
await renderMedia({
   composition, serveUrl, codec: 'h264', outputLocation: 'out/reel-01.mp4',
   inputProps,
   concurrency: 4,                                      // tabs; default ≈ cpu/2; raise until RAM, not CPU, is the limit
   chromiumOptions: { gl: 'angle' },                    // blur/filter-heavy comps; 'swangle' on Linux without a GPU
   muted: true,                                         // reels ship silent
   onProgress: ({ progress }) => …,
});
```

- `renderStill` for covers; `renderFrames` + `stitchFramesToVideo` only if you
  need to post-process PNGs (contact sheets can just be `renderStill` at 12 `frame`s).
- Non-ESM `@remotion/media` is not a thing — import it only from ESM code.
- `bundle()` once per session, reuse `serveUrl` across comps.
- `frame-ancestors 'none'` on the product is irrelevant here: plates are files, not iframes.

## Licence (verified)

Source-available, not OSI. **Free for individuals and for companies with ≤3
people** (employees + contractors). Above that: Creators $25/seat/mo, or
**Automators $0.01/render with a $100/mo minimum — "prompt-to-video pipelines"
count as automation**. Enterprise $500+/mo. Shipping a desktop/web app that
renders with Remotion is allowed only behind an abstraction layer (end users
cannot view/edit Remotion code) with renders reported; the obligation sits with
the publisher and lasts ≥1 year after the last release. Remotion 5 makes the
licence key / telemetry mandatory for Automators. Re-check before any team
growth or before packaging this skill into a product; keep the Puppeteer+ffmpeg
renderer as the licence-free fallback.
