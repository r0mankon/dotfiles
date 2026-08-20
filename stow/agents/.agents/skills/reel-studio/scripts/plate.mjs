#!/usr/bin/env node
// Plate recorder: opens the REAL product at phone size, drives it frame by
// frame, and writes a numbered PNG sequence + an mp4 + a contact sheet that
// the Remotion compositions put inside the phone mock.
//
//   node scripts/plate.mjs <plateName> [--config reel-studio.config.json]
//                                      [--plates plates.mjs] [--out plates/]
//
// Why plates instead of an iframe inside the composition: production apps send
// `frame-ancestors 'none'`, and Remotion refuses live iframes anyway (only
// useCurrentFrame-driven animation is deterministic). Loading each page
// top-level in its own pass sidesteps both, keeps the session cookie
// first-party, and a slow app frame costs plate time, not timeline accuracy.
//
// Deterministic drive: for frame i, call drive(t = i / fps) in the page, wait
// two rAFs so React has committed and the compositor has painted, screenshot.
// Drivers must be pure in t except deliberate one-shot side effects guarded by
// a window flag (see templates/plates.example.mjs).

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

class PlateError extends Error {}

let puppeteer = null;

const DEFAULT_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FREEZE_ID = 's4r-freeze';
const SETTLE_MS = 1200;

let browser = null;
let config = {};
let configDir = '.';
let outRoot = '';

try {
   await main();
} catch (err) {
   await browser?.close().catch(() => {});

   if (err instanceof PlateError) {
      console.error(`\nplate: ${err.message}`);
      process.exit(1);
   }

   throw err;
}

async function main() {
   puppeteer = await loadPuppeteer();

   const argv = process.argv.slice(2);
   const name = argv.find(a => !a.startsWith('--'));
   const flag = (k, d) => {
      const i = argv.indexOf(`--${k}`);

      return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
   };

   const configPath = resolve(flag('config', 'reel-studio.config.json'));
   const platesPath = resolve(flag('plates', 'plates.mjs'));

   if (!existsSync(configPath)) fail(`config not found: ${configPath}`);
   if (!existsSync(platesPath)) fail(`plate map not found: ${platesPath}`);

   config = JSON.parse(readFileSync(configPath, 'utf8'));
   configDir = dirname(configPath);
   const baseUrl = (config.baseUrl || '').replace(/\/$/, '');

   if (!baseUrl) fail(`config.baseUrl is required (${configPath})`);

   // Plates land in Remotion's public dir so staticFile('plates/<name>/…')
   // resolves without copying.
   outRoot = resolve(flag('out', join(configDir, 'public', 'plates')));

   const plateMap = (await import(pathToFileURL(platesPath).href)).default;

   if (!plateMap || typeof plateMap !== 'object') fail(`${platesPath} must default-export { [name]: PlateSpec }`);

   if (!name || !plateMap[name]) {
      fail(`unknown plate "${name ?? ''}". known: ${Object.keys(plateMap).join(', ')}`);
   }

   const spec = normalise(name, plateMap[name]);
   const url = spec.url.startsWith('http') ? spec.url : `${baseUrl}${spec.url.startsWith('/') ? '' : '/'}${spec.url}`;
   const dir = join(outRoot, name);
   const mp4Path = join(outRoot, `${name}.mp4`);
   const sheetPath = join(outRoot, `${name}.sheet.jpg`);

   rmSync(dir, { recursive: true, force: true });
   mkdirSync(dir, { recursive: true });

   // ---------------------------------------------------------------- browser

   browser = await puppeteer.launch({
      executablePath: config.chromePath || DEFAULT_CHROME,
      headless: 'shell',
      args: ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb', '--disable-lcd-text'],
      defaultViewport: {
         width: spec.viewport.w,
         height: spec.viewport.h,
         deviceScaleFactor: spec.viewport.scale,
      },
   });

   if (spec.auth === 'session') await installSession(browser);

   const page = await browser.newPage();
   await page.goto(url, { waitUntil: 'networkidle0', timeout: 90_000 });
   await page.evaluate(() => document.fonts.ready);

   // Collapse the app's own transitions and animations so every state change
   // lands on its END state in the next frame. Pausing them instead leaves
   // things stuck at 0% opacity — invisible for the whole shot.
   await page.addStyleTag({
      id: FREEZE_ID,
      content: `
         *, *::before, *::after {
            transition: none !important;
            animation-duration: 1ms !important;
            animation-delay: 0s !important;
            animation-iteration-count: 1 !important;
            caret-color: transparent !important;
         }
         ::-webkit-scrollbar { display: none; }
      `,
   });
   await sleep(SETTLE_MS);

   const hideSerialised = serialiseHide(spec.hide);
   const forbidSerialised = serialiseHide(spec.forbidOnLastFrame);

   await page.evaluate(stripPage, hideSerialised);

   // Per-plate setup that must be true for every frame (toggle demo data,
   // open a drawer, scroll to the section) — happens before the clock starts.
   if (spec.settle) await spec.settle(page);

   await page.evaluate(stripPage, hideSerialised);

   const total = Math.round(spec.seconds * spec.fps);
   const drive = await page.evaluateHandle(`(${spec.drive})`);

   console.log(`plate ${name}: ${spec.seconds}s @ ${spec.fps}fps = ${total} frames  ${url}`);

   let unfrozen = false;
   let lastSafeFrame = -1;
   let holdFrom = -1;
   const started = Date.now();

   for (let i = 0; i < total; i++) {
      const t = i / spec.fps;

      // Some beats ARE the app's own animation. Dropping the freeze lets the
      // real thing play across the captured frames instead of landing as a cut.
      if (spec.unfreezeAt !== undefined && !unfrozen && t >= spec.unfreezeAt) {
         unfrozen = true;
         await page.evaluate(id => document.getElementById(id)?.remove(), FREEZE_ID);
      }

      if (holdFrom === -1) {
         await page.evaluate((fn, time) => fn(time), drive, t);
         await page.evaluate(stripPage, hideSerialised);
         await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

         // holdSafe: the moment a forbidden screen appears, stop advancing the
         // app and repeat the last clean frame for the rest of the plate.
         if (spec.endOnFrame === 'holdSafe' && forbidSerialised.length) {
            const hit = await page.evaluate(findForbidden, forbidSerialised);

            if (hit) {
               if (lastSafeFrame < 0) fail(`plate ${name}: forbidden text "${hit}" visible on frame 0 — nothing safe to hold`);

               holdFrom = i;
               console.log(`\n  holdSafe: "${hit}" appeared at frame ${i} (t=${t.toFixed(2)}s); holding frame ${lastSafeFrame}`);
            }
         }
      }

      if (holdFrom === -1) {
         const buf = await page.screenshot({ type: 'png', optimizeForSpeed: true });
         writeFileSync(framePath(dir, i), buf);
         lastSafeFrame = i;
      } else {
         writeFileSync(framePath(dir, i), readFileSync(framePath(dir, lastSafeFrame)));
      }

      if (i % 15 === 0 || i === total - 1) {
         const rate = (i + 1) / ((Date.now() - started) / 1000);
         process.stdout.write(`\r  ${i + 1}/${total}  ${rate.toFixed(1)} fps  `);
      }
   }

   process.stdout.write('\n');

   // The last frame is what the viewer sees longest — compositions hold on it.
   if (forbidSerialised.length && holdFrom === -1) {
      const hit = await page.evaluate(findForbidden, forbidSerialised);

      if (hit) {
         fail(
            `plate ${name}: forbidden text "${hit}" is visible on the LAST frame.\n` +
               `  Shorten \`seconds\`, move the action later, or set endOnFrame: 'holdSafe'.`,
         );
      }
   }

   writeFileSync(
      join(dir, 'meta.json'),
      JSON.stringify(
         { name, fps: spec.fps, frames: total, w: spec.viewport.w * spec.viewport.scale, h: spec.viewport.h * spec.viewport.scale },
         null,
         2,
      ),
   );

   await browser.close();

   encodeMp4(dir, spec.fps, mp4Path);
   writeSheet(dir, total, sheetPath);

   console.log(`  → ${dir}/ (${total} frames)`);
   console.log(`  → ${mp4Path}`);
   console.log(`  → sheet: ${sheetPath}   (look at it before compositing)`);
}

// ---------------------------------------------------------------- helpers

function normalise(plateName, raw) {
   const s = { ...raw };

   if (!s.url) fail(`plate "${plateName}": url is required`);
   if (!s.seconds || s.seconds <= 0) fail(`plate "${plateName}": seconds must be > 0`);
   if (!s.drive) fail(`plate "${plateName}": drive is required`);

   s.fps = s.fps || 30;
   s.auth = s.auth || 'none';
   s.viewport = { w: 390, h: 844, scale: 2, ...(s.viewport || {}) };
   s.hide = s.hide || [];
   s.forbidOnLastFrame = s.forbidOnLastFrame || [];
   s.endOnFrame = s.endOnFrame || 'last';
   s.drive = typeof s.drive === 'function' ? s.drive.toString() : String(s.drive);

   if (!['session', 'none'].includes(s.auth)) fail(`plate "${plateName}": auth must be 'session' | 'none'`);
   if (!['last', 'holdSafe'].includes(s.endOnFrame)) fail(`plate "${plateName}": endOnFrame must be 'last' | 'holdSafe'`);

   return s;
}

// session.json { name, value } is minted OUT of band (a row in the app's
// sessions table, signed with the app's own secret). reel-studio never mints
// sessions itself — see the skill's session how-to.
async function installSession(b) {
   const candidates = [
      config.auth?.sessionJson ? resolve(configDir, config.auth.sessionJson) : null,
      join(outRoot, 'session.json'),
   ].filter(Boolean);
   const file = candidates.find(p => existsSync(p));

   if (!file) fail(`auth: 'session' but no session.json found. Looked in:\n  ${candidates.join('\n  ')}`);

   const s = JSON.parse(readFileSync(file, 'utf8'));
   const cookieName = s.name || config.auth?.cookieName;

   if (!cookieName || !s.value) fail(`${file} must hold { name, value }`);

   const target = new URL(baseUrl);
   const https = target.protocol === 'https:';

   await b.setCookie({
      name: cookieName,
      value: s.value,
      domain: target.hostname,
      path: '/',
      httpOnly: true,
      // First-party top-level load, so Lax is enough over http. Over https the
      // app's own cookie is usually Secure; match it so the browser keeps it.
      ...(https ? { secure: true, sameSite: 'None' } : {}),
   });
}

// hide / forbidOnLastFrame entries: CSS selector strings, RegExp objects, or
// '/pattern/flags' strings. Serialised so they survive the trip into the page.
function serialiseHide(list) {
   return list.map(entry => {
      if (entry instanceof RegExp) return { re: entry.source, flags: entry.flags };

      const m = typeof entry === 'string' && entry.match(/^\/(.+)\/([a-z]*)$/);

      if (m) return { re: m[1], flags: m[2] };

      return { sel: String(entry) };
   });
}

// Runs in the page. Strips dev overlays, then every hide entry: selectors hide
// the matched element, regexes hide the closest block around the innermost
// element whose innerText matches (capped so a body-wide match never fires).
function stripPage(entries) {
   for (const el of document.querySelectorAll('*')) {
      if (el.tagName.toLowerCase().startsWith('nextjs-')) el.style.display = 'none';
   }
   for (const el of document.querySelectorAll('[data-nextjs-toast], nextjs-portal, #__next-build-watcher')) {
      el.style.display = 'none';
   }

   const blockOf = el => {
      let cur = el;
      while (cur && cur !== document.body) {
         const d = getComputedStyle(cur).display;
         if (d && !d.startsWith('inline') && d !== 'contents') return cur;
         cur = cur.parentElement;
      }

      return el;
   };

   for (const e of entries) {
      if (e.sel) {
         for (const el of document.querySelectorAll(e.sel)) el.style.display = 'none';
         continue;
      }

      const re = new RegExp(e.re, e.flags.replace('g', ''));
      for (const el of document.body.querySelectorAll('*')) {
         if (el.style.display === 'none') continue;
         const txt = (el.innerText || '').trim();
         if (!txt || txt.length > 200 || !re.test(txt)) continue;
         const childMatches = [...el.children].some(c => re.test((c.innerText || '').trim()));
         if (childMatches) continue;
         blockOf(el).style.display = 'none';
      }
   }
}

// Runs in the page. Returns the first forbidden entry visible in body text.
function findForbidden(entries) {
   const text = document.body.innerText || '';
   for (const e of entries) {
      if (e.sel) {
         const el = document.querySelector(e.sel);
         if (el && el.getClientRects().length > 0) return e.sel;
         continue;
      }
      if (new RegExp(e.re, e.flags.replace('g', '')).test(text)) return `/${e.re}/${e.flags}`;
   }

   return null;
}

function encodeMp4(framesDir, fps, out) {
   // Odd dimensions break yuv420p; pad (never scale) so pixels stay exact.
   const r = ffmpeg([
      '-y', '-framerate', String(fps), '-i', join(framesDir, '%04d.png'),
      '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
      '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', out,
   ]);

   if (r.status !== 0) fail(`ffmpeg mp4 encode failed:\n${r.stderr}`);
}

// First / middle / last frame side by side — the three frames that decide
// whether the plate arrives mid-action and ends on a screen you want.
function writeSheet(framesDir, total, out) {
   const picks = [0, Math.floor((total - 1) / 2), total - 1].map(i => framePath(framesDir, i));
   const r = ffmpeg([
      '-y', '-i', picks[0], '-i', picks[1], '-i', picks[2],
      '-filter_complex', '[0][1][2]hstack=inputs=3,scale=-2:900',
      '-q:v', '3', out,
   ]);

   if (r.status !== 0) fail(`ffmpeg contact sheet failed:\n${r.stderr}`);
}

function ffmpeg(args) {
   return spawnSync(config.ffmpegPath || 'ffmpeg', args, { encoding: 'utf8' });
}

// The skill may live anywhere (symlinked dotfiles); resolve puppeteer-core
// from the skill first, then from the project being shot.
async function loadPuppeteer() {
   try {
      return (await import('puppeteer-core')).default;
   } catch {
      const req = createRequire(join(process.cwd(), 'package.json'));

      try {
         return (await import(pathToFileURL(req.resolve('puppeteer-core')).href)).default;
      } catch (e) {
         fail(`puppeteer-core not found (${e.message}) — install it in the skill dir or in the project (pnpm add -D puppeteer-core)`);
      }
   }
}

function framePath(d, i) {
   return join(d, `${String(i).padStart(4, '0')}.png`);
}

function sleep(ms) {
   return new Promise(r => setTimeout(r, ms));
}

function fail(msg) {
   throw new PlateError(msg);
}
