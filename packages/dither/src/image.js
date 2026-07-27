/* Turning a picture into a dither.

   Every other family in this package invents its pattern. This one takes a
   picture — a PNG, a screenshot, an SVG, a canvas — and re-draws it in the
   same grammar: square dots on a regular grid, one hard decision per cell,
   nothing anti-aliased and nothing scattered. A screenshot of a UI comes
   back looking like it was printed on a dot-matrix, or displayed on a
   1-bit Mac.

   The work splits in two:

     · here — get pixels out of whatever the caller has (a URL, an SVG
       string, a File, an <img>, a canvas) and reduce them to a LUMINANCE
       PLANE: width, height, a Float32Array of 0…1 brightness, and a
       matching alpha plane;

     · the engine — resample that plane onto the field's cell grid at
       render time and make the 1-bit decisions (see the `image` mask).

   The split matters because decoding is asynchronous and size-dependent,
   while the dither itself must stay synchronous and resolution-independent
   like the rest of the engine. A luminance plane is plain data, so a
   texture built from one is still just a description. */

import { resolvePalette, parseColor } from './palette.js';

const isBrowser = typeof document !== 'undefined';

/* How much of the source to keep when rasterising. Sampling well above the
   dot grid is the whole reason a reduced screenshot stays readable — each
   cell averages real detail instead of point-sampling one pixel of it. */
const RASTER = 1024;

/* Rec. 709 luma. Perceptual weighting matters more here than anywhere
   else: an equal-weight average turns saturated blues into mid-grey and a
   UI's accent colours all dither to the same mush. */
const luma = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/* ── Getting pixels ───────────────────────────────────────────────── */

const isLuma = (v) => !!v && typeof v === 'object' && v.data instanceof Float32Array && v.width > 0;

/* One scratch canvas, reused. A live camera calls through here on every
   frame, and a fresh canvas per frame is a fresh GPU-backed allocation per
   frame. */
let scratch = null;
function scratchCanvas(W, H) {
  if (!scratch) scratch = isBrowser ? document.createElement('canvas') : new OffscreenCanvas(W, H);
  if (scratch.width !== W) scratch.width = W;
  if (scratch.height !== H) scratch.height = H;
  return scratch;
}

/* Draw whatever we were handed into a canvas and read it back. `max` caps
   the longest edge so a 6000px photo does not cost 36M samples for a
   texture that will be a few thousand dots. */
function rasterise(source, max) {
  let sw = source.naturalWidth || source.videoWidth || source.width || 0;
  let sh = source.naturalHeight || source.videoHeight || source.height || 0;
  // An SVG with no intrinsic size reports 0 — give it a square to draw in.
  if (!sw || !sh) {
    sw = max;
    sh = max;
  }
  const k = Math.min(1, max / Math.max(sw, sh));
  const W = Math.max(1, Math.round(sw * k));
  const H = Math.max(1, Math.round(sh * k));

  const canvas = scratchCanvas(W, H);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, W, H); // the canvas is reused; do not inherit a frame
  ctx.drawImage(source, 0, 0, W, H);
  return ctx.getImageData(0, 0, W, H);
}

/* An ImageData → the two planes the mask reads. */
function planesFrom(img) {
  const n = img.width * img.height;
  const data = new Float32Array(n);
  const alpha = new Float32Array(n);
  const px = img.data;
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    data[i] = luma(px[p], px[p + 1], px[p + 2]);
    alpha[i] = px[p + 3] / 255;
  }
  return { width: img.width, height: img.height, data, alpha };
}

/* Reduce an already-decoded source to a luminance plane. Synchronous, so it
   only accepts things that already hold pixels: an <img> that has loaded, a
   canvas, an ImageBitmap, an ImageData — or a plane, which passes through.
   Use `loadLuma` for a URL, an SVG string or a File. */
export function toLuma(source, opts = {}) {
  if (isLuma(source)) return source;
  if (!source) throw new Error('toLuma: nothing to read pixels from.');
  const max = opts.raster || RASTER;
  // An ImageData is already pixels; anything else has to go via a canvas.
  const img = typeof ImageData !== 'undefined' && source instanceof ImageData ? source : rasterise(source, max);
  return planesFrom(img);
}

/* Decode anything into a luminance plane:

     · a URL (including a `data:` or `blob:` URL)
     · an SVG document as a string ("<svg …>…</svg>")
     · a File or Blob (an upload, a drop)
     · anything `toLuma` already takes

   SVGs are rasterised at `raster` px on the long edge rather than at their
   own size, so a 24px icon still has real detail to average down from. */
export async function loadLuma(source, opts = {}) {
  if (isLuma(source)) return source;
  const max = opts.raster || RASTER;

  if (typeof source === 'string') {
    const s = source.trim();
    if (s.startsWith('<') && s.includes('<svg')) return loadLuma(svgUrl(s), opts);
    return planesFrom(rasterise(await decode(s, max), max));
  }

  if (typeof Blob !== 'undefined' && source instanceof Blob) {
    const url = URL.createObjectURL(source);
    try {
      return planesFrom(rasterise(await decode(url, max), max));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // An <img> that has been handed over before it finished loading.
  if (isBrowser && source instanceof HTMLImageElement && !source.complete) {
    await source.decode().catch(() => {});
  }
  return toLuma(source, opts);
}

/* ── The camera ───────────────────────────────────────────────────────
   A fourth kind of source: not a file at all, but a live feed. It is here
   rather than in application code because it is the same job as `loadLuma`
   — get pixels from somewhere awkward and hand back a plane — and because
   the frame loop wants a `grab()` that costs nothing to call.

     const cam = await openCamera();
     cam.video                       // the <video>, already playing
     ditherImage(cam.grab(), opts)   // this frame, as a texture
     cam.stop();                     // release the device

   `grab()` is synchronous: it reads whatever frame the video is showing.
   Call it from a rAF loop for live dithering, or once for a still. Frames
   are captured at `raster` px on the long edge (480 by default, well below
   the still-image cap) — a live feed is resampled down to a few thousand
   dots anyway, and reading back a 1024px frame 60 times a second is the one
   thing that will actually drop the rate. */
export async function openCamera(opts = {}) {
  if (!isBrowser || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('No camera API in this browser.');
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: opts.facing || 'user',
      width: { ideal: opts.width || 640 },
      height: { ideal: opts.height || 480 },
    },
  });

  const video = document.createElement('video');
  video.playsInline = true; // iOS would otherwise go fullscreen
  video.muted = true;
  video.autoplay = true;
  video.srcObject = stream;
  await video.play();
  // A video reports 0×0 until the first frame has arrived, and rasterising
  // that would give back an empty plane.
  if (!video.videoWidth) {
    await new Promise((resolve) => video.addEventListener('loadeddata', resolve, { once: true }));
  }

  const raster = opts.raster || 480;
  return {
    video,
    grab: () => toLuma(video, { raster }),
    stop() {
      for (const track of stream.getTracks()) track.stop();
      video.srcObject = null;
    },
  };
}

/* An SVG string as a URL an <img> will accept. */
function svgUrl(svg) {
  const withSize = /\bwidth=|\bviewBox=/.test(svg) ? svg : svg.replace('<svg', `<svg width="${RASTER}" height="${RASTER}"`);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(withSize);
}

function decode(url, max) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // A cross-origin image would otherwise taint the canvas and make
    // getImageData throw — ask for CORS and let it fail loudly if refused.
    if (!/^(data:|blob:)/.test(url)) img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      // SVGs with no intrinsic size decode at 0×0; force a raster box.
      if (!img.naturalWidth) {
        img.width = max;
        img.height = max;
      }
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Could not load image: ${String(url).slice(0, 80)}`));
    img.src = url;
  });
}

/* ── Building the texture spec ────────────────────────────────────── */

export const ditherMethods = ['bayer', 'atkinson', 'floyd', 'jarvis', 'sierra', 'threshold', 'noise'];
export const imageStyles = ['dither', 'halftone'];
export const alphaModes = ['flatten', 'cutout', 'shadow'];

/* Does this surface paint light dots on a dark ground? If so a dot should
   stand for a BRIGHT part of the picture, not a dark one — otherwise every
   image comes back as its own negative. */
function litSurface(paletteSpec, background) {
  const p = resolvePalette(paletteSpec);
  const bg = background === null || background === 'transparent' ? p.bg : background || p.bg;
  const [r, g, b] = parseColor(bg);
  return luma(r, g, b) < 0.5;
}

/* Turn a picture into a layer stack.

   Returns `{ width, height, layers, method, style, cell }` — the same shape
   the other generators return, so `index.js` can wrap it in a texture.

   Options:
     width / height   output size in CSS px; give one and the other follows
                      the image's aspect ratio (default 320 wide)
     cell             dot pitch in CSS px — the single biggest look control
     style            'dither' (one bit per cell) | 'halftone' (tone bands
                      filled with the package's quarter/checker dots)
     method           'bayer' | 'atkinson' | 'floyd' | 'jarvis' | 'sierra' |
                      'threshold' | 'noise'
     order            Bayer matrix side (2, 4, 8) — 4 is the classic
     contrast / brightness / gamma / autoLevels   tone adjustment
     range            [min, max] ink coverage — what pure white and pure
                      black map to. The control that decides whether a flat
                      screenshot comes back as a mostly empty sheet (the
                      default, [0, 1]) or as a plate carrying texture
                      everywhere (try [0.12, 0.92])
     steps            posterise the tone to N levels first, for the hard
                      tonal terraces of a printed plate
     invert           dots stand for light instead of dark (defaults to
                      whatever the palette's surface implies)
     fit              'cover' (default) | 'contain' | 'fill'
     alpha            how transparency is read:
                      'flatten' (default) composite onto `pad`, so the empty
                        area is paper and takes the ink floor like any other
                        light passage;
                      'cutout'  a hard cut at half coverage — outside the
                        shape is genuinely empty, but so is its shadow;
                      'shadow'  the same cut, softened: ink is scaled by
                        coverage, so a drop shadow survives as a fading
                        field and only true transparency prints nothing
     ink              the palette token dots paint with */
export function imageSpec(source, opts = {}) {
  const plane = toLuma(source, opts);

  const cell = Math.max(1, Math.round(opts.cell || 3));
  const { width, height } = outputSize(plane, opts, cell);
  const style = imageStyles.includes(opts.style) ? opts.style : 'dither';
  const method = ditherMethods.includes(opts.method) ? opts.method : 'bayer';

  const mask = {
    type: 'image',
    source: plane,
    cell,
    method,
    order: opts.order || 4,
    threshold: opts.threshold,
    serpentine: opts.serpentine,
    fit: opts.fit || 'cover',
    alpha: alphaModes.includes(opts.alpha) ? opts.alpha : 'flatten',
    pad: opts.pad,
    gamma: opts.gamma,
    contrast: opts.contrast,
    brightness: opts.brightness,
    autoLevels: !!opts.autoLevels,
    steps: opts.steps,
    range: normaliseRange(opts.range),
    invert: opts.invert == null ? litSurface(opts.palette, opts.background) : !!opts.invert,
  };

  const layers = style === 'halftone' ? halftoneLayers(mask, cell, opts) : [
    // One always-on mark per cell, gated entirely by the image — the same
    // construction the Bayer retro pattern uses, so the dots line up with
    // the dither cells and stay whole squares.
    { mark: 'solid', tile: cell, ink: opts.ink || 'tx-solid', mask },
  ];

  return { width, height, layers, method, style, cell };
}

/* `[min, max]` ink coverage, ignored when it asks for the full range (so
   the cache key and the fast path stay clean). */
function normaliseRange(range) {
  if (!Array.isArray(range) || range.length !== 2) return undefined;
  const lo = clamp01(range[0]);
  const hi = clamp01(range[1]);
  return lo === 0 && hi === 1 ? undefined : [lo, hi];
}
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* The halftone finish: four tone bands, each adding a denser mark, so the
   picture's brightness reads as dot DENSITY rather than as a Bayer ramp.
   Print, rather than screen. The mask cell matches the dot pitch so a band
   edge always falls between dots.

   The bands start at 0.12 rather than at zero so that the lowest useful ink
   range still lands one dot — a halftone has only five levels, and a floor
   that falls below the first of them prints nothing at all. */
function halftoneLayers(mask, cell, opts) {
  const half = Math.round(cell / 2);
  const band = (level) => ({ ...mask, level });
  return [
    { mark: 'quarter', tile: cell, ink: 'tx', mask: band(0.12) },
    { mark: 'quarter', tile: cell, offset: [half, half], ink: 'tx', mask: band(0.36) },
    { mark: 'checker', tile: cell, ink: 'tx-strong', mask: band(0.6) },
    { mark: 'checker', tile: cell, offset: [half, half], ink: opts.ink || 'tx-solid', mask: band(0.84) },
  ];
}

/* Output size: honour whatever the caller gave, fill in the rest from the
   image's aspect ratio, then snap to whole cells so the dot grid meets the
   edge cleanly instead of being clipped mid-square. */
function outputSize(plane, opts, cell) {
  const aspect = plane.height / plane.width;
  let width = opts.width;
  let height = opts.height;
  if (!width && !height) width = 320;
  if (!width) width = Math.round(height / aspect);
  if (!height) height = Math.round(width * aspect);
  const snap = (v) => Math.max(cell, Math.round(v / cell) * cell);
  return { width: snap(width), height: snap(height) };
}
