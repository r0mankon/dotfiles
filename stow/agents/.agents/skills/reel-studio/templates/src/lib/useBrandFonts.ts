import { useEffect, useState } from 'react';
import type { BrandFont } from '../spec';
import { loadBrandFont } from './fonts';

export interface FontFamilies {
   display: string;
   body: string;
}

// Families fall back to the import name until the files arrive; the render is
// held by delayRender inside loadBrandFont, so no captured frame sees that.
export function useBrandFonts(font: BrandFont): FontFamilies {
   const [families, setFamilies] = useState<FontFamilies>({ display: font.display, body: font.body });

   useEffect(() => {
      let alive = true;

      Promise.all([loadBrandFont(font.display), loadBrandFont(font.body)]).then(([display, body]) => {
         if (alive) setFamilies({ display, body });
      });

      return () => {
         alive = false;
      };
   }, [font.display, font.body]);

   return families;
}
