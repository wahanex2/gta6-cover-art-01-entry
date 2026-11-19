// Colour grades and print finishes. Every grade is a canvas-implemented recipe:
// a ctx.filter chain applied when a photo is drawn, plus a two-stop gradient wash
// drawn over the panel with a blend mode. No network, no libraries, deterministic.

// filter: applied to the photo draw. overlay: [top, bottom] gradient colours for the
// wash, drawn with 'overlay' composite at overlayAlpha. band: the title-band sky
// gradient stops. title: the gradient fill stops for the big title lettering.
export const GRADES = {
  'vice-sunset': {
    label: 'Vice Sunset',
    filter: 'saturate(1.25) contrast(1.08) sepia(0.18)',
    overlay: ['#ff7a18', '#ff2975'],
    overlayAlpha: 0.16,
    band: ['#ff2975', '#ff7a18', '#ffd319'],
    title: ['#ffd319', '#ff2975', '#8c1eff'],
    swatch: 'linear-gradient(135deg,#ffd319,#ff2975 55%,#8c1eff)',
  },
  'neon-miami': {
    label: 'Neon Miami',
    filter: 'saturate(1.4) contrast(1.15) hue-rotate(-12deg)',
    overlay: ['#ff2e88', '#00e5ff'],
    overlayAlpha: 0.14,
    band: ['#8c1eff', '#ff2e88', '#00e5ff'],
    title: ['#00e5ff', '#ff2e88', '#ffd319'],
    swatch: 'linear-gradient(135deg,#00e5ff,#ff2e88 55%,#8c1eff)',
  },
  'golden-hour': {
    label: 'Golden Hour',
    filter: 'sepia(0.45) saturate(1.3) contrast(1.05)',
    overlay: ['#ffb347', '#ff8c00'],
    overlayAlpha: 0.14,
    band: ['#ff8c00', '#ffb347', '#ffe27a'],
    // White-hot top so the title pops against its own warm amber band.
    title: ['#ffffff', '#ffe27a', '#ff8c00'],
    swatch: 'linear-gradient(135deg,#ffe27a,#ff8c00 60%,#ff5e3a)',
  },
  'midnight': {
    label: 'Midnight Synthwave',
    filter: 'saturate(1.1) contrast(1.15) brightness(0.92) hue-rotate(18deg)',
    overlay: ['#2b0a4a', '#0b4f6c'],
    overlayAlpha: 0.18,
    band: ['#0b1035', '#7b2ff7', '#ff2e88'],
    title: ['#c9b6ff', '#ff2e88', '#ffd319'],
    swatch: 'linear-gradient(135deg,#0b1035,#7b2ff7 55%,#ff2e88)',
  },
};

export const GRADE_IDS = Object.keys(GRADES);

// Draws the grade's colour wash over a rectangle (the panel, already clipped).
export function paintGradeWash(ctx, rect, grade) {
  const g = GRADES[grade];
  if (!g) return;
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, g.overlay[0]);
  wash.addColorStop(1, g.overlay[1]);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = g.overlayAlpha;
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

// --- Print finishes (applied over the whole cover, after panels + band) ---

// Halftone: a pre-rendered dot tile, repeated as a pattern, low alpha. The dots
// are the print-shop texture the top entries use on their bands.
let halftonePattern = null;
export function paintHalftone(ctx, w, h, strength) {
  if (!halftonePattern) {
    const tile = document.createElement('canvas');
    tile.width = 10; tile.height = 10;
    const t = tile.getContext('2d');
    t.fillStyle = '#000000';
    t.beginPath(); t.arc(5, 5, 2.2, 0, Math.PI * 2); t.fill();
    halftonePattern = ctx.createPattern(tile, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = 0.22 * strength;
  ctx.fillStyle = halftonePattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Posterize: quantise every channel to a few levels. A real per-pixel pass on the
// finished cover (deterministic: same pixels in, same pixels out).
export function paintPosterize(ctx, w, h, strength) {
  if (strength <= 0) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const levels = 5;
  const step = 255 / (levels - 1);
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = d[i + c];
      const q = Math.round(v / step) * step;
      d[i + c] = v + (q - v) * strength;
    }
  }
  ctx.putImageData(img, 0, 0);
}
