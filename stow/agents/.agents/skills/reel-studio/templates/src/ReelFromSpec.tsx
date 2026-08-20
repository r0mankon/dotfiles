// Renders one ReelSpec: hook → beats → CTA inside a TransitionSeries, with the
// spec's single grammar on every cut and its single opener on the hook. All
// motion derives from useCurrentFrame — no wall clock anywhere.

import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries } from '@remotion/transitions';
import { CameraMotionBlur } from '@remotion/motion-blur';
import type { ReactNode } from 'react';
import type { Beat, ChipsBeat, LockBeat, PlateBeat, ReelSpec } from './spec';
import { CTA_SECONDS, HOOK_SECONDS } from './spec';
import { Caption } from './lib/Caption';
import { Cta } from './lib/Cta';
import { Device } from './lib/Device';
import { grammarFor, Opener } from './lib/motion';
import { band, clamp, lerp, outExpo, p, rnd, springEase } from './lib/ease';
import { useBrandFonts } from './lib/useBrandFonts';

export function reelDurationInFrames(spec: ReelSpec, fps: number): number {
   if (spec.duration) return Math.round(spec.duration * fps);

   const g = grammarFor(spec.grammar, fps);
   const hook = Math.round((spec.hook.seconds ?? HOOK_SECONDS) * fps);
   const beats = spec.beats.reduce((n, b) => n + Math.round(b.seconds * fps), 0);
   const cta = Math.round((spec.cta.seconds ?? CTA_SECONDS) * fps);
   const cuts = spec.beats.length + 1;

   return hook + beats + cta - cuts * g.durationInFrames;
}

export function ReelFromSpec(spec: ReelSpec) {
   const { fps } = useVideoConfig();
   const g = grammarFor(spec.grammar, fps);
   const fonts = useBrandFonts(spec.brand.font);
   const gradient = `linear-gradient(100deg, ${spec.brand.accent}, ${spec.brand.accent2})`;

   const wrap = (node: ReactNode) =>
      g.motionBlur ? <CameraMotionBlur shutterAngle={140} samples={4}>{node}</CameraMotionBlur> : node;

   return (
      <AbsoluteFill style={{ background: spec.brand.surface, fontFamily: fonts.body }}>
         <Backdrop accent={spec.brand.accent} accent2={spec.brand.accent2} />

         <TransitionSeries>
            <TransitionSeries.Sequence
               durationInFrames={Math.round((spec.hook.seconds ?? HOOK_SECONDS) * fps)}
            >
               {wrap(
                  <HookCard
                     spec={spec}
                     display={fonts.display}
                     gradient={gradient}
                     punch={g.punch}
                  />,
               )}
            </TransitionSeries.Sequence>

            {spec.beats.map((beat, i) => (
               // A spec is static data for the whole render; index keys are safe.
               // eslint-disable-next-line react/no-array-index-key
               <TransitionSeries.Sequence
                  key={`beat-${i}`}
                  durationInFrames={Math.round(beat.seconds * fps)}
               >
                  {wrap(<BeatCard beat={beat} spec={spec} fonts={fonts} punch={g.punch} />)}
               </TransitionSeries.Sequence>
            )).flatMap((seq, i) => [
               <TransitionSeries.Transition
                  // eslint-disable-next-line react/no-array-index-key
                  key={`cut-${i}`}
                  presentation={g.presentation}
                  timing={g.timing}
               />,
               seq,
            ]) as never}

            <TransitionSeries.Transition presentation={g.presentation} timing={g.timing} />
            <TransitionSeries.Sequence
               durationInFrames={Math.round((spec.cta.seconds ?? CTA_SECONDS) * fps)}
            >
               <Cta brand={spec.brand} cta={spec.cta} fonts={fonts} />
            </TransitionSeries.Sequence>
         </TransitionSeries>

         <Grain />
         <Vignette />
      </AbsoluteFill>
   );
}

// ------------------------------------------------------------------- hook

function HookCard(props: { spec: ReelSpec; display: string; gradient: string; punch: number }) {
   const { spec, display, gradient, punch } = props;
   const frame = useCurrentFrame();
   const { fps } = useVideoConfig();
   const t = frame / fps;
   // Opener starts at a negative time so frame 0 is already mid-motion.
   const startFrame = Math.round(-0.25 * fps);
   const kick = 1 + punch * (1 - outExpo(clamp(t / 0.25)));

   return (
      <AbsoluteFill
         style={{
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            gap: 26,
            padding: '0 80px',
            transform: `scale(${kick})`,
         }}
      >
         {spec.hook.kicker ? (
            <div
               style={{
                  fontFamily: display,
                  fontWeight: 800,
                  fontSize: 34,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: spec.brand.accent,
                  opacity: band(t, -0.2, 0.15, 98, 99),
               }}
            >
               {spec.hook.kicker}
            </div>
         ) : null}
         {spec.hook.lines.map((line, i) => (
            <Opener
               // eslint-disable-next-line react/no-array-index-key
               key={i}
               text={line}
               kind={spec.opener}
               at={startFrame + Math.round(i * 0.9 * fps)}
               gradient={gradient}
               style={{
                  fontFamily: display,
                  fontWeight: 800,
                  fontSize: i === 0 ? 108 : 64,
                  lineHeight: 1.02,
                  letterSpacing: '-0.03em',
                  textAlign: 'center',
                  color: '#fff',
                  textWrap: 'balance',
               }}
            />
         ))}
      </AbsoluteFill>
   );
}

// ------------------------------------------------------------------- beats

function BeatCard(props: {
   beat: Beat;
   spec: ReelSpec;
   fonts: { display: string; body: string };
   punch: number;
}) {
   const { beat, spec, fonts, punch } = props;
   const frame = useCurrentFrame();
   const { fps } = useVideoConfig();
   const t = frame / fps;
   const kick = 1 + punch * (1 - outExpo(clamp(t / 0.25)));

   if (beat.kind === 'plate') return <PlateCard beat={beat} fonts={fonts} kick={kick} />;
   if (beat.kind === 'chips') return <ChipsCard beat={beat} spec={spec} fonts={fonts} kick={kick} />;

   return <LockCard beat={beat} spec={spec} fonts={fonts} kick={kick} />;
}

function PlateCard(props: {
   beat: PlateBeat;
   fonts: { display: string; body: string };
   kick: number;
}) {
   const { beat, fonts, kick } = props;
   const frame = useCurrentFrame();
   const { fps } = useVideoConfig();
   const t = frame / fps;
   // Slow push across the shot so the device never sits still, arriving with a
   // settle rather than a bottom-rise (grammar owns the cut itself).
   const scale =
      (beat.deviceScale ?? 1.5) * lerp(1, 1.05, clamp(t / Math.max(1, beat.seconds))) * kick;

   return (
      <AbsoluteFill>
         <Device
            plate={beat.plate}
            plateOffsetSeconds={beat.plateOffset ?? 0}
            scale={scale}
            y={-66}
         />
         {beat.captions?.length ? (
            <Caption schedule={beat.captions} fontFamily={fonts.body} outAt={beat.seconds - 0.15} />
         ) : null}
      </AbsoluteFill>
   );
}

function ChipsCard(props: {
   beat: ChipsBeat;
   spec: ReelSpec;
   fonts: { display: string; body: string };
   kick: number;
}) {
   const { beat, spec, fonts, kick } = props;
   const frame = useCurrentFrame();
   const { fps } = useVideoConfig();
   const t = frame / fps;

   return (
      <AbsoluteFill
         style={{
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            gap: 30,
            transform: `scale(${kick})`,
         }}
      >
         {/* Scrim so the chips never fight a bright backdrop. */}
         <AbsoluteFill
            style={{
               background:
                  'radial-gradient(70% 45% at 50% 52%, rgba(6,9,14,0.92) 0%, rgba(6,9,14,0.7) 55%, transparent 100%)',
            }}
         />
         {beat.kicker ? (
            <div
               style={{
                  position: 'relative',
                  fontFamily: fonts.body,
                  fontWeight: 800,
                  fontSize: 30,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: spec.brand.accent,
                  opacity: clamp(p(t, 0.1, 0.35)),
               }}
            >
               {beat.kicker}
            </div>
         ) : null}
         {beat.items.map((item, i) => {
            const k = springEase(p(t, 0.25 + i * 0.3, 0.95 + i * 0.3), 2.6, 7);

            return (
               <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  style={{
                     position: 'relative',
                     fontFamily: fonts.body,
                     fontWeight: 700,
                     fontSize: 46,
                     color: '#fff',
                     padding: '22px 46px',
                     borderRadius: 16,
                     background: 'rgba(10, 14, 22, 0.88)',
                     border: `1px solid ${spec.brand.accent}59`,
                     boxShadow: '0 18px 40px -14px rgba(0,0,0,0.8)',
                     opacity: clamp(p(t, 0.25 + i * 0.3, 0.45 + i * 0.3)),
                     transform: `translateY(${(1 - k) * 44}px) scale(${lerp(0.85, 1, k)})`,
                  }}
               >
                  {item}
               </div>
            );
         })}
      </AbsoluteFill>
   );
}

function LockCard(props: {
   beat: LockBeat;
   spec: ReelSpec;
   fonts: { display: string; body: string };
   kick: number;
}) {
   const { beat, spec, fonts, kick } = props;
   const frame = useCurrentFrame();
   const { fps } = useVideoConfig();
   const t = frame / fps;
   // The push notification JUMPS in — never a typewriter.
   const pushAt = 0.7;
   const pk = springEase(p(t, pushAt, pushAt + 0.55), 2.4, 6.5);

   return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
         <Device scale={1.45 * kick} y={-66}>
            <div
               style={{
                  position: 'absolute',
                  inset: 0,
                  background: `radial-gradient(120% 80% at 25% 8%, ${spec.brand.accent}26 0%, ${spec.brand.surface} 58%)`,
               }}
            />
            <div
               style={{
                  position: 'absolute',
                  top: 118,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  fontFamily: fonts.body,
                  fontSize: 17,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.6)',
               }}
            >
               {beat.date ?? ''}
            </div>
            <div
               style={{
                  position: 'absolute',
                  top: 146,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  fontFamily: fonts.body,
                  fontWeight: 700,
                  fontSize: 78,
                  letterSpacing: '-0.02em',
                  color: '#fff',
               }}
            >
               {beat.time ?? '9:41'}
            </div>
            <div
               style={{
                  position: 'absolute',
                  left: 14,
                  right: 14,
                  top: 282,
                  display: 'flex',
                  gap: 12,
                  padding: '15px 16px',
                  borderRadius: 26,
                  background: 'rgba(28,35,48,0.9)',
                  boxShadow: '0 24px 60px -14px rgba(0,0,0,0.8)',
                  opacity: t < pushAt ? 0 : 1,
                  transform: `translateY(${(1 - pk) * -18}px) scale(${lerp(0.94, 1, pk)})`,
               }}
            >
               <Img
                  src={staticFile(spec.brand.logo)}
                  style={{ width: 38, height: 38, borderRadius: 10 }}
               />
               <div style={{ fontFamily: fonts.body }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{beat.pushTitle}</div>
                  <div style={{ fontSize: 15, marginTop: 2, color: 'rgba(255,255,255,0.85)' }}>
                     {beat.pushBody}
                  </div>
               </div>
               <div
                  style={{
                     position: 'absolute',
                     right: 16,
                     top: 15,
                     fontSize: 13,
                     color: 'rgba(255,255,255,0.5)',
                  }}
               >
                  now
               </div>
            </div>
         </Device>
         {beat.caption ? (
            <Caption
               schedule={[{ at: pushAt + 0.5, text: beat.caption }]}
               fontFamily={fonts.body}
               outAt={beat.seconds - 0.15}
            />
         ) : null}
      </AbsoluteFill>
   );
}

// -------------------------------------------------------------- atmosphere

function Backdrop(props: { accent: string; accent2: string }) {
   const { accent, accent2 } = props;
   const frame = useCurrentFrame();
   const { fps } = useVideoConfig();
   const t = frame / fps;

   return (
      <AbsoluteFill>
         <div
            style={{
               position: 'absolute',
               width: 880,
               height: 880,
               left: -180,
               top: 170,
               borderRadius: 999,
               background: accent,
               opacity: 0.16,
               filter: 'blur(140px)',
               transform: `translate3d(${Math.sin(t * 0.46) * 62}px, ${t * 12}px, 0)`,
            }}
         />
         <div
            style={{
               position: 'absolute',
               width: 860,
               height: 860,
               right: -220,
               bottom: 70,
               borderRadius: 999,
               background: accent2,
               opacity: 0.16,
               filter: 'blur(140px)',
               transform: `translate3d(${Math.cos(t * 0.39) * 72}px, ${-t * 10}px, 0)`,
            }}
         />
      </AbsoluteFill>
   );
}

function Grain() {
   const frame = useCurrentFrame();
   // Deterministic drift: same frame → same offset.
   const x = (frame * 4.57) % 60;
   const y = (frame * 3.03) % 60;

   return (
      <AbsoluteFill
         style={{
            inset: '-50%',
            width: '200%',
            height: '200%',
            opacity: 0.055,
            mixBlendMode: 'overlay',
            transform: `translate3d(${x}px, ${y}px, 0)`,
            backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3"/></filter><rect width="220" height="220" filter="url(%23n)"/></svg>')`,
            pointerEvents: 'none',
         }}
      />
   );
}

function Vignette() {
   // Static — declared once so rnd() stays unused-import-free elsewhere.
   void rnd;

   return (
      <AbsoluteFill
         style={{
            pointerEvents: 'none',
            background:
               'radial-gradient(ellipse 70% 60% at 50% 45%, transparent 40%, rgba(0,0,0,0.55) 100%)',
         }}
      />
   );
}
