// End card: wordmark row, one sub line, the pill, the domain in real small-caps.
// Every reel ends here so the set reads as one campaign.

import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Brand, Cta as CtaSpec } from '../spec';
import { clamp, lerp, p, springEase } from './ease';
import type { FontFamilies } from './useBrandFonts';

interface Props {
   brand: Brand;
   cta: CtaSpec;
   fonts: FontFamilies;
}

export function Cta(props: Props) {
   const { brand, cta, fonts } = props;
   const frame = useCurrentFrame();
   const { fps } = useVideoConfig();
   const t = frame / fps;

   const [plain, grad] = brand.wordmark ?? [brand.name, ''];
   const gradient = `linear-gradient(100deg, ${brand.accent}, ${brand.accent2})`;
   const ink = brand.ink ?? '#fff';

   const enter = springEase(p(t, 0, 0.9), 2.2, 6);
   const pill = springEase(p(t, 0.35, 1.15), 2.6, 6);

   return (
      <div
         style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
            color: ink,
            transform: `translate3d(0, ${lerp(70, 0, enter)}px, 0) scale(${lerp(0.92, 1, enter)})`,
         }}
      >
         <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Img src={staticFile(brand.logo)} style={{ width: 110, height: 110, borderRadius: 26 }} />
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 84, letterSpacing: '-0.03em' }}>
               {plain}
               {grad ? (
                  <span
                     style={{
                        backgroundImage: gradient,
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent',
                     }}
                  >
                     {grad}
                  </span>
               ) : null}
            </div>
         </div>

         <div
            style={{
               maxWidth: 720,
               fontFamily: fonts.body,
               fontWeight: 600,
               fontSize: 44,
               lineHeight: 1.3,
               textAlign: 'center',
               color: 'rgba(255,255,255,0.62)',
               whiteSpace: 'pre-line',
               opacity: clamp(p(t, 0.25, 0.6)),
            }}
         >
            {cta.sub}
         </div>

         <div
            style={{
               display: 'inline-flex',
               alignItems: 'center',
               gap: 18,
               padding: '28px 56px',
               borderRadius: 999,
               fontFamily: fonts.body,
               fontWeight: 800,
               fontSize: 46,
               color: brand.surface,
               backgroundImage: gradient,
               boxShadow: `0 30px 80px -20px ${brand.accent}99`,
               transform: `scale(${lerp(0.8, 1, pill)})`,
            }}
         >
            {cta.pill}
         </div>

         <div
            style={{
               fontFamily: fonts.body,
               fontWeight: 800,
               fontSize: 30,
               letterSpacing: '0.12em',
               // Real small-caps: lowercase the string, then let the font (or
               // the synthesised fallback) raise it — not an uppercase fake.
               textTransform: 'lowercase',
               fontVariantCaps: 'small-caps',
               color: brand.accent,
               opacity: clamp(p(t, 0.6, 0.95)) * 0.85,
            }}
         >
            {cta.domain}
         </div>
      </div>
   );
}
