// Custom presentation for the "through" grammar: the incoming beat arrives
// from far away, the outgoing one leaves by swallowing the lens. Written as a
// TransitionPresentation so it stays a pure function of presentationProgress.

import type { CSSProperties } from 'react';
import { AbsoluteFill } from 'remotion';
import type { TransitionPresentation, TransitionPresentationComponentProps } from '@remotion/transitions';
import { blurPx, lerp, outExpo } from './ease';

type ThroughProps = Record<string, never>;

function ThroughPresentation(props: TransitionPresentationComponentProps<ThroughProps>) {
   const { children, presentationDirection, presentationProgress } = props;
   const k = outExpo(presentationProgress);
   const entering = presentationDirection === 'entering';

   const style: CSSProperties = entering
      ? {
           transform: `scale(${lerp(0.62, 1, k)})`,
           filter: blurPx((1 - k) * 10),
           opacity: Math.min(1, presentationProgress * 2.5),
        }
      : {
           transform: `scale(${lerp(1, 2.6, k)})`,
           filter: blurPx(k * 26),
           opacity: 1 - presentationProgress ** 2,
        };

   return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
}

export const through = (): TransitionPresentation<ThroughProps> => ({
   component: ThroughPresentation,
   props: {},
});
