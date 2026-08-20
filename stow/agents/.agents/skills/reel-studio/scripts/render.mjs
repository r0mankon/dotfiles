#!/usr/bin/env node
// Renders one reel (or all) from the Remotion project in the current directory
// into a VERSIONED output folder — out/v1, out/v2, … — so a delivered set can
// never be overwritten by a re-render. After each render it runs qa.mjs and
// sheet.mjs automatically; a reel is not "done" until both have been looked at.
//
//   node scripts/render.mjs <reelId|all> [--feed] [--out out]
//
// --feed renders the 1080x1350 composition variant (`<id>-feed`).

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const args = process.argv.slice(2);
const target = args[0];
if (!target) {
   console.error('usage: node scripts/render.mjs <reelId|all> [--feed] [--out out]');
   process.exit(1);
}

const feed = args.includes('--feed');
const outFlag = args.indexOf('--out');
const outRoot = outFlag > -1 ? args[outFlag + 1] : 'out';

const reelsPath = path.resolve('src/reels.json');
if (!existsSync(reelsPath)) {
   console.error('src/reels.json not found — copy src/reels.example.json and edit it.');
   process.exit(1);
}
const specs = JSON.parse(readFileSync(reelsPath, 'utf8'));
const ids = target === 'all' ? specs.map(s => s.id) : [target];

for (const id of ids) {
   if (!specs.some(s => s.id === id)) {
      console.error(`unknown reel id "${id}" — reels.json has: ${specs.map(s => s.id).join(', ')}`);
      process.exit(1);
   }
}

// Next unused version folder. LATEST is a plain text pointer, not a symlink,
// so it survives being committed or copied across filesystems.
mkdirSync(outRoot, { recursive: true });
const versions = readdirSync(outRoot)
   .map(d => /^v(\d+)$/.exec(d)?.[1])
   .filter(Boolean)
   .map(Number);
const v = `v${(versions.length ? Math.max(...versions) : 0) + 1}`;
const outDir = path.join(outRoot, v);
mkdirSync(outDir, { recursive: true });

console.log(`bundling… (output → ${outDir})`);
const serveUrl = await bundle({
   entryPoint: path.resolve('src/index.ts'),
   // Remotion's standard public dir: plates/ and brand/ live under public/ so
   // staticFile('plates/…') and staticFile('brand/…') resolve. Serving the
   // whole project dir instead silently fails to expose the assets.
   publicDir: path.resolve('public'),
});

const results = [];

for (const id of ids) {
   const compId = feed ? `${id}-feed` : id;
   const composition = await selectComposition({ serveUrl, id: compId });
   const outputLocation = path.join(outDir, `${compId}.mp4`);

   console.log(`rendering ${compId} (${composition.durationInFrames}f @ ${composition.fps}fps)…`);
   await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      crf: 18,
      pixelFormat: 'yuv420p',
      outputLocation,
      onProgress: ({ progress }) => {
         process.stdout.write(`\r  ${Math.round(progress * 100)}%   `);
      },
   });
   process.stdout.write('\n');

   // QA + contact sheet ride along on every render; failures surface here,
   // not after delivery.
   const qa = spawnSync(
      'node',
      [
         path.join(path.dirname(new URL(import.meta.url).pathname), 'qa.mjs'),
         outputLocation,
         '--spec',
         reelsPath,
         '--want',
         String(composition.durationInFrames / composition.fps),
         ...(feed ? ['--feed'] : []),
      ],
      { stdio: 'inherit' },
   );
   execFileSync('node', [
      path.join(path.dirname(new URL(import.meta.url).pathname), 'sheet.mjs'),
      outputLocation,
   ]);

   results.push({ id: compId, file: outputLocation, qa: qa.status === 0 ? 'PASS' : 'FAIL' });
}

writeFileSync(path.join(outRoot, 'LATEST'), `${v}\n`);

console.log(`\n${'reel'.padEnd(28)} qa    file`);
for (const r of results) {
   console.log(`${r.id.padEnd(28)} ${r.qa.padEnd(5)} ${r.file}`);
}
console.log(`\nversion: ${v} (out/LATEST updated)`);

if (results.some(r => r.qa === 'FAIL')) process.exit(1);
