#!/usr/bin/env node
// Scaffolds a target project's reels workspace from this skill's templates.
// Copies templates/ into <projectDir>/reels/ WITHOUT overwriting anything that
// already exists, and writes reel-studio.config.json from flags (or a JSON
// file via --config-from).
//
//   node scripts/init.mjs <projectDir> \
//     --baseUrl http://localhost:3000 \
//     --start "pnpm exec next start --port 3000" \
//     [--out out] [--brand-accent '#73d0ff'] [--brand-accent2 '#a78bfa'] \
//     [--brand-surface '#0d1117'] [--brand-name Acme] [--brand-domain acme.com] \
//     [--font-display BricolageGrotesque] [--font-body PlusJakartaSans] \
//     [--config-from path.json]

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const projectDir = args[0];
if (!projectDir || projectDir.startsWith('--')) {
   console.error('usage: node scripts/init.mjs <projectDir> --baseUrl <url> --start "<cmd>" [flags]');
   process.exit(1);
}

const flag = name => {
   const i = args.indexOf(`--${name}`);

   return i > -1 ? args[i + 1] : undefined;
};

const skillRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const templates = path.join(skillRoot, 'templates');
const dest = path.resolve(projectDir, 'reels');

// Copy tree, never overwrite: an existing file means the user (or a previous
// run) already customised it, and clobbering that is how work gets lost.
const skipped = [];
const copied = [];

function copyTree(from, to) {
   mkdirSync(to, { recursive: true });

   for (const entry of readdirSync(from)) {
      const src = path.join(from, entry);
      const dst = path.join(
         to,
         entry === 'reels.example.json' ? entry : entry,
      );

      if (statSync(src).isDirectory()) {
         copyTree(src, dst);
      } else if (existsSync(dst)) {
         skipped.push(path.relative(dest, dst));
      } else {
         cpSync(src, dst);
         copied.push(path.relative(dest, dst));
      }
   }
}

copyTree(templates, dest);
// The runner scripts travel WITH the workspace so it is self-contained — a
// committed reels/ dir must render without the skill installed.
copyTree(path.join(skillRoot, 'scripts'), path.join(dest, 'scripts'));

// The project profile: flags win, --config-from fills, defaults last.
const cfgPath = path.join(dest, 'reel-studio.config.json');

if (existsSync(cfgPath)) {
   skipped.push('reel-studio.config.json');
} else {
   const fromFile = flag('config-from')
      ? JSON.parse(readFileSync(path.resolve(flag('config-from')), 'utf8'))
      : {};

   const config = {
      baseUrl: flag('baseUrl') ?? fromFile.baseUrl ?? 'http://localhost:3000',
      prodStartCommand: flag('start') ?? fromFile.prodStartCommand ?? '',
      healthPath: fromFile.healthPath ?? '/',
      auth: fromFile.auth ?? { mode: 'none', cookieName: '', sessionJson: 'session.json' },
      chromePath:
         fromFile.chromePath ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      brand: {
         name: flag('brand-name') ?? fromFile.brand?.name ?? 'Product',
         domain: flag('brand-domain') ?? fromFile.brand?.domain ?? 'example.com',
         logoPath: fromFile.brand?.logoPath ?? 'brand/logo.png',
         fontDisplay: flag('font-display') ?? fromFile.brand?.fontDisplay ?? 'BricolageGrotesque',
         fontBody: flag('font-body') ?? fromFile.brand?.fontBody ?? 'PlusJakartaSans',
         accent: flag('brand-accent') ?? fromFile.brand?.accent ?? '#73d0ff',
         accent2: flag('brand-accent2') ?? fromFile.brand?.accent2 ?? '#a78bfa',
         surface: flag('brand-surface') ?? fromFile.brand?.surface ?? '#0d1117',
         radius: fromFile.brand?.radius ?? 24,
      },
      neverClaim: fromFile.neverClaim ?? [],
      alwaysSay: fromFile.alwaysSay ?? [],
      tiers: fromFile.tiers ?? [],
      seed: fromFile.seed ?? { command: '', notes: 'no seed script configured' },
      outputDir: flag('out') ?? fromFile.outputDir ?? 'out',
      personas: fromFile.personas ?? {
         allowed: true,
         note: 'fictional personas only — never film real users',
      },
   };

   writeFileSync(cfgPath, `${JSON.stringify(config, null, 3)}\n`);
   copied.push('reel-studio.config.json');
}

mkdirSync(path.join(dest, 'public', 'plates'), { recursive: true });
mkdirSync(path.join(dest, 'public', 'brand'), { recursive: true });

console.log(`reels workspace: ${dest}`);
console.log(`  copied:  ${copied.length} file(s)`);
if (skipped.length) console.log(`  skipped (already exist): ${skipped.join(', ')}`);
console.log(`
next steps:
  1. cd ${dest} && pnpm install
  2. put the product logo at public/brand/logo.png
  3. if dashboards are filmed: write ${path.join(dest, 'session.json')} ({ name, value })
     — insert a session row in the app's DB and sign the cookie with the app's
     own secret; reel-studio never mints credentials itself
  4. copy plates.example.mjs → plates.mjs and write the plate map
  5. node scripts/plate.mjs <plateName>   (look at every .sheet.jpg it prints)
  6. copy src/reels.example.json → src/reels.json and write the specs
  7. node scripts/render.mjs all          (qa + contact sheets run automatically)
`);
