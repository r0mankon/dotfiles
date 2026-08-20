// Small caption pinned BELOW the device, never over product footage. Reels are
// watched muted, so the copy has to carry it; the scrim keeps it legible over
// the glows without boxing it in.

import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { CaptionCue } from '../spec';
import { band, clamp, outExpo, p } from './ease';

interface Props {
   schedule: CaptionCue[];
   fontFamily: string;
   // Distance from the frame bottom, in px of the composition.
   bottom?: number;
   ink?: string;
   // Seconds after which the last cue fades (omit = hold to the end).
   outAt?: number;
}

export function Caption(props: Props) {
   const { schedule, fontFamily, bottom = 118, ink = '#fff', outAt } = props;
   const frame = useCurrentFrame();
   const { fps, width } = useVideoConfig();
   const t = frame / fps;

   const cues = [...schedule].sort((a, b) => a.at - b.at);
   const idx = cues.reduce((acc, cue, i) => (cue.at <= t ? i : acc), -1);

   if (idx < 0) return null;

   const cue = cues[idx];
   const next = cues[idx + 1];
   const end = next ? next.at : (outAt ?? Number.POSITIVE_INFINITY);
   const vis = band(t, cue.at, cue.at + 0.35, end - 0.18, end);
   const rise = (1 - outExpo(p(t, cue.at, cue.at + 0.45))) * 18;
   const side = Math.round(width * 0.083);

   return (
      <div
         style={{
            position: 'absolute',
            left: side,
            right: side,
            bottom,
            padding: '18px 28px',
            borderRadius: 28,
            background:
               'linear-gradient(180deg, rgba(6,9,14,0) 0%, rgba(6,9,14,0.72) 18%, rgba(6,9,14,0.72) 82%, rgba(6,9,14,0) 100%)',
            textAlign: 'center',
            fontFamily,
            fontWeight: 700,
            fontSize: 38,
            lineHeight: 1.22,
            color: ink,
            textWrap: 'balance',
            textShadow: '0 6px 30px rgba(0,0,0,0.75)',
            opacity: clamp(vis),
            transform: `translate3d(0, ${rise}px, 0)`,
         }}
      >
         {cue.text}
      </div>
   );
}
