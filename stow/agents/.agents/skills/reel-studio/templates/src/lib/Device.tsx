// A seamless phone slab — no status bar, notch or home indicator: at reel scale
// that chrome read as clutter and ate pixels the product needed. Renders a
// plate shot by plate.mjs, either the PNG sequence or its mp4.

import type { ReactNode } from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Video } from '@remotion/media';
import type { PlateRef } from '../spec';

export const DEVICE_W = 390;
export const DEVICE_H = 844;
export const DEVICE_RADIUS = 56;

interface Props {
   plate?: PlateRef;
   // Seconds into the plate's clock at which this sequence's frame 0 sits.
   plateOffsetSeconds?: number;
   // Plate fps if it differs from the composition's.
   plateFps?: number;
   scale?: number;
   x?: number;
   y?: number;
   rotate?: number;
   // Renders instead of a plate (lock screens, custom mocks).
   children?: ReactNode;
}

export function Device(props: Props) {
   const { plate, plateOffsetSeconds = 0, plateFps, scale = 1, x = 0, y = 0, rotate = 0, children } = props;
   const frame = useCurrentFrame();
   const { fps } = useVideoConfig();
   const pfps = plateFps ?? fps;

   return (
      <div
         style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: DEVICE_W,
            height: DEVICE_H,
            marginLeft: -DEVICE_W / 2,
            marginTop: -DEVICE_H / 2,
            transform: `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg) scale(${scale})`,
            borderRadius: DEVICE_RADIUS,
            background: '#000',
            boxShadow: '0 0 0 12px #1b1f27, 0 0 0 14px #2c313c, 0 60px 120px -20px rgba(0,0,0,0.9)',
            overflow: 'hidden',
         }}
      >
         {plate ? <Plate plate={plate} frame={frame} fps={fps} plateFps={pfps} offset={plateOffsetSeconds} /> : null}
         {children}
      </div>
   );
}

interface PlateProps {
   plate: PlateRef;
   frame: number;
   fps: number;
   plateFps: number;
   offset: number;
}

function Plate(props: PlateProps) {
   const { plate, frame, fps, plateFps, offset } = props;
   const screen = { width: DEVICE_W, height: DEVICE_H, display: 'block' } as const;

   if (plate.video) {
      // @ AI Context: mp4 mode is for the locked archive; while iterating use the
      // PNG sequence (holds and reverses are index math). trimBefore is in
      // composition frames.
      return (
         <Video
            src={staticFile(`plates/${plate.name}.mp4`)}
            trimBefore={Math.max(0, Math.round(offset * fps))}
            muted
            style={screen}
         />
      );
   }

   // Frames past the end hold on the last one: "the sent card stays up while the
   // caption plays". Missing `frames` means we trust the composition to be
   // shorter than the plate.
   const raw = Math.round((frame / fps + offset) * plateFps);
   const last = plate.frames ? plate.frames - 1 : Number.POSITIVE_INFINITY;
   const index = Math.max(0, Math.min(last, raw));

   return <Img src={staticFile(`plates/${plate.name}/${String(index).padStart(4, '0')}.png`)} style={screen} />;
}
