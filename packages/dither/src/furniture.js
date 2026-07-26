/* Generators for the page furniture — GROUNDS and DECALS.

   The catalogue in presets.js ships a hand-picked few of each; this grows
   fresh ones from a seed, the same way the field generators do.

   GROUNDS sit behind running text, so they keep to the quiet `tx-ground`
   ink and a fine grid, and only ever carve that grid into geometry (bands,
   a hard-stopped patch, a faint checker, a fade). A ground you can read a
   paragraph through is the whole point.

   DECALS are small marks stamped half off an edge, so they draw with the
   bolder `tx-strong` ink on transparency, and hold to the house geometry —
   strictly rectangles and true circles, filled with square dots. The
   playfulness is in where they land, not in the shapes. Each decal carries
   its own natural size. */

import { makeRng } from './rng.js';
import { xorGrid, caGrid, teletextGrid, bayerMaskSpec, mazeGrid, plasmaGrid, chevronGrid } from './retro.js';

/* Round a box dimension to a whole number of `unit` squares (at least two),
   so a rectangular decal never clips a dot mid-square at its far edge. */
const snap = (v, unit) => Math.max(unit * 2, Math.round(v / unit) * unit);
const unitOf = (layer) => layer.cell || layer.tile || 1;

/* ── Grounds ──────────────────────────────────────────────────────────
   Each returns a layer stack. Ink is always `tx-ground`. */

/* An even, unmasked field — the quietest ground, safe under a long passage. */
function evenGround(r) {
  return [{ mark: 'quarter', tile: r.pick([4, 5, 6]), ink: 'tx-ground' }];
}

/* Ruled paper — horizontal or vertical bands. */
function bandGround(r) {
  const period = r.pick([36, 40, 44, 52]);
  const on = Math.round(period * (0.4 + r.next() * 0.15));
  return [{ mark: 'quarter', tile: r.pick([4, 5]), ink: 'tx-ground', mask: { type: 'band', axis: r.pick(['x', 'y']), on, period } }];
}

/* A patch cut off at one edge by a single hard stop — the field just ends. */
function patchGround(r) {
  return [
    {
      mark: 'quarter',
      tile: r.pick([5, 6]),
      ink: 'tx-ground',
      mask: { type: 'linear', axis: r.pick(['x', 'y']), at: 0.4 + r.next() * 0.2, side: r.pick(['before', 'after']) },
    },
  ];
}

/* A faint checkerboard of blocks — texture without a direction. */
function checkerGround(r) {
  return [{ mark: 'quarter', tile: r.pick([4, 5]), ink: 'tx-ground', mask: { type: 'checker', size: r.pick([48, 64, 80]) } }];
}

/* A dot density that fades across the sheet — ordered dithering at ground
   ink, so the field thins out toward one edge or corner. */
function fadeGround(r) {
  const P = r.pick([5, 6]);
  return [
    {
      mark: 'quarter',
      tile: P,
      ink: 'tx-ground',
      mask: { type: 'threshold', field: r.pick(['linear-x', 'linear-y', 'diagonal', 'radial']), order: r.pick([4, 8]), cell: P, invert: r.chance(0.5) },
    },
  ];
}

export const groundArchetypes = {
  even: evenGround,
  band: bandGround,
  patch: patchGround,
  checker: checkerGround,
  fade: fadeGround,
};
// Weighted toward the readable ones; checker and fade are the rarer change-ups.
const GROUND_BAG = ['even', 'even', 'band', 'band', 'patch', 'patch', 'checker', 'fade'];

export function generateGroundLayers(seed, opts = {}) {
  const r = makeRng(seed);
  const picked = r.pick(GROUND_BAG); // always drawn, so bookmarks reproduce exactly
  const name = opts.archetype && groundArchetypes[opts.archetype] ? opts.archetype : picked;
  const layers = groundArchetypes[name](r);
  layers.archetype = name;
  return layers;
}

/* ── Decals ───────────────────────────────────────────────────────────
   Each returns { width, height, layers }. Ink is always `tx-strong`. */

/* seal — a true circular ring, cut with an explicit radius. */
function sealDecal(r) {
  const D = r.pick([48, 56, 64, 72]);
  const outer = D / 2 - 2;
  const thick = r.pick([6, 8, 10]);
  return { width: D, height: D, layers: [{ mark: 'quarter', tile: r.pick([3, 4]), ink: 'tx-strong', mask: { type: 'ring', inner: outer - thick, outer } }] };
}

/* badge — a filled true circle of dots. */
function badgeDecal(r) {
  const D = r.pick([40, 48, 56, 64]);
  return { width: D, height: D, layers: [{ mark: r.chance(0.5) ? 'checker' : 'quarter', tile: r.pick([3, 4, 5]), ink: 'tx-strong', mask: { type: 'disc', cx: 0.5, cy: 0.5, radius: D / 2 - 2 } }] };
}

/* reticle — two concentric rings around a centre dot. A target. */
function reticleDecal(r) {
  const D = r.pick([56, 64, 72, 80]);
  const outer = D / 2 - 2;
  const gap = r.pick([7, 9, 11]);
  const inner = outer - gap;
  return {
    width: D,
    height: D,
    layers: [
      {
        mark: 'quarter',
        tile: r.pick([3, 4]),
        ink: 'tx-strong',
        mask: [
          { type: 'ring', inner: outer - 3, outer },
          { type: 'ring', inner: inner - 3, outer: inner },
          { type: 'disc', cx: 0.5, cy: 0.5, radius: r.pick([4, 6]) },
        ],
      },
    ],
  };
}

/* tab — a checkered rectangle that hangs off an edge like a sticker. */
function tabDecal(r) {
  return { width: r.pick([40, 48, 56, 64]), height: r.pick([16, 18, 22]), layers: [{ mark: 'checker', tile: r.pick([3, 4]), ink: 'tx-strong' }] };
}

/* chip — a rectangle with a true circle set beside it, breaking its box. */
function chipDecal(r) {
  const W = r.pick([84, 92, 104]);
  const H = r.pick([40, 44, 52]);
  return {
    width: W,
    height: H,
    layers: [
      {
        mark: 'quarter',
        tile: r.pick([4, 5]),
        ink: 'tx-strong',
        mask: [
          { type: 'linear', axis: 'x', at: 0.5, side: 'before' },
          { type: 'disc', cx: 0.78, cy: 0.5, radius: r.pick([16, 18, 20]) },
        ],
      },
    ],
  };
}

/* bars — a short stack of ruled bars, like a rank insignia. */
function barsDecal(r) {
  const period = r.pick([8, 10, 12]);
  return { width: r.pick([40, 52, 64]), height: r.pick([28, 34, 40]), layers: [{ mark: 'checker', tile: r.pick([3, 4]), ink: 'tx-strong', mask: { type: 'band', axis: 'y', on: Math.round(period * 0.55), period } }] };
}

/* stripe — a weighted band, for when a hairline is too quiet. */
function stripeDecal(r) {
  return { width: r.pick([160, 200, 240]), height: r.pick([12, 14, 16]), layers: [{ mark: 'checker', tile: r.pick([3, 4]), ink: 'tx-strong' }] };
}

/* block — a small solid square of dots, a plain tag. */
function blockDecal(r) {
  const D = r.pick([28, 36, 44]);
  return { width: D, height: D, layers: [{ mark: r.chance(0.5) ? 'checker' : 'quarter', tile: r.pick([3, 4, 5]), ink: 'tx-strong' }] };
}

export const decalArchetypes = {
  seal: sealDecal,
  badge: badgeDecal,
  reticle: reticleDecal,
  tab: tabDecal,
  chip: chipDecal,
  bars: barsDecal,
  stripe: stripeDecal,
  block: blockDecal,
};
const DECAL_BAG = ['seal', 'badge', 'reticle', 'tab', 'chip', 'bars', 'stripe', 'block'];
// Decals that fill their box to the edges — these get their size snapped to a
// whole number of squares. The circular ones (seal, badge, reticle) already
// leave a transparent margin, so their squares never reach the edge.
const RECT_DECALS = new Set(['tab', 'chip', 'bars', 'stripe', 'block']);

/* Returns { width, height, layers, archetype }. */
export function generateDecalSpec(seed, opts = {}) {
  const r = makeRng(seed);
  const picked = r.pick(DECAL_BAG); // always drawn, so bookmarks reproduce exactly
  const name = opts.archetype && decalArchetypes[opts.archetype] ? opts.archetype : picked;
  const spec = decalArchetypes[name](r);
  spec.archetype = name;
  if (RECT_DECALS.has(name)) {
    const u = unitOf(spec.layers[0]);
    spec.width = snap(spec.width, u);
    spec.height = snap(spec.height, u);
  }
  return spec;
}

/* ── Retro decals ─────────────────────────────────────────────────────
   A decal whose FILL is a retro pattern — an XOR plaid, a cellular
   automaton, a teletext mosaic or a Bayer ramp — clipped into a decal
   shape. The shape is the box + a mask; the fill is one of the retro
   archetypes, re-inked bold and gated by that mask. */

/* Each shape returns its box and the mask that clips the fill (null = the
   whole rectangle). */
const retroShapes = {
  badge: (r) => { const D = r.pick([48, 56, 64, 72]); return { width: D, height: D, mask: { type: 'disc', cx: 0.5, cy: 0.5, radius: D / 2 - 2 } }; },
  block: (r) => { const D = r.pick([40, 48, 56]); return { width: D, height: D, mask: null }; },
  tab: (r) => ({ width: r.pick([56, 64, 72]), height: r.pick([28, 34, 40]), mask: null }),
  stripe: (r) => ({ width: r.pick([160, 200, 240]), height: r.pick([20, 24, 28]), mask: null }),
  chip: (r) => {
    const W = r.pick([84, 92, 104]);
    return { width: W, height: r.pick([44, 52]), mask: [{ type: 'linear', axis: 'x', at: 0.5, side: 'before' }, { type: 'disc', cx: 0.78, cy: 0.5, radius: r.pick([18, 20]) }] };
  },
};
const RETRO_SHAPE_BAG = ['badge', 'badge', 'block', 'tab', 'stripe', 'chip'];
const RETRO_FILL_BAG = ['xor', 'automata', 'teletext', 'bayer', 'maze', 'plasma', 'chevron'];

/* Small clipped shapes need a fill that reliably reads, so invert any grid
   that comes out mostly bare — a sparse pattern becomes its dense negative,
   keeping the same structure and the same single pixel grid. */
function densify(grid) {
  let on = 0;
  let total = 0;
  for (const row of grid) for (const v of row) { on += v; total += 1; }
  if (on / total < 0.4) {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) grid[y][x] = grid[y][x] ? 0 : 1;
    }
  }
  return grid;
}

/* The fill layer for a retro decal or icon — a dense small crop of one retro
   algorithm, inked bold. CA uses `full` so a small shape is never bare. */
function retroFillLayer(fillName, r) {
  const cell = () => r.pick([2, 3]);
  if (fillName === 'xor') return { grid: densify(xorGrid(r)), cell: cell(), ink: 'tx-solid' };
  if (fillName === 'automata') return { grid: densify(caGrid(r, { full: true })), cell: cell(), ink: 'tx-solid' };
  if (fillName === 'teletext') return { grid: densify(teletextGrid(r)), cell: cell(), ink: 'tx-solid' };
  if (fillName === 'maze') return { grid: densify(mazeGrid(r)), cell: cell(), ink: 'tx-solid' };
  if (fillName === 'plasma') return { grid: densify(plasmaGrid(r)), cell: cell(), ink: 'tx-solid' };
  if (fillName === 'chevron') return { grid: densify(chevronGrid(r)), cell: cell(), ink: 'tx-solid' };
  const mask = bayerMaskSpec(r); // bayer — tile = cell so shape clips whole cells
  return { mark: 'solid', tile: mask.cell, ink: 'tx-solid', mask };
}

/* Returns { width, height, layers, archetype (the retro fill), shape }. Pin
   the fill with `{ archetype }` and/or the shape with `{ shape }`. */
export function generateRetroDecalSpec(seed, opts = {}) {
  const r = makeRng(seed);

  // Always draw both picks (order fixed) so a bookmark storing only the fill
  // reproduces the shape too.
  const pickedShape = r.pick(RETRO_SHAPE_BAG);
  const shapeName = opts.shape && retroShapes[opts.shape] ? opts.shape : pickedShape;
  const pickedFill = r.pick(RETRO_FILL_BAG);
  const fillName = RETRO_FILL_BAG.includes(opts.archetype) ? opts.archetype : pickedFill;

  const shape = retroShapes[shapeName](r);
  const layer = retroFillLayer(fillName, r);

  if (layer.grid) {
    // Grid fills (xor / automata / teletext): the pattern IS the mark, so the
    // shape mask clips it directly (mark AND mask).
    if (shape.mask) layer.mask = shape.mask;
  } else {
    // Bayer fill: mark is solid, gated by a threshold. Intersect that with
    // the shape so the ramp is clipped rather than unioned.
    if (shape.mask) layer.mask = { type: 'intersect', of: [layer.mask, shape.mask] };
  }

  // Snap rectangular shapes so their fill squares reach the edge whole; the
  // circular badge already keeps a transparent margin.
  let { width, height } = shape;
  if (shapeName !== 'badge') {
    const u = unitOf(layer);
    width = snap(width, u);
    height = snap(height, u);
  }

  return { width, height, layers: [layer], archetype: fillName, shape: shapeName };
}

/* ── Retro icons ──────────────────────────────────────────────────────
   Iconic silhouettes — stars, moons, hearts, hexagons and the rest — each
   filled with a retro pattern and clipped to its shape. All the geometry is
   a polygon (so stars, crosses and hearts work as easily as squares) except
   the round ones, which are discs; the moon is a disc minus a shifted disc. */

const TAU = Math.PI * 2;

/* Vertices of a regular `sides`-gon, as fractions of the box. */
function regularPoly(sides, radius, rotDeg) {
  const rot = ((rotDeg || 0) * Math.PI) / 180;
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * TAU) / sides;
    pts.push([0.5 + radius * Math.cos(a), 0.5 + radius * Math.sin(a)]);
  }
  return pts;
}

/* A `points`-pointed star, alternating outer and inner radius. */
function starPoly(points, outer, inner, rotDeg) {
  const rot = ((rotDeg == null ? -90 : rotDeg) * Math.PI) / 180;
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const R = i % 2 ? inner : outer;
    const a = rot + (i * Math.PI) / points;
    pts.push([0.5 + R * Math.cos(a), 0.5 + R * Math.sin(a)]);
  }
  return pts;
}

/* Scale/centre a raw vertex list to fill the box with a small margin. */
function fitPoly(raw, margin = 0.08) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of raw) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const s = (1 - 2 * margin) / Math.max(maxX - minX, maxY - minY);
  const ox = (1 - (maxX - minX) * s) / 2 - minX * s;
  const oy = (1 - (maxY - minY) * s) / 2 - minY * s;
  return raw.map(([x, y]) => [x * s + ox, y * s + oy]);
}

/* A heart, sampled from the classic parametric curve (screen-y flipped so
   the point sits at the bottom). */
function heartPoly() {
  const raw = [];
  for (let i = 0; i < 56; i++) {
    const t = (i / 56) * TAU;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    raw.push([x, y]);
  }
  return fitPoly(raw, 0.06);
}

/* A plus/cross, twelve vertices. */
function crossPoly(arm, len) {
  const c = 0.5;
  return [
    [c - arm, c - len], [c + arm, c - len], [c + arm, c - arm], [c + len, c - arm],
    [c + len, c + arm], [c + arm, c + arm], [c + arm, c + len], [c - arm, c + len],
    [c - arm, c + arm], [c - len, c + arm], [c - len, c - arm], [c - arm, c - arm],
  ];
}

/* Each shape returns { field, silhouette }. `field` is the polar geometry the
   organic texture is built from (a disc's radius, or a polygon's vertices);
   `silhouette` is the mask that clips to the exact outline (they differ only
   for the moon, whose field is its full disc but whose outline is a crescent). */
const iconShapes = {
  circle: (r, D) => discShape(D),
  square: () => polyShape(regularPoly(4, 0.44, 45)),
  diamond: () => polyShape(regularPoly(4, 0.48, 0)),
  triangle: () => polyShape(regularPoly(3, 0.5, -90)),
  pentagon: () => polyShape(regularPoly(5, 0.48, -90)),
  hexagon: () => polyShape(regularPoly(6, 0.48, 0)),
  octagon: () => polyShape(regularPoly(8, 0.48, 22.5)),
  star: (r) => polyShape(starPoly(5, 0.5, r.pick([0.19, 0.22, 0.25]), -90)),
  star6: (r) => polyShape(starPoly(6, 0.48, r.pick([0.24, 0.28]), -90)),
  heart: () => polyShape(heartPoly()),
  cross: () => polyShape(crossPoly(0.16, 0.46)),
  moon: (r, D) => {
    const radius = Math.round(D * 0.46);
    const shift = r.pick([0.26, 0.32, 0.38]);
    const silhouette = {
      type: 'intersect',
      of: [
        { type: 'disc', cx: 0.5, cy: 0.5, radius },
        { type: 'not', of: { type: 'disc', cx: 0.5 + shift, cy: 0.42, radius: Math.round(D * 0.44) } },
      ],
    };
    return { field: { shape: 'disc', radius }, silhouette };
  },
};
function discShape(D) {
  const radius = Math.round(D * 0.46);
  return { field: { shape: 'disc', radius }, silhouette: { type: 'disc', cx: 0.5, cy: 0.5, radius } };
}
function polyShape(points) {
  return { field: { shape: 'polygon', points }, silhouette: { type: 'polygon', points } };
}

const ICON_SHAPE_BAG = ['circle', 'square', 'diamond', 'triangle', 'pentagon', 'hexagon', 'octagon', 'star', 'star6', 'heart', 'cross', 'moon'];

/* Materials — the icon is a shaded 3-D solid, dithered. The light is the same
   for all of them (upper-left, toward the viewer), so what changes between
   them is only the SURFACE: how domed or bevelled it is, and how it reflects.
   That is what makes a set read as one lit scene rather than random noise. */
const ICON_MATERIALS = {
  // A shiny pillow — a tight, bright specular highlight and rounded volume.
  glossy: { profile: 'dome', shininess: 42, ks: 0.85, kd: 0.7, ambient: 0.1, bump: 0.55 },
  // Soft, unpolished — pure diffuse volume, no highlight. Reads as clay.
  matte: { profile: 'dome', shininess: 1, ks: 0, kd: 1, ambient: 0.16, bump: 0.5 },
  // A bevelled disc of metal — a hard rim highlight along the lit edge.
  metal: { profile: 'bevel', bevel: 0.3, shininess: 60, ks: 0.9, kd: 0.5, ambient: 0.14, bump: 0.85 },
  // A raised UI button — a flat top with a lit chamfer around it.
  button: { profile: 'bevel', bevel: 0.44, shininess: 22, ks: 0.55, kd: 0.8, ambient: 0.15, bump: 0.7 },
};
const ICON_FILL_BAG = ['glossy', 'matte', 'metal', 'button'];
const ICON_LIGHT = [-0.55, -0.62, 0.56]; // fixed upper-left key light

/* Returns { width, height, layers, archetype (the material), shape }. Pin the
   material with `{ archetype }` and/or the shape with `{ shape }`. */
export function generateIconSpec(seed, opts = {}) {
  const r = makeRng(seed);
  // Always draw both picks (fixed order) so a bookmark reproduces both.
  const pickedShape = r.pick(ICON_SHAPE_BAG);
  const shapeName = opts.shape && iconShapes[opts.shape] ? opts.shape : pickedShape;
  const pickedMat = r.pick(ICON_FILL_BAG);
  const material = ICON_FILL_BAG.includes(opts.archetype) ? opts.archetype : pickedMat;

  const D = r.pick([64, 72, 80]);
  const { field, silhouette } = iconShapes[shapeName](r, D);
  const cell = r.pick([2, 2, 3]); // finer cells read as more detail

  // The shaded material, built on the shape's own signed-distance relief.
  const shaded = { type: 'shaded', ...field, cx: 0.5, cy: 0.5, cell, light: ICON_LIGHT, ...ICON_MATERIALS[material] };
  const fill = { mark: 'solid', tile: cell, ink: 'tx-solid', mask: { type: 'intersect', of: [shaded, silhouette] } };

  return { width: D, height: D, layers: [fill], archetype: material, shape: shapeName };
}

/* The same shaded 3-D materials, but rendered as a HALFTONE with the
   package's square dots instead of a Bayer ramp: the lighting is sliced into
   tone bands, and each band is filled with a denser mark, so shadow reads as
   sparse quarter-dots and highlight as a solid checker. Chunkier and more
   "printed" than the Bayer version. */
export function generateDitherIconSpec(seed, opts = {}) {
  const r = makeRng(seed);
  const pickedShape = r.pick(ICON_SHAPE_BAG);
  const shapeName = opts.shape && iconShapes[opts.shape] ? opts.shape : pickedShape;
  const pickedMat = r.pick(ICON_FILL_BAG);
  const material = ICON_FILL_BAG.includes(opts.archetype) ? opts.archetype : pickedMat;

  const D = r.pick([64, 72, 80]);
  const { field, silhouette } = iconShapes[shapeName](r, D);
  const P = r.pick([4, 5, 6]); // dot pitch — coarser than the Bayer cell
  const half = Math.round(P / 2);
  const mat = ICON_MATERIALS[material];

  // A tonal band: the lit region above `level`, clipped to the outline.
  const band = (level) => ({
    type: 'intersect',
    of: [{ type: 'shaded', ...field, cx: 0.5, cy: 0.5, light: ICON_LIGHT, ...mat, level }, silhouette],
  });

  // Darkest → lightest: each band adds ink, so brightness reads as density.
  const layers = [
    { mark: 'quarter', tile: P, ink: 'tx', mask: band(0.16) },
    { mark: 'quarter', tile: P, offset: [half, half], ink: 'tx', mask: band(0.4) },
    { mark: 'checker', tile: P, ink: 'tx-strong', mask: band(0.62) },
    { mark: 'checker', tile: P, offset: [half, half], ink: 'tx-solid', mask: band(0.82) },
  ];

  return { width: D, height: D, layers, archetype: material, shape: shapeName };
}

export const iconShapeNames = ICON_SHAPE_BAG.slice();
