// Brand fonts by @remotion/google-fonts import name ('BricolageGrotesque').
// The name comes from the spec, so the subpath cannot be a static import;
// getAvailableFonts() exposes the same lazy loaders by importName.

import { getAvailableFonts } from '@remotion/google-fonts';
import { cancelRender, continueRender, delayRender } from 'remotion';

const loaded = new Map<string, Promise<string>>();

// Resolves to the CSS font-family. Wraps the load in delayRender so a frame is
// never captured with a fallback face.
export function loadBrandFont(importName: string, weights: string[] = ['600', '700', '800']): Promise<string> {
   const cached = loaded.get(importName);

   if (cached) return cached;

   const entry = getAvailableFonts().find(f => f.importName === importName);

   if (!entry) {
      return Promise.reject(new Error(`unknown google font import name "${importName}"`));
   }

   const handle = delayRender(`font ${importName}`);
   const promise = entry
      .load()
      .then(mod => {
         const { fontFamily, waitUntilDone } = mod.loadFont('normal', { weights, subsets: ['latin'] });

         return waitUntilDone().then(() => fontFamily);
      })
      .then(family => {
         continueRender(handle);

         return family;
      })
      .catch((err: unknown) => {
         cancelRender(err);

         throw err;
      });

   loaded.set(importName, promise);

   return promise;
}
