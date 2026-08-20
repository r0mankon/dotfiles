// The motion language, ported from the prototype's lib.js. Everything is a
// pure function of the frame: no wall clock, no CSS animation, no rAF.

import { linearTiming, springTiming } from '@remotion/transitions';
import type { TransitionPresentation, TransitionTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { none } from '@remotion/transitions/none';
import { through } from './Through';
import type { GrammarName } from '../spec';
import { EASE, SPRING } from './ease';

export { Opener } from './Opener';

export * from './ease';

// ---------------------------------------------------------------- grammars
//
// One grammar per reel, so a set of films does not all cut the same way.
// Each is a presentation + timing pair for TransitionSeries.Transition plus the
// whole-frame punch the cut should land with.

export interface Grammar {
   presentation: TransitionPresentation<Record<string, unknown>>;
   timing: TransitionTiming;
   // Frames the cut overlaps the two beats by.
   durationInFrames: number;
   // Whole-frame scale punch at the cut (0 = none).
   punch: number;
   // Wrap the moving layer in CameraMotionBlur.
   motionBlur: boolean;
}

const asPresentation = <T extends Record<string, unknown>>(pres: TransitionPresentation<T>) =>
   pres as unknown as TransitionPresentation<Record<string, unknown>>;

export function grammarFor(name: GrammarName, fps = 30): Grammar {
   switch (name) {
      // Horizontal enter/exit with motion blur — "one thing, then the next".
      case 'whip': {
         const durationInFrames = Math.round(fps * 0.5);

         return {
            presentation: asPresentation(slide({ direction: 'from-right' })),
            timing: springTiming({ config: SPRING.snappy, durationInFrames }),
            durationInFrames,
            punch: 0.03,
            motionBlur: true,
         };
      }
      // The camera falls THROUGH the frame: depth, not sliding cards.
      case 'through': {
         const durationInFrames = Math.round(fps * 0.6);

         return {
            presentation: asPresentation(through()),
            timing: linearTiming({ durationInFrames, easing: EASE.outExpo }),
            durationInFrames,
            punch: 0.02,
            motionBlur: true,
         };
      }
      // Vertical deck push: outgoing lifts away, incoming slides under.
      case 'deck': {
         const durationInFrames = Math.round(fps * 0.45);

         return {
            presentation: asPresentation(slide({ direction: 'from-bottom' })),
            timing: linearTiming({ durationInFrames, easing: EASE.outExpo }),
            durationInFrames,
            punch: 0.025,
            motionBlur: false,
         };
      }
      // Hard cut: no easing, a 3-frame blink and a settle.
      case 'jump': {
         const durationInFrames = 3;

         return {
            presentation: asPresentation(none()),
            timing: linearTiming({ durationInFrames }),
            durationInFrames,
            punch: 0.06,
            motionBlur: false,
         };
      }
      // Rises with weight and settles — the workhorse; keep it to ONE reel.
      case 'rise': {
         const durationInFrames = Math.round(fps * 0.9);

         return {
            presentation: asPresentation(slide({ direction: 'from-bottom' })),
            timing: springTiming({ config: SPRING.heavy, durationInFrames }),
            durationInFrames,
            punch: 0.035,
            motionBlur: false,
         };
      }
   }
}
