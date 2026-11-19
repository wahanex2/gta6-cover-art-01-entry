// The cover renderer: draws a complete GTA-style multi-panel cover onto any
// canvas at any size. Pure canvas 2D, no network, no libraries. Everything is
// size-relative, so the same state renders the 1080x1080, 1080x1350 and
// 1920x1080 exports, the editor preview and the screenshots.
//
// State shape (see main.js for the live editor state):
//   layout, grade, gradeMode, finish, finishStrength, frame,
//   title, tagline, kicker, vol, tape, stars, showStarburst, showNew,
//   panels: [ { photo, zoom, panX, panY, grade } ]  (grade null = global grade)

import { GRADES, paintGradeWash, paintHalftone, paintPosterize } from './grades.js';
import { layoutPanels, panelPath, bandHeight, panelGap } from './layouts.js';
import { TITLE_STACK, SCRIPT_STACK } from './fonts.js';

// Sample photos. focus is the face/subject point (0..1) the crop centres on —
// faces stay in frame because the crop window is anchored here, never on the
// exact middle of the photo.
export const PHOTOS = {
  car:         { src: 'samples/car.jpg',         label: 'Orange Chase',     focus: { x: 0.50, y: 0.55 } },
  boulevard:   { src: 'samples/boulevard.jpg',   label: 'Boulevard Sunset', focus: { x: 0.55, y: 0.20 } },
  boardwalk:   { src: 'samples/boardwalk.jpg',   label: 'Neon Boardwalk',   focus: { x: 0.50, y: 0.45 } },
  pier:        { src: 'samples/pier.jpg',        label: 'Pier Day',         focus: { x: 0.42, y: 0.28 } },
  convertible: { src: 'samples/convertible.jpg', label: 'Convertible Dusk', focus: { x: 0.58, y: 0.35 } },
  street:      { src: 'samples/street.jpg',      label: 'Neon Street',      focus: { x: 0.42, y: 0.55 } },
};

export const PHOTO_IDS = Object.keys(PHOTOS);

// Default panel assignments per layout: distinct photos first, repeats (if any)
// always with a different zoom/pan so they read as deliberate crops.
export function defaultPanels(layout, size) {
  const p = (photo, zoom = 1, panX = 0, panY = 0, grade = null) =>
    ({ photo, zoom, panX, panY, grade });
  switch (layout) {
    case 'neon-grid':
      return [p('car', 1.05), p('boulevard', 1.1), p('boardwalk', 1.0), p('pier', 1.15, 0.1), p('convertible', 1.0)];
    case 'classic':
      return size === 'wide'
        ? [p('car', 1.1), p('boulevard', 1.05), p('boardwalk', 1.0), p('pier', 1.1), p('convertible', 1.0), p('street', 1.05)]
        : [p('car', 1.1), p('boulevard', 1.05), p('boardwalk', 1.0), p('pier', 1.1), p('convertible', 1.0), p('street', 1.05),
           p('car', 1.7, -0.25, 0.1), p('boulevard', 1.5, 0.2, -0.1), p('boardwalk', 1.6, 0, 0.15)];
    case 'hero-strips':
      return [p('convertible', 1.05), p('car', 1.15), p('boardwalk', 1.0), p('street', 1.1)];
    case 'diagonal':
      return [p('convertible', 1.05), p('car', 1.15), p('street', 1.0)];
    default:
      return [p('car', 1.05), p('boulevard', 1.1), p('boardwalk', 1.0), p('pier', 1.15), p('convertible', 1.0)];
  }
}

// Deterministic pseudo-random (fixed seed) for the skyline — same skyline on
// every run, every size.
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// --- vector garnish (all drawn, never copied art) ---

// A palm silhouette: curved trunk + 6 drooping fronds. (x, y) is the base of the
// trunk, h the total height, lean the trunk's lean in pixels.
function drawPalm(ctx, x, y, h, lean, color) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, h * 0.03);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * 0.4, y - h * 0.6, x + lean, y - h);
  ctx.stroke();
  const tx = x + lean, ty = y - h;
  for (let i = 0; i < 6; i++) {
    const a = (-Math.PI * 0.15) - (i * Math.PI) / 7.5;
    const len = h * (0.34 + (i % 2) * 0.06);
    const ex = tx + Math.cos(a) * len;
    const ey = ty + Math.sin(a) * len * 0.7 + h * 0.16;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty - h * 0.12, ex, ey);
    ctx.lineWidth = Math.max(1.5, h * 0.02);
    ctx.stroke();
  }
  ctx.restore();
}

// A jagged art-deco skyline along the bottom of the band, with a few lit windows.
function drawSkyline(ctx, x, y, w, h, color) {
  const rnd = seededRandom(20261119);
  ctx.save();
  ctx.fillStyle = color;
  let cx = x;
  while (cx < x + w) {
    const bw = w * (0.05 + rnd() * 0.06);
    const bh = h * (0.35 + rnd() * 0.6);
    ctx.fillRect(cx, y + h - bh, bw, bh);
    // A couple of lit windows on taller buildings.
    if (bh > h * 0.6) {
      ctx.fillStyle = '#ffd319';
      ctx.fillRect(cx + bw * 0.3, y + h - bh * 0.8, Math.max(2, bw * 0.08), Math.max(2, bh * 0.05));
      ctx.fillRect(cx + bw * 0.6, y + h - bh * 0.55, Math.max(2, bw * 0.08), Math.max(2, bh * 0.05));
      ctx.fillStyle = color;
    }
    cx += bw + w * 0.008;
  }
  ctx.restore();
}

// Retro striped sun: a gold circle drawn as horizontal strips with widening gaps
// toward the bottom, so the sky shows through — the classic Vice City sun.
function drawRetroSun(ctx, cx, cy, r) {
  ctx.save();
  ctx.fillStyle = '#ffd319';
  const strips = 9;
  for (let i = 0; i < strips; i++) {
    const t0 = (i / strips) * 2 * r;
    const t1 = ((i + 1) / strips) * 2 * r;
    const gap = (i / strips) * r * 0.16;
    const y0 = cy - r + t0 + gap / 2;
    const y1 = cy - r + t1 - gap / 2;
    if (y1 <= y0) continue;
    const ym = (y0 + y1) / 2;
    const half = Math.sqrt(Math.max(0, r * r - (ym - cy) * (ym - cy)));
    ctx.fillRect(cx - half, y0, half * 2, y1 - y0);
  }
  ctx.restore();
}

// A 5-point star path centred at (cx, cy) with outer radius r.
function starPath(ctx, cx, cy, r) {
  const inner = r * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// A starburst badge: a 14-point spiky disc.
function starburstPath(ctx, cx, cy, r) {
  ctx.beginPath();
  const points = 14;
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.78;
    const a = (i * Math.PI) / points;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// --- photo drawing ---

// Cover-fit draw anchored on the photo's focus point, with zoom and pan.
// panX/panY are -1..1 and shift the visible window; the image is clamped so the
// panel is always fully covered.
function drawPhoto(ctx, img, rect, panel) {
  // Unknown keys are user uploads: anchor on the upper third (faces live there),
  // never the exact middle of the frame.
  const meta = PHOTOS[panel.photo] || { focus: { x: 0.5, y: 0.35 } };
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (panel.zoom || 1);
  const dw = iw * scale, dh = ih * scale;
  const fx = meta.focus.x * dw, fy = meta.focus.y * dh;
  let dx = rect.x + rect.w / 2 - fx + (panel.panX || 0) * rect.w * 0.25;
  let dy = rect.y + rect.h / 2 - fy + (panel.panY || 0) * rect.h * 0.25;
  dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  ctx.drawImage(img, dx, dy, dw, dh);
}

// --- the title block (drawn on an offscreen canvas so the palm cutout can be
// clipped inside the letters with 'source-atop') ---
function drawTitleBlock(ctx, w, bh, state, grade) {
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.round(w));
  off.height = Math.max(2, Math.round(bh));
  const o = off.getContext('2d');
  const text = (state.title || 'SUNSET CHASE').trim().toUpperCase() || 'SUNSET CHASE';
  const grad = o.createLinearGradient(0, 0, 0, bh);
  grade.title.forEach((c, i) => grad.addColorStop(i / (grade.title.length - 1), c));

  // Auto-fit: shrink until it fits 92% width; split into 2 lines if needed.
  let lines = [text];
  let size = bh * 0.68;
  o.font = `${size}px ${TITLE_STACK}`;
  const fits = (t, s) => {
    o.font = `${s}px ${TITLE_STACK}`;
    return o.measureText(t).width <= w * 0.92;
  };
  while (!fits(text, size) && size > 14) size -= 2;
  if (!fits(text, size) && text.includes(' ')) {
    const words = text.split(' ');
    let best = 1, bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ').length;
      const b = words.slice(i).join(' ').length;
      if (Math.abs(a - b) < bestDiff) { bestDiff = Math.abs(a - b); best = i; }
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
    size = Math.min(size, bh * 0.46);
    while (lines.some((l) => !fits(l, size)) && size > 12) size -= 2;
  }
  o.textAlign = 'center';
  o.textBaseline = 'middle';
  o.lineJoin = 'round';
  const lineH = size * 1.02;
  const blockH = lineH * lines.length;
  const top = (bh - blockH) / 2 + size * 0.06;
  // Dark outline first, then the gradient fill.
  o.strokeStyle = '#14091f';
  o.lineWidth = Math.max(3, size * 0.09);
  lines.forEach((line, i) => {
    const y = top + lineH * i + lineH / 2;
    o.strokeText(line, w / 2, y);
  });
  o.fillStyle = grad;
  lines.forEach((line, i) => {
    const y = top + lineH * i + lineH / 2;
    o.fillText(line, w / 2, y);
  });
  // Palm cutout: two small palms clipped INSIDE the letters (source-atop), in a
  // darker shade — the gradient-filled "VI" echo, drawn not copied.
  o.globalCompositeOperation = 'source-atop';
  o.fillStyle = 'rgba(20, 5, 40, 0.5)';
  o.strokeStyle = 'rgba(20, 5, 40, 0.5)';
  const palmH = blockH * 0.85;
  drawPalm(o, w * 0.16, top + blockH * 0.98, palmH, palmH * 0.12, 'rgba(20, 5, 40, 0.5)');
  drawPalm(o, w * 0.84, top + blockH * 0.98, palmH, -palmH * 0.12, 'rgba(20, 5, 40, 0.5)');
  o.globalCompositeOperation = 'source-over';

  // Drop shadow + paste onto the main canvas.
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = Math.max(4, w * 0.012);
  ctx.shadowOffsetY = Math.max(2, w * 0.004);
  ctx.drawImage(off, 0, 0);
  ctx.restore();
  return { size, lines };
}

// --- the full cover ---

// Renders the cover described by `state` onto ctx (already sized to w x h).
// images: { photoId: HTMLImageElement } — missing entries draw as placeholders.
// opts: { selected: panelIndex | -1 } — editor selection outline.
export function renderCover(ctx, w, h, state, images, opts = {}) {
  const size = w === h ? 'square' : w > h ? 'wide' : 'portrait';
  const grade = GRADES[state.grade] || GRADES['vice-sunset'];
  const bh = bandHeight(h, size);
  const gap = panelGap(w);
  const frameColor = state.frame === 'light' ? '#f5efe6' : state.frame === 'none' ? '#14091f' : '#1a0b2e';

  // Frame / background (shows through as the panel dividers).
  ctx.save();
  ctx.fillStyle = frameColor;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Panels.
  const rects = layoutPanels(state.layout, w, h, size);
  const panels = state.panels && state.panels.length ? state.panels : defaultPanels(state.layout, size);
  rects.forEach((rect, i) => {
    const panel = panels[i % panels.length];
    const img = images[panel.photo];
    const panelGrade = (state.gradeMode === 'per-panel' && panel.grade) ? panel.grade : state.grade;
    ctx.save();
    panelPath(ctx, rect);
    ctx.clip();
    if (img) {
      ctx.filter = (GRADES[panelGrade] || grade).filter;
      drawPhoto(ctx, img, rect, panel);
      ctx.filter = 'none';
      paintGradeWash(ctx, rect, panelGrade);
    } else {
      ctx.fillStyle = '#2b1838';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `600 ${Math.max(12, rect.w * 0.06)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(panel.photo || 'photo', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    ctx.restore();
    // Selected-panel outline (editor only).
    if (opts.selected === i) {
      ctx.save();
      ctx.strokeStyle = '#ff2e88';
      ctx.lineWidth = Math.max(2, w * 0.004);
      ctx.setLineDash([Math.max(6, w * 0.012), Math.max(4, w * 0.008)]);
      panelPath(ctx, { ...rect, x: rect.x + 2, y: rect.y + 2, w: rect.w - 4, h: rect.h - 4 });
      ctx.stroke();
      ctx.restore();
    }
  });

  // Title band: gradient sky + retro sun + skyline + palms.
  const bandY = h - bh;
  ctx.save();
  const sky = ctx.createLinearGradient(0, bandY, 0, h);
  grade.band.forEach((c, i) => sky.addColorStop(i / (grade.band.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, bandY, w, bh);
  // Retro sun, right side of the band (behind the title's right edge).
  drawRetroSun(ctx, w * 0.86, bandY + bh * 0.46, bh * 0.36);
  // Skyline along the bottom of the band + palms at the top edge.
  drawSkyline(ctx, 0, bandY, w, bh * 0.5, '#1a0b2e');
  drawPalm(ctx, w * 0.06, bandY + bh * 0.30, bh * 0.34, bh * 0.05, '#1a0b2e');
  drawPalm(ctx, w * 0.94, bandY + bh * 0.30, bh * 0.34, -bh * 0.05, '#1a0b2e');
  ctx.restore();

  // Kicker pill, centred above the title.
  const kicker = (state.kicker || '').trim();
  if (kicker) {
    const fs = Math.max(11, bh * 0.085);
    ctx.save();
    ctx.font = `700 ${fs}px system-ui, sans-serif`;
    const tw = ctx.measureText(kicker).width;
    const pw = tw + fs * 1.6, ph = fs * 1.9;
    const px = (w - pw) / 2, py = bandY + bh * 0.055;
    ctx.fillStyle = 'rgba(20, 9, 31, 0.55)';
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, ph / 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd319';
    ctx.lineWidth = Math.max(1.5, fs * 0.09);
    ctx.stroke();
    ctx.fillStyle = '#ffd319';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(kicker, w / 2, py + ph / 2 + fs * 0.05);
    ctx.restore();
  }

  // Title (gradient fill + outline + palm cutout) in the band.
  const titleY = bandY + bh * 0.17;
  const titleH = bh * 0.55;
  ctx.save();
  ctx.translate(0, titleY);
  drawTitleBlock(ctx, w, titleH, state, grade);
  ctx.restore();

  // Tagline in neon script under the title.
  const tagline = (state.tagline || '').trim();
  if (tagline) {
    const fs = Math.max(12, bh * 0.115);
    ctx.save();
    ctx.font = `${fs}px ${SCRIPT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#eafcff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = Math.max(6, fs * 0.5);
    ctx.fillText(tagline, w / 2, bandY + bh * 0.80);
    ctx.restore();
  }

  // Vol line, top-left of the band.
  const vol = (state.vol || '').trim();
  if (vol) {
    const fs = Math.max(9, bh * 0.062);
    ctx.save();
    ctx.font = `600 ${fs}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(vol, w * 0.025, bandY + bh * 0.075);
    ctx.restore();
  }

  // Edition tape, top-right of the band, slightly rotated. Measured first so
  // its right edge sits inside the cover instead of running off it.
  const tape = (state.tape || '').trim();
  if (tape) {
    const fs = Math.max(10, bh * 0.075);
    ctx.save();
    ctx.font = `800 ${fs}px system-ui, sans-serif`;
    const tw = ctx.measureText(tape).width;
    const pw = tw + fs * 1.4, ph = fs * 1.8;
    ctx.translate(w - pw / 2 - w * 0.015, bandY + bh * 0.075);
    ctx.rotate(-0.03);
    ctx.fillStyle = '#ffd319';
    ctx.beginPath();
    ctx.moveTo(-pw / 2, -ph / 2);
    ctx.lineTo(pw / 2, -ph / 2);
    ctx.lineTo(pw / 2 - fs * 0.5, ph / 2);
    ctx.lineTo(-pw / 2 + fs * 0.5, ph / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#14091f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tape, 0, fs * 0.04);
    ctx.restore();
  }

  // Gold stars, centred under the tagline. Dark outline so they read on the
  // bright orange sky.
  const stars = Math.max(0, Math.min(5, state.stars || 0));
  if (stars > 0) {
    const r = Math.max(5, bh * 0.035);
    const total = stars * r * 2.6;
    ctx.save();
    ctx.fillStyle = '#ffd319';
    ctx.strokeStyle = '#14091f';
    ctx.lineWidth = Math.max(1.5, r * 0.14);
    ctx.lineJoin = 'round';
    for (let i = 0; i < stars; i++) {
      starPath(ctx, w / 2 - total / 2 + r + i * r * 2.6, bandY + bh * 0.915, r);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Badges (corners only — never over a face).
  if (state.showStarburst) {
    const r = Math.max(18, w * 0.052);
    const cx = w - r - Math.max(6, w * 0.012);
    const cy = r + Math.max(6, w * 0.012);
    ctx.save();
    starburstPath(ctx, cx, cy, r);
    ctx.fillStyle = '#ffd319';
    ctx.fill();
    ctx.strokeStyle = '#14091f';
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.stroke();
    ctx.fillStyle = '#14091f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.max(9, r * 0.26)}px system-ui, sans-serif`;
    ctx.fillText('EST.', cx, cy - r * 0.16);
    ctx.fillText('2026', cx, cy + r * 0.2);
    ctx.restore();
  }
  if (state.showNew) {
    const r = Math.max(14, w * 0.038);
    const cx = w - r - Math.max(6, w * 0.012);
    const cy = h - r - Math.max(6, w * 0.012);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ff2e88';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.max(10, r * 0.42)}px system-ui, sans-serif`;
    ctx.fillText('NEW', cx, cy + r * 0.04);
    ctx.restore();
  }

  // Print finishes over the whole cover.
  if (state.finish === 'halftone') paintHalftone(ctx, w, h, state.finishStrength ?? 0.7);
  else if (state.finish === 'posterize') paintPosterize(ctx, w, h, state.finishStrength ?? 0.7);

  // Outer frame line (poster edge).
  ctx.save();
  ctx.strokeStyle = 'rgba(20, 9, 31, 0.6)';
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.strokeRect(0, 0, w, h);
  ctx.restore();
}
