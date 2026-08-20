// Text openers. The first second sets the personality: a professional ad and a
// gen-z reel should not arrive the same way. Each animates per word from the
// frame; `at` is the frame (within the enclosing sequence) the line starts.

import type { CSSProperties } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { OpenerKind } from '../spec';
import { blurPx, clamp, lerp, outBack, outCubic, outExpo, springEase, typed } from './ease';

interface Props {
   text: string;
   at?: number;
   kind: OpenerKind;
   // Seconds between word starts; each kind has its own default.
   step?: number;
   // CSS gradient applied to words wrapped in *asterisks*.
   gradient?: string;
   style?: CSSProperties;
}

export function Opener(props: Props) {
   const { text, at = 0, kind, step, gradient, style } = props;
   const frame = useCurrentFrame();
   const { fps } = useVideoConfig();
   const t = (frame - at) / fps;

   if (kind === 'typeLine') {
      const { text: shown, done } = typed(text, t, 0, 30);
      // Cursor blink derived from t so it is identical on every pass.
      const blink = !done || Math.floor(t * 2) % 2 === 0;

      return (
         <div style={{ ...style, whiteSpace: 'pre-wrap' }}>
            {shown}
            <span style={{ opacity: blink ? 1 : 0 }}>▌</span>
         </div>
      );
   }

   const words = text.split(' ').filter(Boolean);
   const stepS = step ?? STEP[kind];

   return (
      <div style={style}>
         {words.map((raw, i) => {
            // Tolerate trailing punctuation: "*matters*." must still take the
            // gradient (and keep its period outside the starred span).
            const m = /^\*(.+)\*([.,!?…:;]*)$/.exec(raw);
            const accent = m !== null;
            const word = m ? m[1] + m[2] : raw;
            const k = clamp((t - i * stepS) / DUR[kind]);
            const wordStyle = styleFor(kind, k, i);

            // Gradient per word: a transformed child escapes an ancestor's
            // background-clip, so the gradient has to live on the word itself.
            const gradStyle: CSSProperties =
               accent && gradient
                  ? { backgroundImage: gradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
                  : {};

            return (
               <span key={i} style={{ display: 'inline-block', willChange: 'transform', ...wordStyle, ...gradStyle }}>
                  {word}
                  {i < words.length - 1 ? ' ' : ''}
               </span>
            );
         })}
      </div>
   );
}

const STEP: Record<Exclude<OpenerKind, 'typeLine'>, number> = { snap: 0.075, settle: 0.08, bloom: 0.09 };
const DUR: Record<Exclude<OpenerKind, 'typeLine'>, number> = { snap: 0.26, settle: 0.6, bloom: 0.75 };

function styleFor(kind: Exclude<OpenerKind, 'typeLine'>, k: number, i: number): CSSProperties {
   switch (kind) {
      // Full size with a tiny counter-rotation — punchy, loud.
      case 'snap': {
         const e = outBack(k, 2.6);

         return {
            opacity: k > 0 ? 1 : 0,
            transform: `scale(${lerp(0.4, 1, e)}) rotate(${lerp(i % 2 ? 7 : -7, 0, e)}deg)`,
         };
      }
      // Fade up in place, no overshoot — measured, professional.
      case 'settle': {
         const e = outExpo(k);

         return { opacity: clamp(k * 1.6), transform: `translate3d(0, ${(1 - e) * 26}px, 0)` };
      }
      // Already blurred, sharpening — dreamy, editorial.
      case 'bloom': {
         const e = outCubic(k);

         return {
            opacity: clamp(k * 1.4),
            transform: `scale(${lerp(1.14, 1, e)})`,
            filter: e < 0.99 ? blurPx((1 - e) * 22) : undefined,
         };
      }
   }
}

// Slam: the prototype's loud hook — overshoot + motion blur per word. Not one
// of the four named openers but kept for sets that want it via `kind` later.
export function slamStyle(k: number): CSSProperties {
   const e = springEase(k);
   const blur = (1 - outExpo(k)) * 14;

   return {
      opacity: clamp(k * 2.2),
      transform: `translate3d(0, ${(1 - e) * 90}px, 0) scale(${lerp(1.18, 1, e)})`,
      filter: blurPx(blur),
   };
}
