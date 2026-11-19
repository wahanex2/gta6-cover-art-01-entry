# gta6-cover-art-01-entry

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/wahanex2/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/wahanex2/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Grid Cover Studio — a GTA-style multi-panel cover maker that works fully offline.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=a8k2t0w2&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

## What it is

A cover studio in the browser: pick photos, arrange them in a multi-panel
grid, grade them, set the lettering, and export a finished cover at the
exact size of a social post. Nothing leaves the machine — the whole app is
static files, and every photo stays local.

- **4 layouts** — Neon Grid (a hero panel plus four), Classic Grid (3×3, or
  3×2 on wide covers), Hero + Strips, and Diagonal Split, whose panel seams
  run at a slant the way the GTA V cover does.
- **6 sample photos** — an orange supercar on a pastel art-deco boulevard, a
  woman watching the sunset, a neon boardwalk at night, a fisherman on a
  pier, a woman in a pink convertible outside a neon motel, and a motorcycle
  on a wet neon street. You can also drop in your own photos, one panel at a
  time or one photo for the whole cover.
- **Face-safe crops** — each photo carries a focus point where the face or
  subject sits (usually the upper third), and every crop anchors there.
  Click a panel to pick it, drag to pan, scroll to zoom, or nudge the Zoom
  and Pan sliders. When one photo repeats across panels it always gets a
  different zoom and pan, so the repeats read as deliberate crops.
- **4 colour grades** — Vice Sunset, Neon Miami, Golden Hour, Midnight
  Synthwave — across the whole cover or per panel, with Halftone and
  Posterize print finishes on a strength slider.
- **Lettering** — Anton titles (vendored, OFL) filled with a sunset gradient,
  outlined dark, with palm silhouettes cut inside the letters; Yellowtail
  neon-script taglines (vendored, OFL); a kicker pill, a Vol. line, an
  edition tape, gold stars, an EST. 2026 starburst and a NEW badge. All of
  it editable.
- **Export** — Square 1080×1080, Portrait 1080×1350, Wide 1920×1080. Export
  re-renders the cover at the exact post size (not an upscale of the
  preview) and downloads `cover-<w>x<h>.png`.

## Offline and private

Everything is static files under `app/`: no CDN, no network requests, no
tracking. Uploaded photos live only as object URLs in the browser. The two
display fonts are vendored under `app/fonts/` (Anton and Yellowtail, SIL
Open Font License 1.1 — see `app/fonts/OFL.txt`).

## Try it in the browser

```sh
node serve.ts            # serves app/ on http://localhost:8080
```

Open the page, load a photo, pick a layout and a grade, edit the lettering,
and hit **Export PNG**.

## Screenshots

The four screenshots in `screenshots/` come from the app itself through
`?shot=` URLs (listed in `shots.json`): the strongest square cover, the
editor UI, a portrait Diagonal Split cover, and a wide Classic Grid cover
with a halftone finish.

## Build the submission

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # copies app/ + screenshots/, writes dossier.json
```

`main.ts` is Node 22 standard library only. Nothing in the app is minified
or obfuscated: the renderer is `app/src/cover.js`, the grades are
`app/src/grades.js`, the layouts are `app/src/layouts.js`, the fonts are
`app/src/fonts.js`, and the editor wiring is `app/src/main.js`.

## Licence

MIT — see `LICENSE`. The photos in `app/samples/` were made for this entry
with an image model and are free to use. No Rockstar Games logo, official
artwork, or Rockstar fonts are used anywhere.
