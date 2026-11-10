/* Sample a decoded image once per src to learn two things about it:

   - `alpha`: it has see-through pixels. Such a raster needs the same treatment
     as an SVG (no card behind it), or the surface shows through wherever the
     image is transparent. The format alone can't say (a PNG is usually
     opaque), so read the pixels.
   - `ink`: it's also dark, colourless artwork on mostly empty transparency,
     like a black line drawing, a scanned signature or a monochrome logo. It
     reads on a light board and disappears on a dark one, so it gets inverted
     wherever the backdrop is dark (see `.cv-ink` in canvas.css).

   Drawing it at 64×64 first is deliberate. A transparent halo survives the
   downscale, and so does the colour of thin strokes, because getImageData
   returns unpremultiplied colour, so an antialiased black stroke still reads
   black at low alpha. 64×64 is a trivial read next to a full-size decode. */

const cache = new Map();
const OPAQUE_FORMAT = /^data:image\/jpe?g|\.jpe?g($|\?)/i; // JPEG has no alpha to find
const NONE = { alpha: false, ink: false };

// A pixel counts as "ink" if it is dark and close to neutral grey. Coloured
// artwork stays as authored, because inverting it would change its hues.
const DARK_LUMA = 110; // 0–255
const MAX_CHROMA = 48; // max−min channel spread
const INK_SHARE = 0.9; // share of visible pixels that must be dark ink
// Ink art is mostly empty space. A dark-UI screenshot with rounded transparent
// corners or a drop shadow passes the tone test too, but it is nearly all
// opaque, and it already reads fine on a dark board, so leave it alone.
const MAX_COVERAGE = 0.6; // share of the frame that may be visible

export function analyzeImage(img) {
  const key = img.currentSrc || img.src;
  if (!key || OPAQUE_FORMAT.test(key)) return NONE;
  if (cache.has(key)) return cache.get(key);
  let result = NONE;
  try {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, S, S);
    const { data } = ctx.getImageData(0, 0, S, S);
    let alpha = false;
    let visible = 0;
    let dark = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      // Not a strict 255: the downscale can leave an opaque edge a hair short.
      if (a < 250) alpha = true;
      if (a < 24) continue; // effectively empty, so it says nothing about tone
      visible++;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (luma < DARK_LUMA && Math.max(r, g, b) - Math.min(r, g, b) < MAX_CHROMA) dark++;
    }
    const ink = alpha && visible > 0 && visible / (S * S) <= MAX_COVERAGE && dark / visible >= INK_SHARE;
    result = { alpha, ink };
  } catch {
    // A cross-origin image taints the canvas and getImageData throws. Unknown,
    // so keep the card and leave it un-inverted, which is how it looked before.
  }
  cache.set(key, result);
  return result;
}
