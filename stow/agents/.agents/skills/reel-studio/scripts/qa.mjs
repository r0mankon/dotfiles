// Mechanical QA for a rendered reel. Catches the things that read as a broken
// upload before anyone has to watch the file: wrong geometry, an empty first
// frame (the thumbnail), black gaps, long freezes, text parked under the
// Instagram UI bands, and an oversized file.
//
//   node scripts/qa.mjs out/v3/hook.mp4 [--spec reels.json] [--feed]
//   node scripts/qa.mjs out/v3                # every mp4 in the folder
//
// Exit 1 on any FAIL. WARNs are judgement calls — read them, then decide.
// Everything here is ffmpeg/ffprobe on PATH plus node built-ins.

import { execFile } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REEL = { w: 1080, h: 1920 };
export const FEED = { w: 1080, h: 1350 };
export const FPS = 30;
export const MAX_BYTES = 30 * 1024 * 1024;

const BLACK_MIN_S = 0.12;
const FREEZE_MIN_S = 1.8;
const FIRST_FRAME_LUMA_FLOOR = 12;      // 0..255 mean; below this the thumbnail is a void
const FIRST_FRAME_EDGE_FLOOR = 1.5;     // mean |dx| over the frame; a flat wash scores ~0
const SAFE_TOP = 0.08;                  // IG username / audio chip band
const SAFE_BOTTOM = 0.14;               // IG caption / actions band
const SAFE_EDGE_THRESHOLD = 48;         // |dx| that counts as a text-like edge
const SAFE_EDGE_DENSITY = 0.035;        // fraction of band pixels over threshold → WARN
const SAMPLE_EVERY_S = 0.5;
const SAMPLE_W = 270;                   // analysis resolution; geometry is ratio-based so this is plenty

export function run(cmd, args, { stdin, maxBuffer = 512 * 1024 * 1024 } = {}) {
   return new Promise((res, rej) => {
      const child = execFile(cmd, args, { encoding: 'buffer', maxBuffer }, (err, stdout, stderr) => {
         if (err && err.code === 'ENOENT') return rej(new Error(`${cmd} not found on PATH`));
         res({ code: err ? err.code ?? 1 : 0, stdout, stderr: stderr.toString() });
      });
      if (stdin !== undefined) child.stdin.end(stdin);
   });
}

export async function probe(file) {
   const { stdout, code, stderr } = await run('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,r_frame_rate,avg_frame_rate,nb_frames,duration:format=duration,size',
      '-of', 'json',
      file,
   ]);
   if (code !== 0) throw new Error(`ffprobe failed: ${stderr.slice(-400)}`);
   const j = JSON.parse(stdout.toString());
   const s = j.streams?.[0] ?? {};
   const [num, den] = (s.avg_frame_rate || s.r_frame_rate || '0/1').split('/').map(Number);
   const duration = Number(s.duration ?? j.format?.duration ?? 0);
   const fps = den ? num / den : 0;
   return {
      width: s.width,
      height: s.height,
      fps,
      duration,
      frames: Number(s.nb_frames) || Math.round(duration * fps),
      bytes: Number(j.format?.size ?? statSync(file).size),
   };
}

// Decodes frames to 8-bit gray at SAMPLE_W wide; returns { w, h, frames: Buffer[] }.
async function grayFrames(file, vf) {
   const { stdout, code, stderr } = await run('ffmpeg', [
      '-v', 'error', '-i', file,
      '-vf', `${vf},scale=${SAMPLE_W}:-2,format=gray`,
      '-f', 'rawvideo', '-',
   ]);
   if (code !== 0) throw new Error(`ffmpeg decode failed: ${stderr.slice(-400)}`);
   const meta = await probe(file);
   const w = SAMPLE_W;
   const h = Math.round((meta.height / meta.width) * w / 2) * 2;
   const size = w * h;
   const frames = [];
   for (let o = 0; o + size <= stdout.length; o += size) frames.push(stdout.subarray(o, o + size));
   return { w, h, frames };
}

function meanLuma(buf) {
   let s = 0;
   for (let i = 0; i < buf.length; i++) s += buf[i];
   return s / buf.length;
}

// Horizontal gradient stats over rows [y0, y1): mean |dx| and the fraction of
// pixels whose |dx| clears `thr`. Dense high-contrast edges is what text looks
// like at this resolution; soft gradients and photos score low.
function edgeStats(buf, w, y0, y1, thr) {
   let sum = 0;
   let hot = 0;
   let n = 0;
   for (let y = y0; y < y1; y++) {
      const row = y * w;
      for (let x = 1; x < w; x++) {
         const d = Math.abs(buf[row + x] - buf[row + x - 1]);
         sum += d;
         if (d > thr) hot++;
         n++;
      }
   }
   return { mean: n ? sum / n : 0, density: n ? hot / n : 0 };
}

function parseBlack(stderr) {
   const out = [];
   const re = /black_start:([\d.]+)\s+black_end:([\d.]+)\s+black_duration:([\d.]+)/g;
   let m;
   while ((m = re.exec(stderr))) out.push({ start: +m[1], end: +m[2], duration: +m[3] });
   return out;
}

function parseFreeze(stderr) {
   const out = [];
   const starts = [...stderr.matchAll(/freeze_start:\s*([\d.]+)/g)].map(m => +m[1]);
   const durs = [...stderr.matchAll(/freeze_duration:\s*([\d.]+)/g)].map(m => +m[1]);
   for (let i = 0; i < starts.length; i++) out.push({ start: starts[i], duration: durs[i] ?? null });
   return out;
}

export function loadSpec(specPath, id) {
   if (!specPath || !existsSync(specPath)) return null;
   const j = JSON.parse(readFileSync(specPath, 'utf8'));
   const list = Array.isArray(j) ? j : Array.isArray(j.reels) ? j.reels : Object.entries(j.reels ?? j).map(([k, v]) => ({ id: k, ...v }));
   return list.find(r => r.id === id) ?? null;
}

export function specSeconds(spec) {
   if (!spec) return null;
   if (spec.seconds != null) return Number(spec.seconds);
   if (spec.duration != null) return Number(spec.duration);
   if (spec.durationSec != null) return Number(spec.durationSec);
   if (spec.durationInFrames != null) return spec.durationInFrames / (spec.fps ?? FPS);
   return null;
}

// Runs every check. Returns { file, pass, lines: [{level, msg}], meta }.
export async function qa(file, { feed = false, spec = null, specPath = null, wantSeconds = null } = {}) {
   const lines = [];
   const add = (level, msg) => lines.push({ level, msg });
   const abs = resolve(file);
   if (!existsSync(abs)) throw new Error(`no such file: ${abs}`);

   const meta = await probe(abs);
   const want = feed ? FEED : REEL;

   if (meta.width === want.w && meta.height === want.h) add('PASS', `geometry ${meta.width}x${meta.height}`);
   else add('FAIL', `geometry ${meta.width}x${meta.height}, want ${want.w}x${want.h}`);

   if (Math.abs(meta.fps - FPS) < 0.01) add('PASS', `fps ${FPS}`);
   else add('FAIL', `fps ${meta.fps.toFixed(3)}, want ${FPS}`);

   const id = basename(abs, '.mp4').replace(/-feed$/, '');
   const reel = spec ?? loadSpec(specPath, id);
   // The renderer knows the composition's exact length even when the spec
   // derives it; an explicit --want beats the spec lookup.
   const wantSec = wantSeconds ?? specSeconds(reel);
   if (wantSec == null) add('WARN', `duration ${meta.duration.toFixed(2)}s (no spec for "${id}")`);
   else if (Math.abs(meta.duration - wantSec) <= 0.2) add('PASS', `duration ${meta.duration.toFixed(2)}s (spec ${wantSec}s)`);
   else add('FAIL', `duration ${meta.duration.toFixed(2)}s, spec ${wantSec}s (±0.2)`);

   if (meta.bytes <= MAX_BYTES) add('PASS', `size ${(meta.bytes / 1048576).toFixed(1)}MB`);
   else add('FAIL', `size ${(meta.bytes / 1048576).toFixed(1)}MB > 30MB`);

   const black = await run('ffmpeg', ['-v', 'info', '-i', abs, '-an', '-vf', `blackdetect=d=${BLACK_MIN_S}:pix_th=0.10`, '-f', 'null', '-']);
   const blacks = parseBlack(black.stderr);
   if (blacks.length) add('FAIL', `black ${blacks.map(b => `${b.start.toFixed(2)}s-${b.end.toFixed(2)}s`).join(', ')}`);
   else add('PASS', 'no black gaps');

   // n is the noise floor: subtle glow/grain drift sits just above 0.0008,
   // so a live-but-calm reel stops false-positive'ing as frozen.
   const freeze = await run('ffmpeg', ['-v', 'info', '-i', abs, '-an', '-vf', `freezedetect=n=0.0008:d=${FREEZE_MIN_S}`, '-f', 'null', '-']);
   const freezes = parseFreeze(freeze.stderr);
   if (freezes.length) add('WARN', `static ${freezes.map(f => `${f.start.toFixed(2)}s${f.duration != null ? ` for ${f.duration.toFixed(1)}s` : ''}`).join(', ')}`);
   else add('PASS', `no freeze ≥${FREEZE_MIN_S}s`);

   const first = await grayFrames(abs, 'select=eq(n\\,0)');
   const f0 = first.frames[0];
   if (!f0) add('FAIL', 'first frame empty (could not decode frame 0)');
   else {
      const luma = meanLuma(f0);
      const { mean: edge } = edgeStats(f0, first.w, 0, first.h, 0);
      if (luma < FIRST_FRAME_LUMA_FLOOR || edge < FIRST_FRAME_EDGE_FLOOR) add('FAIL', `first frame empty (luma ${luma.toFixed(1)}, edge ${edge.toFixed(2)})`);
      else add('PASS', `first frame has content (luma ${luma.toFixed(0)}, edge ${edge.toFixed(2)})`);
   }

   const sampled = await grayFrames(abs, `fps=${1 / SAMPLE_EVERY_S}`);
   const topEnd = Math.round(sampled.h * SAFE_TOP);
   const botStart = Math.round(sampled.h * (1 - SAFE_BOTTOM));
   const hits = { top: [], bottom: [] };
   sampled.frames.forEach((fr, i) => {
      const t = i * SAMPLE_EVERY_S;
      if (edgeStats(fr, sampled.w, 0, topEnd, SAFE_EDGE_THRESHOLD).density > SAFE_EDGE_DENSITY) hits.top.push(t);
      if (edgeStats(fr, sampled.w, botStart, sampled.h, SAFE_EDGE_THRESHOLD).density > SAFE_EDGE_DENSITY) hits.bottom.push(t);
   });
   const fmtT = ts => ts.slice(0, 6).map(t => `${t.toFixed(1)}s`).join(' ') + (ts.length > 6 ? ` +${ts.length - 6}` : '');
   if (hits.top.length) add('WARN', `text-like detail in top ${SAFE_TOP * 100}% band at ${fmtT(hits.top)}`);
   if (hits.bottom.length) add('WARN', `text-like detail in bottom ${SAFE_BOTTOM * 100}% band at ${fmtT(hits.bottom)}`);
   if (!hits.top.length && !hits.bottom.length) add('PASS', 'safe areas clear');

   return { file: abs, pass: !lines.some(l => l.level === 'FAIL'), lines, meta };
}

export function printQa(result) {
   console.log(basename(result.file));
   for (const l of result.lines) console.log(`  ${l.level.padEnd(4)} ${l.msg}`);
}

function parseArgs(argv) {
   const flags = {};
   const pos = [];
   for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (!a.startsWith('--')) { pos.push(a); continue; }
      const k = a.slice(2);
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) flags[k] = true;
      else { flags[k] = v; i++; }
   }
   return { flags, pos };
}

// realpath both sides: ~/.claude/skills is often a symlink (dotfiles/stow).
const isMain = process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
   const { flags, pos } = parseArgs(process.argv.slice(2));
   const target = pos[0];
   if (!target) {
      console.error('usage: node scripts/qa.mjs <mp4 | out/vN> [--spec reels.json] [--feed]');
      process.exit(2);
   }
   const abs = resolve(target);
   const files = statSync(abs).isDirectory()
      ? readdirSync(abs).filter(f => f.endsWith('.mp4') && !f.endsWith('.feed.mp4')).sort().map(f => join(abs, f))
      : [abs];
   const guess = [
      join(dirname(files[0]), '..', '..', 'reels.json'),
      join(dirname(files[0]), '..', '..', 'src', 'reels.json'),
      join(process.cwd(), 'reels.json'),
      join(process.cwd(), 'src', 'reels.json'),
   ].find(existsSync);
   let ok = true;
   for (const f of files) {
      const feed = !!flags.feed || /-feed\.mp4$/.test(f);
      const result = await qa(f, {
         feed,
         specPath: flags.spec ?? guess ?? null,
         wantSeconds: flags.want != null ? Number(flags.want) : null,
      });
      printQa(result);
      ok = ok && result.pass;
   }
   process.exit(ok ? 0 : 1);
}
