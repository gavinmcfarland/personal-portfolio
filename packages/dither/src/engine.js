/* The dither engine.

   A field is a stack of LAYERS. Every layer paints exactly one kind of
   mark — a square dot — on a regular grid, and is optionally gated by a
   MASK that decides which of those dots survive. Denser passages are never
   scattered; they are masked into repeating geometry (checkerboards, grids
   of true circles, horizontal bands) so a field reads as something built on
   a grid rather than as noise that happened.

   There is not one round dot in here. The mark is always a square, because
   a dither is a decision made per pixel and a pixel is square. Circles show
   up only as masks — the shape that selects dots, never the dot itself. */

import { resolveInk, resolvePalette } from './palette.js';

/* Positive modulo — grids must wrap cleanly through the origin, and JS `%`
   keeps the sign of the dividend. */
const mod = (n, m) => ((n % m) + m) % m;

/* ── Marks ────────────────────────────────────────────────────────────
   Two marks, matching the CSS `--sq` and `--check`.

   `quarter` fills the top-right quadrant of each tile — the first quadrant
   of a conic gradient, 25% ink. `checker` fills two opposite quadrants,
   50% ink, the same diagonal checker `--check` paints. Offsetting a second
   `quarter` layer by half a tile is how the mockup builds up its 50%
   passages without ever softening an edge.

   A mark returns two functions: `on(x, y)` — is this pixel inside an inked
   square? — and `block(x, y)` — the centre of the square block that pixel
   belongs to. A mask is tested at that block centre, never per pixel, so a
   circle or a band edge keeps or cuts a WHOLE square instead of slicing it
   into a triangle or an arc. Every mark this engine paints stays a complete
   square, whatever geometry it is clipped into. */
function makeMark(mark, tile, offset, scale) {
  /* An always-on mark — every pixel is a candidate, left to the mask to
     gate. Ordered dithering needs this: the ramp lives entirely in the
     threshold mask. Its block is its `tile` grid (the dither cell), so a
     shape intersected with the ramp still cuts whole cells. */
  if (mark === 'solid') {
    const T = tile * scale;
    return {
      on: () => true,
      block: T > 0 ? (x, y) => [(Math.floor(x / T) + 0.5) * T, (Math.floor(y / T) + 0.5) * T] : (x, y) => [x, y],
    };
  }

  const T = tile * scale;
  const h = T / 2;
  const ox = (offset ? offset[0] : 0) * scale;
  const oy = (offset ? offset[1] : 0) * scale;

  /* The centre of the T/2 quadrant this pixel sits in — one representative
     point per inked square. */
  const block = (x, y) => {
    const lx = mod(x - ox, T);
    const ly = mod(y - oy, T);
    return [x - lx + (lx < h ? 0 : h) + h / 2, y - ly + (ly < h ? 0 : h) + h / 2];
  };

  if (mark === 'checker') {
    return {
      on: (x, y) => {
        const lx = mod(x - ox, T);
        const ly = mod(y - oy, T);
        return (lx >= h) !== (ly >= h);
      },
      block,
    };
  }
  // quarter (default) — top-right quadrant only
  return {
    on: (x, y) => {
      const lx = mod(x - ox, T);
      const ly = mod(y - oy, T);
      return lx >= h && ly < h;
    },
    block,
  };
}

/* A solid pixel-block mark: a repeating grid of cells, each either wholly
   inked or wholly bare, read from a boolean bitmap. This is what the pixel
   generator paints — coarse blocks rather than fine dots — and it tiles by
   wrapping through the bitmap. Its block is the cell, so a shape mask clips
   it cell by cell. */
function makeCells(grid, cell, scale) {
  const C = cell * scale;
  const rows = grid.length;
  const cols = grid[0].length;
  return {
    on: (x, y) => {
      const gx = mod(Math.floor(x / C), cols);
      const gy = mod(Math.floor(y / C), rows);
      return !!grid[gy][gx];
    },
    block: (x, y) => [(Math.floor(x / C) + 0.5) * C, (Math.floor(y / C) + 0.5) * C],
  };
}

/* A recursive Bayer threshold matrix of side `order` (2, 4, 8…), the map at
   the heart of ordered dithering. Each cell holds a rank; comparing a
   brightness against `(rank + 0.5) / order²` is what turns a smooth field
   into the crosshatched ramp everyone recognises from a Game Boy. */
function bayerMatrix(order) {
  let m = [[0]];
  let n = 1;
  while (n < order) {
    const next = Array.from({ length: n * 2 }, () => new Array(n * 2));
    for (let y = 0; y < n * 2; y++) {
      for (let x = 0; x < n * 2; x++) {
        const q = (y < n ? 0 : 2) + (x < n ? 0 : 1); // quadrant → [0,2,3,1]
        next[y][x] = m[y % n][x % n] * 4 + [0, 2, 3, 1][q];
      }
    }
    m = next;
    n *= 2;
  }
  return m;
}

/* The brightness field a threshold mask dithers, in 0..1 over the whole
   canvas — so a radial vignette or a linear ramp fills the field at render
   time rather than being baked at a fixed size. */
function thresholdField(kind, W, H) {
  const cx = W / 2;
  const cy = H / 2;
  switch (kind) {
    case 'linear-x': return (x) => x / W;
    case 'linear-y': return (x, y) => y / H;
    case 'diagonal': return (x, y) => (x / W + y / H) / 2;
    case 'angular': return (x, y) => (Math.atan2(y - cy, x - cx) + Math.PI) / (2 * Math.PI);
    case 'radial':
    default: {
      const r = Math.hypot(cx, cy) || 1;
      return (x, y) => 1 - Math.hypot(x - cx, y - cy) / r;
    }
  }
}

/* ── Resampling an image onto the dot grid ────────────────────────────
   An image mask is the one place the engine takes pixels IN rather than
   inventing them, so it needs a little machinery: resample the source onto
   the field's cell grid, adjust the tone, and reduce it to one bit per
   cell. The result depends on the render size, which is only known here, so
   it is computed at compile time and memoised against the source. */

const imageCache = new WeakMap();

function cacheFor(source) {
  let store = imageCache.get(source);
  if (!store) {
    store = new Map();
    imageCache.set(source, store);
  }
  // A texture re-rendered at a few sizes/palettes is normal; a runaway set
  // of keys is not. Keep the cache small rather than unbounded.
  if (store.size > 12) store.clear();
  return store;
}

/* Error-diffusion kernels, as [dx, dy, weight]. Atkinson deliberately
   spreads only ¾ of the error, which is why the classic Mac look has that
   blown-out, crunchy contrast; Floyd–Steinberg and Jarvis conserve it. */
const DIFFUSION = {
  floyd: [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]],
  atkinson: [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]],
  jarvis: [
    [1, 0, 7 / 48], [2, 0, 5 / 48],
    [-2, 1, 3 / 48], [-1, 1, 5 / 48], [0, 1, 7 / 48], [1, 1, 5 / 48], [2, 1, 3 / 48],
    [-2, 2, 1 / 48], [-1, 2, 3 / 48], [0, 2, 5 / 48], [1, 2, 3 / 48], [2, 2, 1 / 48],
  ],
  sierra: [[1, 0, 2 / 4], [-1, 1, 1 / 4], [0, 1, 1 / 4]],
};

/* A deterministic value hash — noise without an RNG, so the same image
   dithers the same way on every render. */
function hash01(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* Resample the source's luminance onto a `cols × rows` grid of cells and
   turn it into TONE — the amount of ink a cell wants, 0…1.

   Sampling is an area average over the source rectangle each cell covers,
   which is what makes a screenshot legible after it has been reduced to a
   few thousand dots: a row of 1px text strokes becomes a grey, not a
   coin-flip. Alpha is averaged too, so a cut-out logo keeps a clean edge. */
function resampleTone(spec, W, H, cell, cols, rows) {
  const src = spec.source;
  const SW = src.width;
  const SH = src.height;
  const lum = src.data;
  const alp = src.alpha;
  const pad = spec.pad == null ? 1 : spec.pad; // what lies outside the image
  const fit = spec.fit || 'cover';

  // Source pixels per output pixel. `cover` fills the frame and crops;
  // `contain` fits the whole image in and pads; `fill` stretches.
  let kx;
  let ky;
  if (fit === 'fill') {
    kx = SW / W;
    ky = SH / H;
  } else {
    const k = fit === 'contain' ? Math.max(SW / W, SH / H) : Math.min(SW / W, SH / H);
    kx = k;
    ky = k;
  }
  const ox = SW / 2 - (W / 2) * kx; // source x at output x = 0
  const oy = SH / 2 - (H / 2) * ky;

  const lumGrid = new Float32Array(cols * rows); // composited over `pad`
  const ownGrid = new Float32Array(cols * rows); // the colour under the alpha
  const covGrid = new Float32Array(cols * rows); // how much of the cell is there

  for (let cy = 0; cy < rows; cy++) {
    const v0 = oy + cy * cell * ky;
    const v1 = oy + (cy + 1) * cell * ky;
    let j0 = Math.floor(v0);
    let j1 = Math.ceil(v1);
    if (j1 <= j0) j1 = j0 + 1;
    const jy0 = Math.max(0, Math.min(SH, j0));
    const jy1 = Math.max(0, Math.min(SH, j1));

    for (let cx = 0; cx < cols; cx++) {
      const u0 = ox + cx * cell * kx;
      const u1 = ox + (cx + 1) * cell * kx;
      let i0 = Math.floor(u0);
      let i1 = Math.ceil(u1);
      if (i1 <= i0) i1 = i0 + 1;
      const ix0 = Math.max(0, Math.min(SW, i0));
      const ix1 = Math.max(0, Math.min(SW, i1));

      const total = (i1 - i0) * (j1 - j0);
      let sumLA = 0; // Σ luminance × alpha
      let sumA = 0; // Σ alpha (out-of-bounds samples count as alpha 0)
      for (let sy = jy0; sy < jy1; sy++) {
        const row = sy * SW;
        for (let sx = ix0; sx < ix1; sx++) {
          const a = alp ? alp[row + sx] : 1;
          sumLA += lum[row + sx] * a;
          sumA += a;
        }
      }
      const i = cy * cols + cx;
      const cov = sumA / total; // 0 = nothing there, 1 = fully opaque
      const own = sumA > 1e-6 ? sumLA / sumA : pad; // the colour under the alpha
      lumGrid[i] = own * cov + pad * (1 - cov); // composited over the pad
      ownGrid[i] = own;
      covGrid[i] = cov;
    }
  }

  /* Which luminance the tone is read from depends on how alpha is handled.

       flatten — the composited value. Transparency is just paler ink, and
                 the empty area is `pad`, which still takes the ink floor.
       cutout  — the shape's OWN colour, cut hard at half coverage. A black
                 mark at 20% alpha is still black; it is either in or out.
       shadow  — the shape's own colour too, but the ink is scaled by
                 coverage at the end, so a soft shadow prints as a faint
                 field that fades to genuinely nothing. */
  const mode = spec.alpha || 'flatten';
  const base = mode === 'flatten' ? lumGrid : ownGrid;

  // Auto levels: stretch the picture's own range to full black-to-white
  // before any other adjustment. A screenshot of a light UI otherwise sits
  // entirely in the top eighth of the range, where the difference between a
  // white card and the grey behind it is a rounding error — and 1 bit has
  // no rounding errors to spare.
  //
  // The ends are taken at a PERCENTILE, not at the extremes, so a 20px
  // black icon cannot claim the whole shadow end of the range on behalf of
  // an image that is otherwise all highlight. That is the difference
  // between a plate with structure and a plate with a speck on it.
  if (spec.autoLevels) {
    const clip = typeof spec.autoLevels === 'number' ? spec.autoLevels : 0.02;
    const BINS = 256;
    const hist = new Uint32Array(BINS);
    let n = 0;
    for (let i = 0; i < base.length; i++) {
      if (covGrid[i] < 0.5) continue; // ignore empty area
      hist[Math.min(BINS - 1, Math.max(0, Math.round(base[i] * (BINS - 1))))]++;
      n++;
    }
    if (n > 0) {
      const want = Math.floor(n * clip);
      let lo = 0;
      let hi = BINS - 1;
      for (let c = 0, b = 0; b < BINS; b++) {
        c += hist[b];
        if (c > want) { lo = b; break; }
      }
      for (let c = 0, b = BINS - 1; b >= 0; b--) {
        c += hist[b];
        if (c > want) { hi = b; break; }
      }
      const l0 = lo / (BINS - 1);
      const l1 = hi / (BINS - 1);
      if (l1 - l0 > 0.02) {
        const span = l1 - l0;
        for (let i = 0; i < base.length; i++) base[i] = (base[i] - l0) / span;
      }
    }
  }

  const gamma = spec.gamma == null ? 1 : spec.gamma;
  const contrast = spec.contrast == null ? 1 : spec.contrast;
  const brightness = spec.brightness == null ? 0 : spec.brightness;
  const invert = !!spec.invert;
  const steps = spec.steps > 1 ? Math.round(spec.steps) : 0;
  const range = spec.range;
  const rlo = range ? range[0] : 0;
  const rspan = range ? range[1] - range[0] : 1;

  const tone = new Float32Array(cols * rows);
  for (let i = 0; i < tone.length; i++) {
    let l = clamp01(base[i]);
    if (gamma !== 1) l = Math.pow(l, gamma);
    if (contrast !== 1 || brightness !== 0) l = clamp01((l - 0.5) * contrast + 0.5 + brightness);
    // Tone is INK, so by default the dark parts of the picture get the dots.
    // `invert` hands the dots to the light parts instead — which is what a
    // dark surface wants, where a dot is a light mark on a dark ground.
    let v = invert ? l : 1 - l;
    // Posterise first: quantising the tone gives the hard tonal terraces of
    // a printed plate, where a soft gradient becomes a few flat fields of
    // dots with a visible step between them.
    if (steps) v = Math.round(v * (steps - 1)) / (steps - 1);
    // Then compress into the ink range. This is what turns a flat, mostly
    // white screenshot into a plate: white paper stops meaning "no dots"
    // and starts meaning "the faintest field", so the whole sheet carries
    // texture and the picture reads as tonal structure within it.
    if (range) v = rlo + v * rspan;
    v = clamp01(v);
    // Alpha last, so it attenuates the FINISHED ink rather than the
    // luminance it came from. That is what lets a shadow fade all the way
    // out: scaling the tone after the ink floor has been applied takes the
    // floor down with it, where flattening first would leave the shadow's
    // whole bounding area sitting at the floor.
    if (mode === 'cutout') {
      if (covGrid[i] < 0.5) v = 0;
    } else if (mode === 'shadow') {
      v *= covGrid[i];
    }
    tone[i] = v;
  }
  return tone;
}

/* Reduce a tone grid to one bit per cell. `bayer`, `threshold` and `noise`
   decide each cell independently; the diffusion kernels carry each cell's
   rounding error into its neighbours, which is what lets 1 bit hold an
   apparently continuous tone. */
function ditherTone(spec, tone, cols, rows) {
  const bits = new Uint8Array(cols * rows);
  const method = spec.method || 'bayer';
  const cut = spec.threshold == null ? 0.5 : spec.threshold;

  if (method === 'threshold' || method === 'noise') {
    const noisy = method === 'noise';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        bits[i] = tone[i] > (noisy ? hash01(x, y) : cut) ? 1 : 0;
      }
    }
    return bits;
  }

  if (method === 'bayer') {
    const order = spec.order || 4;
    const m = bayerMatrix(order);
    const denom = order * order;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        bits[i] = tone[i] > (m[mod(y, order)][mod(x, order)] + 0.5) / denom ? 1 : 0;
      }
    }
    return bits;
  }

  // Error diffusion. Serpentine scanning (alternate rows run right-to-left)
  // stops the error dragging one way and drawing "worms" across flat areas.
  const kernel = DIFFUSION[method] || DIFFUSION.floyd;
  const buf = Float32Array.from(tone);
  const serpentine = spec.serpentine !== false;
  for (let y = 0; y < rows; y++) {
    const rtl = serpentine && y % 2 === 1;
    for (let k = 0; k < cols; k++) {
      const x = rtl ? cols - 1 - k : k;
      const i = y * cols + x;
      const want = buf[i];
      const on = want > cut ? 1 : 0;
      bits[i] = on;
      const err = want - on;
      if (!err) continue;
      for (let d = 0; d < kernel.length; d++) {
        const dx = rtl ? -kernel[d][0] : kernel[d][0];
        const nx = x + dx;
        const ny = y + kernel[d][1];
        if (nx < 0 || nx >= cols || ny >= rows) continue;
        buf[ny * cols + nx] += err * kernel[d][2];
      }
    }
  }
  return bits;
}

/* The resampled tone and its 1-bit reduction for one image mask at one
   render size, memoised against the source — the halftone style compiles
   four masks over the same picture and must not resample it four times. */
function imageMaskData(spec, W, H, cell) {
  const cols = Math.max(1, Math.ceil(W / cell));
  const rows = Math.max(1, Math.ceil(H / cell));
  const store = cacheFor(spec.source);
  const toneKey = [
    'tone', W, H, cell, spec.fit, spec.pad, spec.gamma, spec.contrast,
    spec.brightness, spec.autoLevels, spec.invert, spec.alpha, spec.steps,
    spec.range ? spec.range.join(',') : '',
  ].join('|');
  let tone = store.get(toneKey);
  if (!tone) {
    tone = resampleTone(spec, W, H, cell, cols, rows);
    store.set(toneKey, tone);
  }
  // `level` reads the tone directly, so a halftone never needs the bits.
  if (spec.level != null) return { cols, rows, tone, bits: null };

  const bitsKey = [toneKey, 'bits', spec.method, spec.order, spec.threshold, spec.serpentine].join('|');
  let bits = store.get(bitsKey);
  if (!bits) {
    bits = ditherTone(spec, tone, cols, rows);
    store.set(bitsKey, bits);
  }
  return { cols, rows, tone, bits };
}

/* ── Masks ────────────────────────────────────────────────────────────
   A mask returns 1 where dots are allowed and 0 where they are cut. Every
   stop is hard: masks gate, they never fade. An array of specs is a UNION
   (a dot survives if any sub-mask allows it), matching CSS `mask-composite:
   add`. `W`/`H` are the field size in device pixels, so masks expressed as
   a fraction of the field (`at`, and the centred shapes) land correctly at
   any size. */
export function compileMask(spec, W, H, scale) {
  if (!spec) return null;

  if (Array.isArray(spec)) {
    const subs = spec.map((s) => compileMask(s, W, H, scale)).filter(Boolean);
    return (x, y) => (subs.some((f) => f(x, y)) ? 1 : 0);
  }

  const s = scale;

  switch (spec.type) {
    /* Intersection — a dot survives only where EVERY sub-mask allows it.
       (A plain array is the union; this is the AND, needed to clip a masked
       fill such as a Bayer ramp into a shape.) Sub-masks may themselves be
       arrays, which stay unions. */
    case 'intersect': {
      const subs = (spec.of || []).map((sub) => compileMask(sub, W, H, scale)).filter(Boolean);
      if (!subs.length) return () => 1;
      return (x, y) => (subs.every((f) => f(x, y)) ? 1 : 0);
    }

    /* A big checkerboard of on/off cells — clumping laid out on a grid. */
    case 'checker': {
      const T = spec.size * s;
      const hh = T / 2;
      return (x, y) => {
        const lx = mod(x, T);
        const ly = mod(y, T);
        return (lx >= hh) !== (ly >= hh) ? 1 : 0;
      };
    }

    /* A grid of true circles: a solid disk of radius `radius`, centred in
       every `size` tile. Cut with an explicit pixel radius so it stays
       perfectly round whatever the box around it. */
    case 'circleGrid': {
      const T = spec.size * s;
      const r = spec.radius * s;
      const r2 = r * r;
      return (x, y) => {
        const cx = mod(x, T) - T / 2;
        const cy = mod(y, T) - T / 2;
        return cx * cx + cy * cy <= r2 ? 1 : 0;
      };
    }

    /* Negation — 1 where the inner mask is 0. The moon's crescent is a disc
       AND NOT a shifted disc. */
    case 'not': {
      const inner = compileMask(spec.of, W, H, scale);
      return (x, y) => (inner && inner(x, y) ? 0 : 1);
    }

    /* An arbitrary polygon, vertices given as fractions of the field. Point-
       in-polygon by ray casting, so it handles concave shapes too — which is
       every interesting icon: stars, hearts, crosses, hexagons. */
    case 'polygon': {
      const pts = spec.points.map(([fx, fy]) => [fx * W, fy * H]);
      const n = pts.length;
      return (x, y) => {
        let inside = false;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const [xi, yi] = pts[i];
          const [xj, yj] = pts[j];
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
        }
        return inside ? 1 : 0;
      };
    }

    /* A texture that is ORGANIC to a shape rather than a tile cropped by it.
       It builds the shape's own polar field — `t`, the fraction of the way
       from the centre out to the boundary (0…1), and the angle — then paints
       a retro effect in that space, so the pattern nests inside the outline,
       radiates from the centre, or spirals around it. `shape` is `disc`
       (constant radius) or `polygon` (boundary radius precomputed per angle).
       `style` picks the effect. */
    case 'organic': {
      const cx = (spec.cx == null ? 0.5 : spec.cx) * W;
      const cy = (spec.cy == null ? 0.5 : spec.cy) * H;
      const TAU = Math.PI * 2;

      // Boundary radius as a function of angle.
      let radiusAt;
      if (spec.shape === 'disc') {
        const R = spec.radius * s;
        radiusAt = () => R;
      } else {
        const pts = spec.points.map(([fx, fy]) => [fx * W, fy * H]);
        const NB = 720;
        const R = new Float64Array(NB);
        for (let b = 0; b < NB; b++) {
          const ang = (b / NB) * TAU;
          const dx = Math.cos(ang);
          const dy = Math.sin(ang);
          let best = 0;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const [ax, ay] = pts[j];
            const [bx2, by2] = pts[i];
            const ex = bx2 - ax;
            const ey = by2 - ay;
            const denom = dx * ey - dy * ex;
            if (Math.abs(denom) < 1e-9) continue;
            const tt = ((ax - cx) * ey - (ay - cy) * ex) / denom;
            const uu = ((ax - cx) * dy - (ay - cy) * dx) / denom;
            if (tt > 0 && uu >= -1e-6 && uu <= 1 + 1e-6) best = Math.max(best, tt);
          }
          R[b] = best;
        }
        radiusAt = (ang) => R[(((ang / TAU) * NB) | 0) % NB];
      }

      const style = spec.style || 'contours';
      const rings = spec.rings || 5;
      const rays = spec.rays || 10;
      const arms = spec.arms || 2;
      const inv = spec.invert ? 1 : 0;
      const cell = (spec.cell || 3) * s;
      const m4 = bayerMatrix(4);
      const grid = spec.grid;
      const gRows = grid ? grid.length : 0;
      const gCols = grid ? grid[0].length : 0;

      return (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.hypot(dx, dy);
        let ang = Math.atan2(dy, dx);
        if (ang < 0) ang += TAU;
        const Rv = radiusAt(ang);
        if (Rv <= 0) return 0;
        const t = r / Rv;
        if (t > 1) return 0; // outside the shape
        const a = ang / TAU; // 0…1 around

        switch (style) {
          case 'contours': {
            const v = (t * rings) % 1;
            return (v < 0.5 ? 1 : 0) ^ inv;
          }
          case 'rays': {
            const v = (a * rays) % 1;
            return (v < 0.5 ? 1 : 0) ^ inv;
          }
          case 'spiral': {
            const v = (t * rings + a * arms) % 1;
            return (v < 0.5 ? 1 : 0) ^ inv;
          }
          case 'polarxor': {
            const ri = Math.floor(t * rings);
            const ai = Math.floor(a * rays);
            return ((ri ^ ai) & 1) ^ inv;
          }
          case 'polargrid': {
            const gy = Math.min(gRows - 1, Math.floor(t * gRows));
            const gx = ((Math.floor(a * gCols) % gCols) + gCols) % gCols;
            return grid[gy][gx] ? 1 : 0;
          }
          case 'dither':
          default: {
            const depth = inv ? t : 1 - t; // bright at centre
            const bx = ((Math.floor(x / cell) % 4) + 4) % 4;
            const by = ((Math.floor(y / cell) % 4) + 4) % 4;
            return depth > (m4[by][bx] + 0.5) / 16 ? 1 : 0;
          }
        }
      };
    }

    /* A shape rendered as a SHADED 3-D solid, then ordered-dithered — depth,
       material, light and gloss in 1 bit. The shape's signed distance field
       becomes a relief (a spherical `dome` or a `bevel` with a raised rim);
       the surface normal is read from that relief; Lambert diffuse plus a
       specular highlight from a fixed light give the shading; a Bayer matrix
       breaks the brightness into square dots. Material presets vary only the
       reflectance, so the light stays consistent and the result reads as a
       real object, not noise. */
    case 'shaded': {
      const cx = (spec.cx == null ? 0.5 : spec.cx) * W;
      const cy = (spec.cy == null ? 0.5 : spec.cy) * H;
      const N = W * H;
      const sd = new Float32Array(N); // signed distance: >0 inside

      if (spec.shape === 'disc') {
        const R = spec.radius * s;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) sd[y * W + x] = R - Math.hypot(x - cx, y - cy);
        }
      } else {
        const pts = spec.points.map(([fx, fy]) => [fx * W, fy * H]);
        const n = pts.length;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            let dmin = Infinity;
            let inside = false;
            for (let i = 0, j = n - 1; i < n; j = i++) {
              const ax = pts[j][0];
              const ay = pts[j][1];
              const bx2 = pts[i][0];
              const by2 = pts[i][1];
              const ex = bx2 - ax;
              const ey = by2 - ay;
              const wx = x - ax;
              const wy = y - ay;
              let tt = (wx * ex + wy * ey) / (ex * ex + ey * ey || 1);
              tt = tt < 0 ? 0 : tt > 1 ? 1 : tt;
              const d = Math.hypot(wx - tt * ex, wy - tt * ey);
              if (d < dmin) dmin = d;
              if (by2 > y !== ay > y && x < ((ax - bx2) * (y - by2)) / (ay - by2) + bx2) inside = !inside;
            }
            sd[y * W + x] = inside ? dmin : -dmin;
          }
        }
      }

      let maxIn = 1;
      for (let i = 0; i < N; i++) if (sd[i] > maxIn) maxIn = sd[i];

      const profile = spec.profile || 'dome';
      const bevel = (spec.bevel || 0.35) * maxIn;
      const h = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const d = sd[i];
        if (d <= 0) { h[i] = 0; continue; }
        if (profile === 'bevel') h[i] = d < bevel ? d / bevel : 1;
        else { const hn = d > maxIn ? 1 : d / maxIn; h[i] = Math.sqrt(Math.max(0, 1 - (1 - hn) * (1 - hn))); }
      }

      const L = spec.light || [-0.55, -0.6, 0.55];
      const ll = Math.hypot(L[0], L[1], L[2]) || 1;
      const lx = L[0] / ll;
      const ly = L[1] / ll;
      const lz = L[2] / ll;
      const hn0 = Math.hypot(lx, ly, lz + 1) || 1; // half-vector with view (0,0,1)
      const hvx = lx / hn0;
      const hvy = ly / hn0;
      const hvz = (lz + 1) / hn0;

      const shininess = spec.shininess || 30;
      const ks = spec.ks == null ? 0.6 : spec.ks;
      const kd = spec.kd == null ? 0.85 : spec.kd;
      const amb = spec.ambient == null ? 0.13 : spec.ambient;
      const bump = maxIn * (spec.bump || 0.5);
      const cell = (spec.cell || 2) * s;
      const inv = spec.invert ? 1 : 0;
      const level = spec.level == null ? null : spec.level;
      const m4 = bayerMatrix(4);

      return (xf, yf) => {
        // Masks are sampled at a block centre, which is fractional for an odd
        // cell — floor to a real pixel before indexing the relief arrays.
        const x = xf < 0 ? 0 : xf >= W ? W - 1 : Math.floor(xf);
        const y = yf < 0 ? 0 : yf >= H ? H - 1 : Math.floor(yf);
        const i = y * W + x;
        if (sd[i] <= 0) return 0;
        const xl = x > 0 ? i - 1 : i;
        const xr = x < W - 1 ? i + 1 : i;
        const yu = y > 0 ? i - W : i;
        const yd = y < H - 1 ? i + W : i;
        let nx = (h[xl] - h[xr]) * bump;
        let ny = (h[yu] - h[yd]) * bump;
        let nz = 1;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
        const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
        const sdot = Math.max(0, nx * hvx + ny * hvy + nz * hvz);
        let b = amb + kd * diff + ks * Math.pow(sdot, shininess);
        if (b > 1) b = 1;
        if (inv) b = 1 - b;
        // `level` mode returns the lit region above a brightness — a tonal
        // band the caller fills with its own dither dots, so the shading can
        // be rendered as a halftone instead of a Bayer ramp.
        if (level != null) return b >= level ? 1 : 0;
        const bx = ((Math.floor(x / cell) % 4) + 4) % 4;
        const by = ((Math.floor(y / cell) % 4) + 4) % 4;
        return b > (m4[by][bx] + 0.5) / 16 ? 1 : 0;
      };
    }

    /* A raster IMAGE — a photo, a screenshot, a rasterised SVG — turned
       into square dots. The source arrives as a luminance plane (see
       `image.js`); this mask resamples it onto the field's own cell grid,
       area-averaging so fine detail becomes tone rather than aliasing,
       then makes one 1-bit decision per cell.

       Everything the rest of the engine promises still holds: the decision
       is per CELL, not per pixel, so a dot is a whole square and an edge
       stair-steps rather than being shaved. `level` returns the region
       above a tone instead of a dithered bit, which is how the halftone
       style stacks denser marks the darker the picture gets. */
    case 'image': {
      if (!spec.source || !spec.source.data) return () => 0;
      const cell = Math.max(1, Math.round((spec.cell || 3) * s));
      const { cols, rows, tone, bits } = imageMaskData(spec, W, H, cell);
      const at = (x, y) => {
        let cx = Math.floor(x / cell);
        let cy = Math.floor(y / cell);
        cx = cx < 0 ? 0 : cx >= cols ? cols - 1 : cx;
        cy = cy < 0 ? 0 : cy >= rows ? rows - 1 : cy;
        return cy * cols + cx;
      };
      if (spec.level != null) {
        const lv = spec.level;
        return (x, y) => (tone[at(x, y)] >= lv ? 1 : 0);
      }
      return (x, y) => bits[at(x, y)];
    }

    /* A single true circle at an arbitrary point — `cx`/`cy` are fractions
       of the field, `radius` is in px. Lets a decal set a circle beside a
       rectangle rather than dead-centre. */
    case 'disc': {
      const cx = (spec.cx == null ? 0.5 : spec.cx) * W;
      const cy = (spec.cy == null ? 0.5 : spec.cy) * H;
      const r = spec.radius * s;
      const r2 = r * r;
      return (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        return dx * dx + dy * dy <= r2 ? 1 : 0;
      };
    }

    /* A single true circle centred on the whole field. */
    case 'circleCenter': {
      const r = spec.radius * s;
      const r2 = r * r;
      return (x, y) => {
        const cx = x - W / 2;
        const cy = y - H / 2;
        return cx * cx + cy * cy <= r2 ? 1 : 0;
      };
    }

    /* An annulus centred on the field — the seal's ring. */
    case 'ring': {
      const inner = spec.inner * s;
      const outer = spec.outer * s;
      const i2 = inner * inner;
      const o2 = outer * outer;
      const ccx = (spec.cx == null ? 0.5 : spec.cx) * W;
      const ccy = (spec.cy == null ? 0.5 : spec.cy) * H;
      return (x, y) => {
        const dx = x - ccx;
        const dy = y - ccy;
        const d2 = dx * dx + dy * dy;
        return d2 >= i2 && d2 <= o2 ? 1 : 0;
      };
    }

    /* Repeating bands. `on` pixels lit, then dark to `period`. Axis picks
       ruled paper (y) or columns (x). */
    case 'band': {
      const period = spec.period * s;
      const on = spec.on * s;
      const off = (spec.offset || 0) * s;
      const axis = spec.axis === 'x' ? 0 : 1;
      return (x, y) => (mod((axis ? y : x) - off, period) < on ? 1 : 0);
    }

    /* A band that is lit only between two offsets in each period — a ruled
       line with a gap either side of it. */
    case 'bandRange': {
      const period = spec.period * s;
      const from = spec.from * s;
      const to = spec.to * s;
      const axis = spec.axis === 'x' ? 0 : 1;
      return (x, y) => {
        const p = mod(axis ? y : x, period);
        return p >= from && p < to ? 1 : 0;
      };
    }

    /* Ordered (Bayer) dithering: compare a brightness field against the
       threshold matrix, per `cell`-sized block, so a smooth gradient breaks
       into a 1-bit ramp. `field` picks the gradient, `order` the matrix
       size, `invert` flips dark-for-light. */
    case 'threshold': {
      const order = spec.order || 4;
      const m = bayerMatrix(order);
      const denom = order * order;
      const cell = (spec.cell || 3) * s;
      const field = thresholdField(spec.field || 'radial', W, H);
      const invert = !!spec.invert;
      return (x, y) => {
        /* One decision per cell block, not per pixel. The brightness is
           sampled at the block's centre, so the whole block turns on or off
           together — every dither pixel stays a full square rather than
           being sliced by the gradient's contour line. */
        const cx = Math.floor(x / cell);
        const cy = Math.floor(y / cell);
        const t = (m[mod(cy, order)][mod(cx, order)] + 0.5) / denom;
        let g = field((cx + 0.5) * cell, (cy + 0.5) * cell);
        if (invert) g = 1 - g;
        return g > t ? 1 : 0;
      };
    }

    /* One hard stop across the field — the field simply ends. `at` is a
       fraction of the field; `side` says which half keeps its dots. */
    case 'linear': {
      const axis = spec.axis === 'y' ? 1 : 0;
      const at = spec.at * (axis ? H : W);
      const after = spec.side !== 'before';
      return (x, y) => {
        const v = axis ? y : x;
        return (after ? v >= at : v < at) ? 1 : 0;
      };
    }

    default:
      return () => 1;
  }
}

/* Alpha-composite `src` (colour 0..255, alpha 0..1) over `dst` in place. */
function blend(dst, i, sr, sg, sb, sa) {
  const da = dst[i + 3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return;
  const inv = da * (1 - sa);
  dst[i] = (sr * sa + dst[i] * inv) / outA;
  dst[i + 1] = (sg * sa + dst[i + 1] * inv) / outA;
  dst[i + 2] = (sb * sa + dst[i + 2] * inv) / outA;
  dst[i + 3] = outA * 255;
}

/* Compile a field spec into ImageData. `spec` is:
     { width, height, background, palette, scale, layers: [
         { mark, tile, offset, ink, mask }
     ] }
   with lengths (tile/offset/mask sizes) in CSS pixels; `scale` blows them
   up to device pixels for a crisp result on any display. */
export function renderImageData(spec) {
  const scale = spec.scale || 1;
  const W = Math.max(1, Math.round((spec.width || 256) * scale));
  const H = Math.max(1, Math.round((spec.height || 256) * scale));
  const palette = resolvePalette(spec.palette);

  const img = new ImageData(W, H);
  const data = img.data;

  /* Lay the ground first, or leave it transparent so a texture can be
     stamped over other content. */
  if (spec.background !== null && spec.background !== 'transparent') {
    const bg = resolveInk(spec.background || palette.bg, palette);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = bg[0];
      data[i + 1] = bg[1];
      data[i + 2] = bg[2];
      data[i + 3] = bg[3] * 255;
    }
  }

  const layers = (spec.layers || []).map((layer) => ({
    /* A layer paints either a fine dot grid (mark/tile) or a coarse pixel
       bitmap (grid/cell) — never both. */
    mark: layer.grid
      ? makeCells(layer.grid, layer.cell || 8, scale)
      : makeMark(layer.mark || 'quarter', layer.tile || 6, layer.offset, scale),
    mask: compileMask(layer.mask, W, H, scale),
    ink: resolveInk(layer.ink || 'tx', palette),
  }));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      for (let l = 0; l < layers.length; l++) {
        const layer = layers[l];
        if (!layer.mark.on(x, y)) continue;
        if (layer.mask) {
          // Test the mask at the centre of this square, so it keeps or cuts
          // the whole square rather than slicing it.
          const b = layer.mark.block(x, y);
          if (!layer.mask(b[0], b[1])) continue;
        }
        const ink = layer.ink;
        blend(data, i, ink[0], ink[1], ink[2], ink[3]);
      }
    }
  }

  return img;
}
