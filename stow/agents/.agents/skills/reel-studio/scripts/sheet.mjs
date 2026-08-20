// Contact sheet + cover + optional 4:5 cut for a rendered reel. The sheet is
// the thing the agent LOOKS at before claiming a render is done: twelve evenly
// spaced frames, 4x3, in one jpg.
//
//   node scripts/sheet.mjs out/v3/hook.mp4 [--feed-cut] [--frames 12]
//
//   → out/v3/hook.sheet.jpg      4x3 tile of evenly spaced frames
//   → out/v3/hook.cover.jpg      the frame at 1.2s (thumbnail candidate)
//   → out/v3/hook.feed.mp4       1080x1350 letterboxed cut (only with --feed-cut)
//
// ffmpeg on PATH; no other deps.

import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { probe, run } from './qa.mjs';

const COVER_AT_S = 1.2;
const TILE_W = 270; // per-cell width; 4 across = 1080 wide sheet
const COLS = 4;
const ROWS = 3;
const FEED_W = 1080;
const FEED_H = 1350;

function stripExt(file) {
   return file.replace(/\.mp4$/, '');
}

async function ff(args) {
   const r = await run('ffmpeg', ['-v', 'error', '-y', ...args]);
   if (r.code !== 0) throw new Error(`ffmpeg failed: ${r.stderr.slice(-600)}`);
}

export async function makeSheet(file, { frames = COLS * ROWS } = {}) {
   const abs = resolve(file);
   const meta = await probe(abs);
   const out = `${stripExt(abs)}.sheet.jpg`;
   // Evenly spaced by frame index; the last cell is the final frame, which is
   // the frame the viewer sees longest when a platform pauses on the end.
   const step = Math.max(1, (meta.frames - 1) / (frames - 1));
   const picks = Array.from({ length: frames }, (_, i) => Math.min(meta.frames - 1, Math.round(i * step)));
   const select = picks.map(n => `eq(n\\,${n})`).join('+');
   const cols = COLS;
   const rows = Math.ceil(frames / cols);
   await ff([
      '-i', abs,
      '-vf', `select='${select}',scale=${TILE_W}:-2,tile=${cols}x${rows}:padding=4:margin=4:color=0x202020`,
      '-frames:v', '1', '-q:v', '3', out,
   ]);
   return out;
}

export async function makeCover(file, { at = COVER_AT_S } = {}) {
   const abs = resolve(file);
   const meta = await probe(abs);
   const t = Math.min(at, Math.max(0, meta.duration - 1 / (meta.fps || 30)));
   const out = `${stripExt(abs)}.cover.jpg`;
   await ff(['-ss', t.toFixed(3), '-i', abs, '-frames:v', '1', '-q:v', '2', out]);
   return out;
}

// 4:5 feed cut: the 9:16 reel scaled to fit inside 1080x1350 and padded with
// the surface colour. Pillarboxed, not cropped — the captions live at the
// bottom of the 9:16 frame and cropping would cut them.
export async function makeFeedCut(file, { color = 'black' } = {}) {
   const abs = resolve(file);
   const out = `${stripExt(abs)}.feed.mp4`;
   await ff([
      '-i', abs,
      '-vf', `scale=${FEED_W}:${FEED_H}:force_original_aspect_ratio=decrease,pad=${FEED_W}:${FEED_H}:(ow-iw)/2:(oh-ih)/2:color=${color},setsar=1`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-profile:v', 'high', '-level', '4.2', '-movflags', '+faststart', '-an',
      out,
   ]);
   return out;
}

export async function sheet(file, { feedCut = false, frames = COLS * ROWS, padColor = 'black' } = {}) {
   const outputs = { sheet: await makeSheet(file, { frames }), cover: await makeCover(file) };
   if (feedCut) outputs.feed = await makeFeedCut(file, { color: padColor });
   return outputs;
}

// realpath both sides: ~/.claude/skills is often a symlink (dotfiles/stow).
const isMain = process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
   const argv = process.argv.slice(2);
   const target = argv.find(a => !a.startsWith('--'));
   const flag = k => {
      const i = argv.indexOf(`--${k}`);
      if (i === -1) return undefined;
      const v = argv[i + 1];
      return v && !v.startsWith('--') ? v : true;
   };
   if (!target || !existsSync(target)) {
      console.error('usage: node scripts/sheet.mjs <mp4 | out/vN> [--feed-cut] [--frames 12] [--pad #0B0B0F]');
      process.exit(2);
   }
   const abs = resolve(target);
   const files = statSync(abs).isDirectory()
      ? readdirSync(abs).filter(f => f.endsWith('.mp4') && !f.endsWith('.feed.mp4')).sort().map(f => join(abs, f))
      : [abs];
   const frames = Number(flag('frames')) || COLS * ROWS;
   const padColor = typeof flag('pad') === 'string' ? flag('pad').replace(/^#/, '0x') : 'black';
   for (const f of files) {
      const o = await sheet(f, { feedCut: !!flag('feed-cut'), frames, padColor });
      console.log(`${basename(f)}\n  → ${basename(o.sheet)}\n  → ${basename(o.cover)}${o.feed ? `\n  → ${basename(o.feed)}` : ''}`);
   }

}
