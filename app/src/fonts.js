// Vendored display fonts, loaded through the FontFace API (no CDN, no network).
// Call loadFonts() once and await it before the first draw and before setting
// window.__shotReady, so the cover never renders with a fallback font.
let loaded = false;

export async function loadFonts() {
  if (loaded) return;
  const faces = [
    new FontFace('Anton', "url('./fonts/Anton-Regular.woff2') format('woff2')", { weight: '400' }),
    new FontFace('Yellowtail', "url('./fonts/Yellowtail-Regular.woff2') format('woff2')", { weight: '400' }),
  ];
  for (const face of faces) {
    try {
      await face.load();
      document.fonts.add(face);
    } catch (err) {
      // The @font-face rules in fonts.css are the fallback; a failed load still
      // draws (with the fallback stack) instead of breaking the app.
      console.warn('font failed to load, using fallback:', face.family, err);
    }
  }
  // Wait until the two families are actually usable for measurement + drawing.
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  } catch { /* fonts.ready is best-effort */ }
  loaded = true;
}

export const TITLE_STACK = "'Anton', 'Arial Narrow', 'Noto Sans Display Condensed', sans-serif";
export const SCRIPT_STACK = "'Yellowtail', cursive";
