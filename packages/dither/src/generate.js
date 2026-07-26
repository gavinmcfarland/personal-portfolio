/* The auto-generator.

   The six named fields are hand-tuned; this is where new ones come from.
   The hard-won lesson is that "random but well-formed" is not enough — a
   base grid at one pitch and a mask at some unrelated size read as MESS,
   because the mask boundary cuts through dots instead of running along the
   grid, and two coprime pitches beat against each other as moiré.

   What the good fields actually share is stricter than the stated rules:

     · every pitch in a field is HARMONIC — the base pitch P, and coarser
       layers only ever at 2P (never P + something arbitrary);
     · every mask size is an INTEGER MULTIPLE of P, so clumping starts and
       stops on a dot edge and the field reads as built on a grid;
     · a field commits to ONE structure — a checker, a circle grid, or
       bands — and at most restates it at a second scale, rather than
       stacking two different geometries that fight.

   So the generator does not combine masks freely. It picks one of a few
   ARCHETYPES — each mirroring the construction of a hand-drawn field — and
   varies only the pitch, the mask scale (in multiples of the pitch) and the
   ink. That constraint is the whole reason a generated field looks like it
   belongs beside the six. Same seed, same field, always. */

import { makeRng } from './rng.js';

/* Base pitches worth building on — fine enough to read as dither, coarse
   enough that the dots survive being downscaled in a browser. */
const BASE_PITCHES = [4, 5, 6, 7, 8];

const half = (p) => Math.round(p / 2);

/* ── Archetypes ───────────────────────────────────────────────────────
   Each returns a layer stack. Every mask size is P * k, so it aligns to the
   base grid; coarser layers are always at 2P, so they stay harmonic. */

/* Checkerboard clumping, optionally restated on a 2–3× coarser checker —
   the construction behind fields `grid` and `plan`. */
function checkerClump(r) {
  const P = r.pick(BASE_PITCHES);
  const k = r.int(6, 12); // clump cell = P*k → ~30–96px
  const layers = [
    { mark: 'quarter', tile: P, ink: 'tx' },
    {
      mark: r.chance(0.5) ? 'checker' : 'quarter',
      tile: P,
      offset: r.chance(0.4) ? [half(P), half(P)] : undefined,
      ink: 'tx-strong',
      mask: { type: 'checker', size: P * k },
    },
  ];
  if (r.chance(0.5)) {
    layers.push({
      mark: 'quarter',
      tile: 2 * P,
      ink: 'tx-strong',
      mask: { type: 'checker', size: P * k * r.pick([2, 3]) },
    });
  }
  return layers;
}

/* A grid of true circles, optionally a second concentric grid of smaller
   circles at the SAME pitch — the construction behind `grid` and `lens`.
   Both circle grids share one `size` so they stay concentric. */
function circleField(r) {
  const P = r.pick(BASE_PITCHES);
  const size = P * r.int(10, 16);
  const radius = Math.round(size * (0.22 + r.next() * 0.1)); // < size/2, never touching
  const layers = [
    { mark: 'quarter', tile: P, ink: 'tx' },
    { mark: 'checker', tile: P, ink: 'tx-strong', mask: { type: 'circleGrid', radius, size } },
  ];
  if (r.chance(0.5)) {
    layers.push({
      mark: 'quarter',
      tile: 2 * P,
      ink: 'tx-strong',
      mask: { type: 'circleGrid', radius: Math.round(radius * 0.45), size },
    });
  }
  return layers;
}

/* Horizontal or vertical bands, optionally with a heavier rule line running
   through the gap — the construction behind `rule` and `moire`. */
function bandField(r) {
  const P = r.pick(BASE_PITCHES);
  const period = P * r.int(8, 14);
  const axis = r.pick(['x', 'y']);
  const on = Math.round(period * (0.42 + r.next() * 0.16));
  const layers = [
    { mark: 'quarter', tile: P, ink: 'tx' },
    { mark: 'checker', tile: P, ink: 'tx-strong', mask: { type: 'band', axis, on, period } },
  ];
  if (r.chance(0.5)) {
    const from = on + Math.round((period - on) * 0.3);
    const to = Math.min(period, from + Math.max(P, Math.round(period * 0.12)));
    layers.push({
      mark: 'quarter',
      tile: 2 * P,
      ink: 'tx-strong',
      mask: { type: 'bandRange', axis, from, to, period },
    });
  }
  return layers;
}

/* A fine even grid with a single soft-centred pool of heavier dots — the
   quietest construction, behind `pool`. Not tileable (field-relative). */
function poolField(r) {
  const P = r.pick([4, 5, 6]);
  return [
    { mark: 'quarter', tile: P, ink: 'tx' },
    {
      mark: 'quarter',
      tile: P,
      offset: [half(P), half(P)],
      ink: 'tx-strong',
      mask: { type: 'circleCenter', radius: r.int(28, 46) * 2 },
    },
  ];
}

/* The archetypes, weighted: the grid-based ones are the workhorses; the
   centred pool is a rarer, quieter change of pace. */
export const archetypes = {
  checker: checkerClump,
  circles: circleField,
  bands: bandField,
  pool: poolField,
};
const ARCHETYPE_BAG = ['checker', 'checker', 'circles', 'circles', 'bands', 'pool'];

/* Build a clean, well-formed layer stack from a seed. Pass
   `{ archetype: 'circles' }` to pin the construction and vary only its
   parameters. */
export function generateLayers(seed, opts = {}) {
  const r = makeRng(seed);
  /* Always draw the archetype pick, even when one is pinned, so the RNG
     stream is identical whether or not a caller pins the same archetype.
     That is what lets a bookmark store the resolved archetype and reproduce
     a field byte-for-byte. The chosen name rides back on the array. */
  const picked = r.pick(ARCHETYPE_BAG);
  const name = opts.archetype && archetypes[opts.archetype] ? opts.archetype : picked;
  const layers = archetypes[name](r);
  layers.archetype = name;
  return layers;
}

/* Collect the integer periods a field repeats on, so a tile can be cut that
   wraps seamlessly. Field-relative masks (centred circles, rings, hard
   stops) have no period — a field using one cannot tile, and reports so. */
function periodsOf(layers) {
  const periods = [];
  let tileable = true;
  for (const layer of layers) {
    if (layer.grid) {
      const cell = layer.cell || 8;
      periods.push(layer.grid[0].length * cell, layer.grid.length * cell);
    } else {
      periods.push(layer.tile || 6);
    }
    const masks = Array.isArray(layer.mask) ? layer.mask : layer.mask ? [layer.mask] : [];
    for (const m of masks) {
      if (m.type === 'checker' || m.type === 'circleGrid') periods.push(m.size);
      else if (m.type === 'band' || m.type === 'bandRange') periods.push(m.period);
      else tileable = false; // circleCenter, ring, linear are field-relative
    }
  }
  return { periods, tileable };
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a / gcd(a, b)) * b;

/* The smallest square that repeats every layer's grid, capped so a pile of
   coprime pitches can't ask for a 4000px tile. Returns null when the field
   is field-relative and therefore not tileable. */
export function seamlessSize(layers, cap = 512) {
  const { periods, tileable } = periodsOf(layers);
  if (!tileable || !periods.length) return null;
  let size = periods.reduce((a, b) => lcm(a, b), 1);
  while (size > cap) size = Math.round(size / 2); // fall back to a partial repeat
  return Math.max(size, Math.max(...periods));
}
