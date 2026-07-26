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
