// Neon Grid Cover Studio — editor wiring. State lives here; cover.js draws it.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { renderCover, PHOTOS, PHOTO_IDS, defaultPanels } from './cover.js';
import { GRADES, GRADE_IDS } from './grades.js';
import { LAYOUTS, LAYOUT_IDS, layoutPanels } from './layouts.js';
import { loadFonts } from './fonts.js';
import { runShot } from './shots.js';

export const EXPORT_SIZES = { square: [1080, 1080], portrait: [1080, 1350], wide: [1920, 1080] };
const PREVIEW_SIZES = { square: [720, 720], portrait: [640, 800], wide: [960, 540] };

const state = {
  layout: 'neon-grid',
  grade: 'vice-sunset',
  gradeMode: 'global',
  finish: 'none',
  finishStrength: 0.7,
  frame: 'dark',
  size: 'square',
  title: 'SUNSET CHASE',
  tagline: 'every street is a stage',
  kicker: '★ SOLMAR BAY ★',
  vol: 'VOL. 06 — PALMS DISTRICT — EST. 1986',
  tape: 'COLLECTORS EDITION',
  stars: 5,
  showStarburst: true,
  showNew: true,
  panels: defaultPanels('neon-grid', 'square'),
};

// Per-layout panel assignments, so switching layouts keeps each layout's edits.
const panelsByLayout = { 'neon-grid': state.panels };
let selected = 0;
const images = {}; // photoId -> HTMLImageElement (samples + uploads)
let uploadCount = 0;

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const $ = (id) => document.getElementById(id);

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSampleImages() {
  await Promise.all(PHOTO_IDS.map(async (id) => {
    if (!images[id]) images[id] = await loadImage(PHOTOS[id].src);
  }));
}

function panelLabel(i) {
  const rects = layoutPanels(state.layout, canvas.width, canvas.height, state.size);
  if (state.layout === 'neon-grid') return i === 0 ? 'Hero' : `Panel ${i}`;
  if (state.layout === 'classic') return `Panel ${i + 1}`;
  if (state.layout === 'hero-strips') return i === 0 ? 'Hero' : `Strip ${i}`;
  return i === 0 ? 'Hero' : `Panel ${i}`;
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function render() {
  // gradeMode follows the panels: any per-panel override switches it on.
  state.gradeMode = state.panels.some((p) => p.grade) ? 'per-panel' : 'global';
  // Screenshot scenes never show the editor's selection outline.
  const sel = document.body.classList.contains('shot-mode') ? -1 : selected;
  renderCover(ctx, canvas.width, canvas.height, state, images, { selected: sel });
  renderLayoutThumbs();
  setStatus(`Panel: ${panelLabel(selected)} — drag to pan · scroll to zoom · drop a photo here`);
}

// --- layout thumbnails (small live renders of each layout) ---
function renderLayoutThumbs() {
  const wrap = $('layouts');
  if (!wrap) return;
  LAYOUT_IDS.forEach((id, i) => {
    let thumb = wrap.children[i];
    if (!thumb) {
      thumb = document.createElement('canvas');
      thumb.width = 176; thumb.height = 132;
      thumb.className = 'layout-thumb';
      thumb.dataset.layout = id;
      thumb.title = LAYOUTS[id].label;
      thumb.addEventListener('click', () => selectLayout(id));
      wrap.appendChild(thumb);
    }
    thumb.classList.toggle('on', state.layout === id);
    const tctx = thumb.getContext('2d');
    const panels = panelsByLayout[id] || defaultPanels(id, state.size);
    renderCover(tctx, thumb.width, thumb.height, { ...state, layout: id, panels }, images, {});
  });
}

function selectLayout(id) {
  panelsByLayout[state.layout] = state.panels;
  state.layout = id;
  state.panels = panelsByLayout[id] || defaultPanels(id, state.size);
  panelsByLayout[id] = state.panels;
  selected = 0;
  syncPanelControls();
  render();
}

// --- controls ---
function photoOptions() {
  const opts = PHOTO_IDS.map((id) => ({ value: id, label: PHOTOS[id].label }));
  for (let n = 1; n <= uploadCount; n++) {
    opts.push({ value: `upload-${n}`, label: `Uploaded photo ${n}` });
  }
  return opts;
}

function syncPanelControls() {
  const panel = state.panels[selected];
  if (!panel) return;
  $('panel-title').textContent = `Panel: ${panelLabel(selected)}`;
  const sel = $('panel-photo');
  sel.innerHTML = '';
  photoOptions().forEach(({ value, label }) => {
    const o = document.createElement('option');
    o.value = value; o.textContent = label;
    sel.appendChild(o);
  });
  sel.value = panel.photo;
  const gs = $('panel-grade');
  gs.innerHTML = '<option value="">Global</option>';
  GRADE_IDS.forEach((id) => {
    const o = document.createElement('option');
    o.value = id; o.textContent = GRADES[id].label;
    gs.appendChild(o);
  });
  gs.value = panel.grade || '';
  $('panel-zoom').value = Math.round((panel.zoom || 1) * 100);
  $('panel-panx').value = Math.round((panel.panX || 0) * 100);
  $('panel-pany').value = Math.round((panel.panY || 0) * 100);
}

function syncControls() {
  $('title').value = state.title;
  $('tagline').value = state.tagline;
  $('kicker').value = state.kicker;
  $('vol').value = state.vol;
  $('tape').value = state.tape;
  $('stars').value = String(state.stars);
  $('starburst').checked = state.showStarburst;
  $('show-new').checked = state.showNew;
  $('finish').value = state.finish;
  $('finish-strength').value = Math.round(state.finishStrength * 100);
  $('frame').value = state.frame;
  document.querySelectorAll('#size-toggle button').forEach((b) => {
    b.classList.toggle('on', b.dataset.size === state.size);
  });
  document.querySelectorAll('#grades button').forEach((b) => {
    b.classList.toggle('on', b.dataset.grade === state.grade);
  });
  syncPanelControls();
}

function buildControls() {
  // Sample thumbnails.
  const samples = $('samples');
  PHOTO_IDS.forEach((id) => {
    const img = document.createElement('img');
    img.src = PHOTOS[id].src;
    img.alt = PHOTOS[id].label;
    img.title = PHOTOS[id].label;
    img.className = 'sample-thumb';
    img.addEventListener('click', () => {
      state.panels[selected].photo = id;
      syncPanelControls();
      render();
    });
    samples.appendChild(img);
  });

  // Grade swatches.
  const grades = $('grades');
  GRADE_IDS.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = id;
    b.className = 'grade-swatch';
    b.style.background = GRADES[id].swatch;
    b.textContent = GRADES[id].label;
    b.addEventListener('click', () => {
      state.grade = id;
      syncControls();
      render();
    });
    grades.appendChild(b);
  });

  // Lettering inputs.
  const bindText = (id, key) => {
    $(id).addEventListener('input', (e) => { state[key] = e.target.value; render(); });
  };
  bindText('title', 'title');
  bindText('tagline', 'tagline');
  bindText('kicker', 'kicker');
  bindText('vol', 'vol');
  bindText('tape', 'tape');
  $('stars').addEventListener('change', (e) => { state.stars = Number(e.target.value); render(); });
  $('starburst').addEventListener('change', (e) => { state.showStarburst = e.target.checked; render(); });
  $('show-new').addEventListener('change', (e) => { state.showNew = e.target.checked; render(); });

  // Grade + finish + frame.
  $('finish').addEventListener('change', (e) => { state.finish = e.target.value; render(); });
  $('finish-strength').addEventListener('input', (e) => {
    state.finishStrength = Number(e.target.value) / 100; render();
  });
  $('frame').addEventListener('change', (e) => { state.frame = e.target.value; render(); });

  // Per-panel controls.
  $('panel-photo').addEventListener('change', (e) => {
    state.panels[selected].photo = e.target.value; render();
  });
  $('panel-grade').addEventListener('change', (e) => {
    state.panels[selected].grade = e.target.value || null; render();
  });
  $('panel-zoom').addEventListener('input', (e) => {
    state.panels[selected].zoom = Number(e.target.value) / 100; render();
  });
  $('panel-panx').addEventListener('input', (e) => {
    state.panels[selected].panX = Number(e.target.value) / 100; render();
  });
  $('panel-pany').addEventListener('input', (e) => {
    state.panels[selected].panY = Number(e.target.value) / 100; render();
  });
  $('fill-all').addEventListener('click', () => {
    const photo = state.panels[selected].photo;
    state.panels.forEach((p, i) => {
      p.photo = photo;
      p.zoom = 1 + (i % 3) * 0.25;
      p.panX = (i % 2 === 0 ? -0.3 : 0.3) * (i % 3);
      p.panY = (i % 2 === 0 ? 0.15 : -0.15);
    });
    syncPanelControls();
    render();
  });

  // Uploads.
  $('panel-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await assignUpload(file, selected);
    e.target.value = '';
  });
  $('upload-all').addEventListener('click', () => $('upload-all-file').click());
  $('upload-all-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const key = await addUpload(file);
    state.panels.forEach((p, i) => {
      p.photo = key;
      p.zoom = 1 + (i % 3) * 0.25;
      p.panX = (i % 2 === 0 ? -0.3 : 0.3) * (i % 3);
      p.panY = (i % 2 === 0 ? 0.15 : -0.15);
    });
    syncPanelControls();
    render();
    e.target.value = '';
  });

  // Export size toggle + button.
  document.querySelectorAll('#size-toggle button').forEach((b) => {
    b.addEventListener('click', () => {
      state.size = b.dataset.size;
      const [w, h] = PREVIEW_SIZES[state.size];
      canvas.width = w; canvas.height = h;
      syncControls();
      render();
    });
  });
  $('export').addEventListener('click', exportPNG);

  // Canvas interaction: click to select, drag to pan, wheel to zoom, drop a photo.
  let drag = null;
  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  };
  const hitPanel = (x, y) => {
    const rects = layoutPanels(state.layout, canvas.width, canvas.height, state.size);
    return rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  };
  canvas.addEventListener('pointerdown', (e) => {
    const { x, y } = toCanvas(e);
    const i = hitPanel(x, y);
    if (i >= 0 && i !== selected) { selected = i; syncPanelControls(); render(); }
    drag = { x, y, moved: false, panX: state.panels[selected].panX || 0, panY: state.panels[selected].panY || 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const { x, y } = toCanvas(e);
    const dx = x - drag.x, dy = y - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (drag.moved) {
      const rect = layoutPanels(state.layout, canvas.width, canvas.height, state.size)[selected];
      const p = state.panels[selected];
      p.panX = Math.max(-1, Math.min(1, drag.panX + dx / (rect.w * 0.25)));
      p.panY = Math.max(-1, Math.min(1, drag.panY + dy / (rect.h * 0.25)));
      syncPanelControls();
      render();
    }
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = state.panels[selected];
    p.zoom = Math.max(1, Math.min(2.5, (p.zoom || 1) * Math.exp(-e.deltaY * 0.0012)));
    syncPanelControls();
    render();
  }, { passive: false });
  canvas.addEventListener('dragover', (e) => e.preventDefault());
  canvas.addEventListener('drop', async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const { x, y } = toCanvas(e);
    const i = hitPanel(x, y);
    await assignUpload(file, i >= 0 ? i : selected);
  });
}

async function addUpload(file) {
  uploadCount += 1;
  const key = `upload-${uploadCount}`;
  images[key] = await loadImage(URL.createObjectURL(file));
  return key;
}

async function assignUpload(file, panelIndex) {
  const key = await addUpload(file);
  state.panels[panelIndex].photo = key;
  selected = panelIndex;
  syncPanelControls();
  render();
}

// Exports the cover at the exact chosen post size (offscreen canvas at the
// target pixels, not an upscale of the preview — text stays crisp).
function exportPNG() {
  const [w, h] = EXPORT_SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  renderCover(off.getContext('2d'), w, h, state, images, {});
  off.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — please try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${w}x${h}.png`;
    a.click();
    setStatus(`Saved cover-${w}x${h}.png`);
  }, 'image/png');
}

// --- shot mode: fixed scenes for the screenshots ---
const shotApi = {
  setState: (patch) => { Object.assign(state, patch); syncControls(); },
  setPanels: (panels) => { state.panels = panels; panelsByLayout[state.layout] = panels; },
  setCanvasSize: (w, h) => { canvas.width = w; canvas.height = h; },
  render,
  loadAll: loadSampleImages,
};

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
await loadFonts();
if (shot) {
  // Cover shots hide all editor chrome; the editor shot keeps the full studio UI.
  if (shot === 'cover') {
    document.body.classList.add('shot-mode');
    document.body.classList.add('shot-cover');
  } else {
    document.body.classList.add('shot-editor');
  }
  buildControls();
  await loadSampleImages();
  await runShot(shot, params, shotApi);
} else {
  buildControls();
  syncControls();
  await loadSampleImages();
  render();
}
