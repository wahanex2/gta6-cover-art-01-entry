// Fixed scenes for screenshots. `?shot=cover` shows one exported cover alone;
// `?shot=editor` shows the full studio UI with a photo loaded. Every scene is
// deterministic (fixed layout/grade/title/photos per shot, no random defaults).
// window.__shotReady is set only after the fonts are loaded and the canvas has
// painted (double rAF), so the headless screenshot never catches a blank frame.
import { defaultPanels } from './cover.js';

export const EXPORT_SIZES = { square: [1080, 1080], portrait: [1080, 1350], wide: [1920, 1080] };

function ready() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__shotReady = true;
      resolve();
    }));
  });
}

export async function runShot(shot, query, api) {
  if (shot === 'cover') {
    const layout = query.get('layout') || 'neon-grid';
    const grade = query.get('grade') || 'vice-sunset';
    const size = query.get('size') || 'square';
    const [w, h] = EXPORT_SIZES[size] || EXPORT_SIZES.square;
    api.setCanvasSize(w, h);
    api.setState({
      layout,
      grade,
      size,
      title: query.get('title') || 'SUNSET CHASE',
      tagline: query.get('tagline') || 'every street is a stage',
      kicker: query.get('kicker') || '★ SOLMAR BAY ★',
      vol: query.get('vol') || 'VOL. 06 — PALMS DISTRICT — EST. 1986',
      tape: query.get('tape') || 'COLLECTORS EDITION',
      stars: Number(query.get('stars') ?? 5),
      finish: query.get('finish') || 'none',
      finishStrength: Number(query.get('strength') ?? 0.7),
      frame: query.get('frame') || 'dark',
      showStarburst: query.get('starburst') !== '0',
      showNew: query.get('new') !== '0',
    });
    // Panel photos: `photos=car,boulevard,boardwalk,pier,convertible` overrides
    // the layout defaults per panel index (missing entries keep the default).
    const photos = (query.get('photos') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const panels = defaultPanels(layout, size);
    photos.forEach((photo, i) => {
      if (panels[i]) panels[i].photo = photo;
    });
    api.setPanels(panels);
  } else if (shot === 'editor') {
    // The studio with a cover loaded: Neon Grid, Vice Sunset, SUNSET CHASE.
    api.setState({
      layout: 'neon-grid',
      grade: 'vice-sunset',
      size: 'square',
      title: 'SUNSET CHASE',
      tagline: 'every street is a stage',
      kicker: '★ SOLMAR BAY ★',
      vol: 'VOL. 06 — PALMS DISTRICT — EST. 1986',
      tape: 'COLLECTORS EDITION',
      stars: 5,
      finish: 'none',
      finishStrength: 0.7,
      frame: 'dark',
      showStarburst: true,
      showNew: true,
    });
    api.setPanels(defaultPanels('neon-grid', 'square'));
  }
  await api.loadAll();
  api.render();
  await ready();
}
