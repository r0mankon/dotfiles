# Grammars and openers

A reel has ONE transition grammar (how beats enter and leave) and ONE opener
(how the first line arrives). Pick the pair in STRATEGY, record it in
`reels.json`, never reuse a pair inside a set. Same-template cuts are the first
thing a viewer — and the client — notices.

Durations below are seconds at 30 fps. Every curve is a function of
`useCurrentFrame()`; `spring()` and `interpolate()` from `remotion`,
`TransitionSeries` + timings from `@remotion/transitions`, presentations from
their subpaths. Motion blur from `@remotion/motion-blur` (`CameraMotionBlur`)
only where noted — it multiplies render time.

## Grammars

### whip
- Feels: horizontal slam with motion blur. "One thing, then the next thing."
- Suits: feature runs, before/after, gen-z energy, anything list-shaped.
- Remotion: `TransitionSeries` with `slide({ direction: 'from-right' })`
  (exit `from-left`), `linearTiming({ durationInFrames: 12, easing:
  Easing.out(Easing.exp) })`; wrap the series in `CameraMotionBlur
  ({ shutterAngle: 180, samples: 6 })`. In ≈0.55 s, out ≈0.4 s. Or, for
  continuous footage, `zoom-blur`/`linear-blur` presentations.

### through
- Feels: the camera falls through the frame — beats arrive from far away and
  leave by swallowing the lens. Depth, not cards.
- Suits: emotional hooks, "dive into" a notification/inbox, premium tone.
- Remotion: per beat, `scale = interpolate(f, [0, 21], [0.62, 1], {easing:
  Easing.out(Easing.exp)})` on entry; on exit scale → 2.6 with blur
  `filter: blur(px)` driven by the same progress; opacity only in the last
  20% of the exit. Equivalent presentation: `cross-zoom` or `dreamy-zoom` with
  `springTiming({ config: { damping: 200 } })`.

### deck
- Feels: vertical push; outgoing lifts and scales up slightly as the incoming
  slides under it.
- Suits: successive screens, onboarding steps, dashboards, B2B.
- Remotion: `slide({ direction: 'from-bottom' })` for entry plus an exit
  layer scaled 1 → 1.08 with blur 0 → 14 px over 12 frames; or hand-roll with
  two `Sequence`s overlapping by 6 frames. Timing `linearTiming(15)` + expo
  out.

### jump
- Feels: hard cut, no easing, one-frame displacement and a 4-frame settle
  (scale 1.06 → 1, blur 6 → 0).
- Suits: rapid product screens, ads under 10 s, anything where smoothness
  would read as slow; also lock-screen notifications (they jump, never type).
- Remotion: `none()` presentation with `linearTiming(1)`; the settle is
  `interpolate(localFrame, [0, 4], [1.06, 1])` inside each beat. No motion
  blur.

### rise
- Feels: lifts with weight and settles (overshoot), leaves upward and shrinks.
  The workhorse — limit to ONE reel per set.
- Suits: launches, "introducing", calm professional copy.
- Remotion: `spring({ frame, fps, config: { damping: 12, stiffness: 120,
  mass: 0.9 } })` → `translateY` from 760 px to 0 over ≈0.95 s; exit
  `translateY −420`, scale 1 → 0.9, blur 0 → 16 px over 0.35 s.

## Openers

The first second sets the personality. The opener applies to the hook line
only; later captions use the same family but shorter and without overshoot.

### snap
- Feels: each word pops in at full size with a tiny alternating counter-
  rotation. Punchy, loud.
- Suits: gen-z, creators, streamers; pairs with whip or jump.
- Remotion: per word, `spring({ config: { damping: 8, stiffness: 200 } })`
  over 8 frames, stagger 2–3 frames; `rotate` ±7° → 0, `scale` 0.4 → 1,
  opacity steps to 1 on the first frame.

### settle
- Feels: words fade up in place 26 px, no overshoot. Measured, professional.
- Suits: B2B, coaches/consultants, anything with a price; pairs with deck or
  rise.
- Remotion: per word `interpolate` over 18 frames, stagger 2–3 frames,
  `Easing.out(Easing.exp)`; opacity reaches 1 at 60% of the ramp.

### bloom
- Feels: words arrive blurred (22 px) and oversized (1.14) and sharpen into
  place. Dreamy, editorial.
- Suits: lifestyle, music, photography, emotional hooks; pairs with through.
- Remotion: per word over 22 frames, stagger 3 frames, `Easing.out(Easing.
  cubic)`; `filter: blur()` and `scale` from the same progress; drop the
  filter entirely once progress ≥ 0.99 (cheaper frames).

### typeLine
- Feels: a line typed live, block cursor blinking. Reads as someone writing
  to you. Can clear and retype a second line.
- Suits: messaging, chat, DMs, support; pairs with whip or jump.
- Remotion: `chars = floor((frame − start) / fps × cps)` with cps 26–30;
  cursor `▌` shown when `floor(((frame − start)/fps) × 2) % 2 === 0` or while
  typing. Use `fitText` from `@remotion/layout-utils` to keep the full line
  on one row at the final length so the layout does not jump as it types.

## Pairing guide

| Personality | Grammar | Opener |
|---|---|---|
| loud / gen-z / creator | whip | snap |
| emotional / premium | through | bloom |
| product walkthrough / B2B | deck | settle |
| ad cut / fast / notification-led | jump | typeLine |
| launch / calm | rise | settle (or bloom) |

Five grammars × four openers = twenty pairs; a set of eight reels uses eight
distinct ones. Record the pair in the STRATEGY table and in `reels.json`.
`qa.mjs` flags duplicates within a set.
