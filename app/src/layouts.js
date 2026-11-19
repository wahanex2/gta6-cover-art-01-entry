// Layouts: every layout returns the panel rectangles (fractions of the panel area,
// the strip above the title band) for a given cover size. All geometry is
// size-relative, so the same layout works for square 1080x1080, portrait
// 1080x1350 and wide 1920x1080. A panel is { x, y, w, h } in pixels, plus an
// optional slant: { side: 'right'|'bottom', dx } — the GTA V cover device, a
// slanted seam the divider follows instead of a straight edge.

export const LAYOUTS = {
  'neon-grid': { label: 'Neon Grid', panels: 5 },
  'classic': { label: 'Classic Grid', panels: 9 },
  'hero-strips': { label: 'Hero + Strips', panels: 4 },
  'diagonal': { label: 'Diagonal Split', panels: 3 },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);

// Band height as a fraction of cover height (title band sits below the panels).
export function bandHeight(h, size) {
  return size === 'wide' ? h * 0.27 : size === 'portrait' ? h * 0.21 : h * 0.24;
}

// gap: the divider between panels, in pixels at this cover width.
export function panelGap(w) {
  return Math.max(6, Math.round(w * 0.008));
}

// Panel area: the rectangle the panels live in (above the title band).
export function panelArea(w, h, size) {
  return { x: 0, y: 0, w, h: h - bandHeight(h, size) };
}

// Returns an array of panel rects for the layout at this cover size.
export function layoutPanels(layout, w, h, size) {
  const area = panelArea(w, h, size);
  const g = panelGap(w);
  const panels = [];
  const grid = (cols, rows, x0, y0, cw, ch) => {
    const cw2 = (cw - g * (cols - 1)) / cols;
    const ch2 = (ch - g * (rows - 1)) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        panels.push({
          x: x0 + c * (cw2 + g), y: y0 + r * (ch2 + g), w: cw2, h: ch2,
        });
      }
    }
  };

  if (layout === 'neon-grid') {
    // Hero + 2x2 small panels. Square: hero left, small right. Portrait: hero
    // top, small below. Wide: hero right, small left.
    if (size === 'portrait') {
      const heroH = area.h * 0.52;
      panels.push({ x: area.x, y: area.y, w: area.w, h: heroH });
      grid(2, 2, area.x, area.y + heroH + g, area.w, area.h - heroH - g);
    } else if (size === 'wide') {
      const heroW = area.w * 0.55;
      grid(2, 2, area.x, area.y, area.w - heroW - g, area.h);
      panels.push({ x: area.x + area.w - heroW, y: area.y, w: heroW, h: area.h });
    } else {
      const heroW = area.w * 0.62;
      panels.push({ x: area.x, y: area.y, w: heroW, h: area.h });
      grid(2, 2, area.x + heroW + g, area.y, area.w - heroW - g, area.h);
    }
  } else if (layout === 'classic') {
    // 3x3 grid (square/portrait), 3x2 grid (wide).
    if (size === 'wide') grid(3, 2, area.x, area.y, area.w, area.h);
    else grid(3, 3, area.x, area.y, area.w, area.h);
  } else if (layout === 'hero-strips') {
    // Hero + 3 strips. Square/portrait: hero top, strips below. Wide: hero left,
    // strips stacked on the right.
    if (size === 'wide') {
      const heroW = area.w * 0.6;
      panels.push({ x: area.x, y: area.y, w: heroW, h: area.h });
      grid(1, 3, area.x + heroW + g, area.y, area.w - heroW - g, area.h);
    } else {
      const heroH = area.h * 0.62;
      panels.push({ x: area.x, y: area.y, w: area.w, h: heroH });
      grid(3, 1, area.x, area.y + heroH + g, area.w, area.h - heroH - g);
    }
  } else if (layout === 'diagonal') {
    // Hero + 2 panels with slanted seams (8-12 degrees). The slant offset scales
    // with the panel height so the angle stays constant across sizes.
    const slant = (ph) => Math.round(ph * Math.tan((10 * Math.PI) / 180));
    if (size === 'portrait') {
      const heroH = area.h * 0.55;
      const dx = slant(heroH);
      panels.push({ x: area.x, y: area.y, w: area.w, h: heroH, slant: { side: 'bottom', dx } });
      const y2 = area.y + heroH + g;
      const h2 = area.h - heroH - g;
      const w2 = (area.w - g) / 2;
      panels.push({ x: area.x, y: y2, w: w2, h: h2, slant: { side: 'top', dx: slant(h2) } });
      panels.push({ x: area.x + w2 + g, y: y2, w: w2, h: h2, slant: { side: 'top', dx: slant(h2) } });
    } else {
      const heroW = area.w * 0.58;
      const dx = slant(area.h);
      panels.push({ x: area.x, y: area.y, w: heroW, h: area.h, slant: { side: 'right', dx } });
      const x2 = area.x + heroW + g;
      const w2 = area.w - heroW - g;
      const h2 = (area.h - g) / 2;
      panels.push({ x: x2, y: area.y, w: w2, h: h2, slant: { side: 'left', dx: slant(h2) } });
      panels.push({ x: x2, y: area.y + h2 + g, w: w2, h: h2, slant: { side: 'left', dx: slant(h2) } });
    }
  }
  return panels;
}

// Builds the clip path for a panel rect (a plain rectangle, or a polygon with a
// slanted edge for the diagonal layout).
export function panelPath(ctx, p) {
  ctx.beginPath();
  const s = p.slant;
  if (!s) { ctx.rect(p.x, p.y, p.w, p.h); return; }
  const { x, y, w, h, slant: { side, dx } } = p;
  if (side === 'right') {
    // Right edge leans: top corner shifted left, bottom corner shifted right.
    ctx.moveTo(x, y);
    ctx.lineTo(x + w - dx, y);
    ctx.lineTo(x + w + dx, y + h);
    ctx.lineTo(x, y + h);
  } else if (side === 'left') {
    ctx.moveTo(x + dx, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x - dx, y + h);
  } else if (side === 'bottom') {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w + dx, y + h);
    ctx.lineTo(x - dx, y + h);
  } else { // 'top'
    ctx.moveTo(x - dx, y);
    ctx.lineTo(x + w + dx, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
  }
  ctx.closePath();
}
