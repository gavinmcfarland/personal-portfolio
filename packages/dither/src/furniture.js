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

/* The fill layer for a retro decal — a dense small crop of one retro
   algorithm, inked bold. CA uses `full` so a small shape is never bare. */
function retroFillLayer(fillName, r) {
  if (fillName === 'xor') return { grid: xorGrid(r), cell: r.pick([2, 3]), ink: 'tx-solid' };
  if (fillName === 'automata') return { grid: caGrid(r, { full: true }), cell: r.pick([2, 3]), ink: 'tx-solid' };
  if (fillName === 'teletext') return { grid: teletextGrid(r), cell: r.pick([2, 3]), ink: 'tx-solid' };
  if (fillName === 'maze') return { grid: mazeGrid(r), cell: r.pick([2, 3]), ink: 'tx-solid' };
  if (fillName === 'plasma') return { grid: plasmaGrid(r), cell: r.pick([2, 3]), ink: 'tx-solid' };
  if (fillName === 'chevron') return { grid: chevronGrid(r), cell: r.pick([2, 3]), ink: 'tx-solid' };
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
