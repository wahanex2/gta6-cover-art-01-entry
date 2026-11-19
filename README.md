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

## What it does

- **4 layouts** — Neon Grid (hero + 4), Classic Grid (3×3 / 3×2), Hero + Strips,
  and Diagonal Split with slanted panel dividers (the GTA V cover device).
- **6 sample photos** — an orange supercar on a pastel art-deco boulevard, a
  woman at sunset, a neon boardwalk at night, a fisherman on a pier, a woman in
  a pink convertible at a neon motel, and a wet neon street with a motorcycle.
  Upload your own photos per panel, or one photo for all panels.
- **Face-safe crops** — every photo has a focus point (faces live in the upper
  third); crops anchor there. Click a panel to select it, drag to pan, scroll
  to zoom, or use the Zoom / Pan sliders. Repeats always get a different
  zoom/pan so they read as deliberate crops.
- **4 colour grades** — Vice Sunset, Neon Miami, Golden Hour, Midnight
  Synthwave — applied globally or per panel, plus Halftone and Posterize print
  finishes with a strength slider.
- **Lettering** — Anton (vendored, OFL) titles with a sunset-gradient fill,
  dark outline and palm silhouettes clipped inside the letters; Yellowtail
  (vendored, OFL) neon-script taglines; kicker pill, Vol. line, edition tape,
  gold stars, EST. 2026 starburst and NEW badges. Everything is editable.
- **Export** — Square 1080×1080, Portrait 1080×1350, Wide 1920×1080. One click
  re-renders the cover at the exact post size and downloads
  `cover-<w>x<h>.png`.

## Offline and private

Everything is static files under `app/` — no CDN, no network requests, no
tracking. Photos never leave the machine (uploads use object URLs only).
Fonts are vendored under `app/fonts/` (Anton + Yellowtail, SIL Open Font
License 1.1; see `app/fonts/OFL.txt`).

## Run it

```sh
node serve.ts            # serves app/ on http://localhost:8080
```

Open the page, load a photo, pick a layout and grade, edit the lettering,
and hit **Export PNG**.

## Screenshots

The four screenshots in `screenshots/` are produced from the app itself via
`?shot=` URLs (see `shots.json`): the strongest square cover, the editor UI,
a portrait Diagonal Split cover, and a wide Classic Grid cover with a
halftone finish.

## Build it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # copies app/ + screenshots/, writes dossier.json
```

`main.ts` is Node 22 standard library only. No part of the app is minified
or obfuscated: the renderer is `app/src/cover.js`, grades are
`app/src/grades.js`, layouts are `app/src/layouts.js`, fonts are
`app/src/fonts.js`, and the editor wiring is `app/src/main.js`.

## Licence

MIT — see `LICENSE`. All photos in `app/samples/` were made for this entry
with an image model and are free to use. No Rockstar Games logo, official
artwork, or Rockstar fonts are used anywhere.
