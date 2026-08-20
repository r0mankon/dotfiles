// Registers one 9:16 composition per reel in reels.json, plus a 1080x1350
// feed variant (same spec, letterbox handled by the render script's --feed
// path using this composition's own framing).

import type React from 'react';
import { Composition } from 'remotion';
// reels.json is created per project (copy reels.example.json); the JSON
// import needs resolveJsonModule and a loose cast either way.
import reels from './reels.json' with { type: 'json' };
import { ReelFromSpec, reelDurationInFrames } from './ReelFromSpec';
import { FPS, type ReelSpec } from './spec';

const specs = reels as unknown as ReelSpec[];

export function Root() {
   return (
      <>
         {specs.map(spec => (
            <Composition
               key={spec.id}
               id={spec.id}
               component={ReelFromSpec as unknown as React.FC<Record<string, unknown>>}
               durationInFrames={reelDurationInFrames(spec, FPS)}
               fps={FPS}
               width={1080}
               height={1920}
               defaultProps={spec}
            />
         ))}
         {specs.map(spec => (
            <Composition
               key={`${spec.id}-feed`}
               id={`${spec.id}-feed`}
               component={ReelFromSpec as unknown as React.FC<Record<string, unknown>>}
               durationInFrames={reelDurationInFrames(spec, FPS)}
               fps={FPS}
               width={1080}
               height={1350}
               defaultProps={spec}
            />
         ))}
      </>
   );
}
