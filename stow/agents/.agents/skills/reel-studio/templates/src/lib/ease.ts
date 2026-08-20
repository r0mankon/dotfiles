// Pure easing and timeline helpers — a function of t only. Shared by the
// openers, presentations and grammars; no React, no remotion state.

import { Easing } from 'remotion';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

// Normalised progress of t through [a, b].
export const p = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

// outExpo is the workhorse: arrive fast, settle — expensive-looking motion.
export const outExpo = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x));
export const inExpo = (x: number) => (x <= 0 ? 0 : 2 ** (10 * x - 10));
export const outCubic = (x: number) => 1 - (1 - x) ** 3;
export const outBack = (x: number, s = 1.7) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2;

// Overshoot with settle — for anything that "lands". Closed form, no solver.
export const springEase = (x: number, freq = 3.2, decay = 5.5) =>
   x >= 1 ? 1 : 1 - 2 ** (-decay * x) * Math.cos(freq * Math.PI * x);

export const ramp = (t: number, t0: number, t1: number, a: number, b: number, ease = outExpo) =>
   lerp(a, b, ease(p(t, t0, t1)));

// Fade in, hold, fade out. 0..1.
export function band(t: number, inStart: number, inEnd: number, outStart: number, outEnd: number, ease = outCubic) {
   if (t < inStart) return 0;
   if (t < inEnd) return ease(p(t, inStart, inEnd));
   if (t < outStart) return 1;
   if (t < outEnd) return 1 - ease(p(t, outStart, outEnd));

   return 0;
}

// Deterministic pseudo-random in [0,1).
export function rnd(seed: number) {
   const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;

   return x - Math.floor(x);
}

// Typewriter, pure in t (seconds).
export function typed(text: string, t: number, start: number, cps = 26) {
   const n = Math.floor(clamp((t - start) * cps, 0, text.length));

   return { text: text.slice(0, n), done: n >= text.length, n };
}

// Presets for remotion's spring(): the three weights the reels use.
export const SPRING = {
   snappy: { damping: 14, stiffness: 180, mass: 0.9 },
   heavy: { damping: 18, stiffness: 80, mass: 1.4 },
   soft: { damping: 200, stiffness: 120 },
} as const;

export const EASE = {
   outExpo: Easing.out(Easing.exp),
   outCubic: Easing.out(Easing.cubic),
   inOutCubic: Easing.inOut(Easing.cubic),
} as const;

// Blur that drops to none instead of lingering at 0.1px (which still costs a pass).
export const blurPx = (px: number) => (px > 0.3 ? `blur(${px}px)` : undefined);
