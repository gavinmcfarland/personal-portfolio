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
      return (x, y) => {
        const cx = x - W / 2;
        const cy = y - H / 2;
        const d2 = cx * cx + cy * cy;
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
