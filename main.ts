// Neon Grid Cover Studio — entrypoint for make.fun's gta6-cover-art-01.
//
// This program is the handoff between the repository and the judge. It takes
// the finished cover-maker app (the static files under app/) and the four
// screenshots under screenshots/, places both into the output directory the
// grader provides, and asks the vendored make.fun helper to write the
// dossier.json summary the judge reads.
//
// It runs on Node 22 with the standard library only: no packages, no
// network, nothing fetched at runtime. Everything the app needs already
// lives inside app/ (including the vendored fonts), so the copy below is
// the whole delivery.
//
// How to run it by hand:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader the output directory is /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// Directory holding this file; the app and its screenshots live beside it.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

// Where the finished package goes. The environment wins when it names a
// directory (a relative name resolves against the working directory);
// otherwise the grader's /output is used; if neither is available we fall
// back to the repository directory itself.
function pickOutputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromEnv !== undefined && fromEnv !== '') return resolve(fromEnv);
  if (existsSync('/output')) return '/output';
  return repoRoot;
}

// True when two paths name the same place on disk. Copying a folder onto
// itself would fail, so the fallback case (output == repository) skips it.
function isSameLocation(a: string, b: string): boolean {
  return resolve(a) === resolve(b);
}

// Make sure a folder exists, then copy a whole tree into it when the
// source exists and is not already the destination.
function mirrorTree(source: string, target: string): void {
  mkdirSync(target, { recursive: true });
  if (!existsSync(source)) return;
  if (isSameLocation(source, target)) return;
  cpSync(source, target, { recursive: true });
}

// The caps the scorer enforces: at most four screenshots of at most 256 KiB
// each, at most 993 files / 48 MiB inside app/, no app path longer than
// 1000 bytes, and dossier text capped at 160 KiB. buildDossier refuses
// anything over a cap instead of letting the scorer refuse the entry.
function dossierLimits() {
  return {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  };
}

function main(): void {
  const outDir = pickOutputDir();
  mkdirSync(outDir, { recursive: true });
  mirrorTree(join(repoRoot, 'app'), join(outDir, 'app'));
  mirrorTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));
  writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, dossierLimits()));
}

main();
