// Neon Grid Cover Studio — the program the grader runs (gta6-cover-art-01).
//
// The app itself is a folder of static files (app/) plus four screenshots
// (screenshots/). This file is the courier: it puts both folders into the
// output directory the grader hands it and then asks the vendored make.fun
// helper to write dossier.json, the summary the judge reads.
//
// Node 22, standard library only — nothing to install, nothing fetched, no
// network at any point. Run it by hand with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The folder this file sits in; app/ and screenshots/ are its neighbours.
const here = fileURLToPath(new URL('.', import.meta.url));

// Decide where the package goes. The environment variable wins (a relative
// value is read against the working directory); then the grader's /output
// when it exists; otherwise the repository folder itself, which makes the
// copy a no-op for the two trees (see samePlace below).
function resolveOutDir(): string {
  const named = process.env.MAKEFUN_OUTPUT_DIR?.trim();
  if (named !== undefined && named !== '') return resolve(named);
  if (existsSync('/output')) return '/output';
  return here;
}

// Two spellings of one place on disk. The repository fallback makes the
// output directory equal the source, and copying a tree onto itself is an
// error, so the copy step checks this first.
function samePlace(a: string, b: string): boolean {
  return resolve(a) === resolve(b);
}

// Create the destination, then copy a whole tree into it — unless the source
// is missing (nothing to copy) or is already the destination.
function copyTree(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  if (!existsSync(from)) return;
  if (samePlace(from, to)) return;
  cpSync(from, to, { recursive: true });
}

// The caps the scorer enforces, passed straight through so this program
// refuses exactly where the scorer would: dossier text at most 160 KiB,
// four screenshots at most 256 KiB each, app/ at most 993 entries and
// 48 MiB, no app path longer than 1000 bytes.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function run(): void {
  const out = resolveOutDir();
  mkdirSync(out, { recursive: true });
  copyTree(join(here, 'app'), join(out, 'app'));
  copyTree(join(here, 'screenshots'), join(out, 'screenshots'));
  writeFileSync(join(out, 'dossier.json'), buildDossier(out, CAPS));
}

run();
