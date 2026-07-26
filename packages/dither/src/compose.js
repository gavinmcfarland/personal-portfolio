/* Compositions — small generative artworks built from REPEATED geometric
   primitives, the way a set of design "spots" is: a grid of triangles, a
   stacked tower, a nest of concentric arcs, a column of circles. Each
   primitive is then given detail two ways:

     · organic — the shape's own polar texture (nested contours, rays), so a
       triangle is filled with nested triangles, a circle with rings;
     · dither  — a square-dot halftone whose DENSITY encodes a tone, so a
       nest of arcs reads as a 1-bit gradient the way the coloured reference
       reads as a colour ramp.

   The composition decides WHERE the shapes go and what tone each carries;
   the detail mode decides how each one is filled. Same seed, same artwork. */

import { makeRng } from './rng.js';

/* ── Positioned primitives ────────────────────────────────────────────
   Each returns { mask (the silhouette), field (the organic polar field),
   cx, cy (centre, as fractions) }. Radii are fractions of the box × D. */

function rect(cx, cy, w, h) {
  const p = [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]];
  return { mask: { type: 'polygon', points: p }, field: { shape: 'polygon', points: p }, cx, cy };
}

/* A right triangle — half a cell, in one of four corner orientations. */
function tri(cx, cy, s, rot) {
  const h = s / 2;
  const TL = [cx - h, cy - h];
  const TR = [cx + h, cy - h];
  const BR = [cx + h, cy + h];
  const BL = [cx - h, cy + h];
  const p = [[TL, TR, BR], [TR, BR, BL], [BR, BL, TL], [BL, TL, TR]][rot & 3];
  return { mask: { type: 'polygon', points: p }, field: { shape: 'polygon', points: p }, cx, cy };
}

/* An upward isosceles triangle — a roof/spire. */
function spire(cx, cy, w, h) {
  const p = [[cx, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]];
  return { mask: { type: 'polygon', points: p }, field: { shape: 'polygon', points: p }, cx, cy: cy + h / 6 };
}

function disc(cx, cy, rFrac, D) {
  return { mask: { type: 'disc', cx, cy, radius: rFrac * D }, field: { shape: 'disc', radius: rFrac * D }, cx, cy };
}

function halfDisc(cx, cy, rFrac, D, axis, side) {
  const d = disc(cx, cy, rFrac, D);
  const at = axis === 'y' ? cy : cx;
  return { mask: { type: 'intersect', of: [d.mask, { type: 'linear', axis, at, side }] }, field: d.field, cx, cy };
}

function ring(cx, cy, innerF, outerF, D) {
  return { mask: { type: 'ring', cx, cy, inner: innerF * D, outer: outerF * D }, field: { shape: 'disc', radius: outerF * D }, cx, cy };
}

function arc(cx, cy, innerF, outerF, D, axis, side) {
  const rg = ring(cx, cy, innerF, outerF, D);
  const at = axis === 'y' ? cy : cx;
  return { mask: { type: 'intersect', of: [rg.mask, { type: 'linear', axis, at, side }] }, field: rg.field, cx, cy };
}

/* ── Composition archetypes ───────────────────────────────────────────
   These are ORGANISED, not scattered: everything snaps to one square unit
   grid, groups repeat a single primitive, and stacks share a baseline. Each
   element carries a `tone` (0…1) used by the dither finish. */

/* A dome-up half-disc sitting on the bottom of a cell centred at (cx, cy). */
function domeCell(cx, cy, U, D) {
  const base = cy + U / 2;
  return halfDisc(cx, base, U * 0.47, D, 'y', 'before');
}

/* The reference layout: three bottom-aligned columns, each a single primitive
   repeated to its own height, sized to fill and centred in the frame — a
   bar chart built from geometry. Bold, distinct tone per column. */
function stacksComp(r, D) {
  const baseY = 0.94;
  const U = r.pick([0.24, 0.26, 0.28]); // one shared unit, large enough to read
  const gap = U * 0.16;

  // Three columns in a fixed left-to-right order, each its own primitive.
  const order = shuffle3(r, ['dome', 'square', 'spire']);
  const widths = order.map((k) => (k === 'square' ? r.pick([1, 2]) : 1));
  const heights = [r.int(3, 4), r.int(3, 4), r.int(2, 3)];
  const tones = [0.5, 0.7, 0.9];

  const totalW = widths.reduce((a, b) => a + b, 0) * U + (order.length - 1) * gap;
  let x = 0.5 - totalW / 2; // centre the whole group
  const els = [];
  for (let g = 0; g < order.length; g++) {
    const kind = order[g];
    const colW = U * widths[g];
    const cx = x + colW / 2;
    for (let k = 0; k < heights[g]; k++) {
      const cy = baseY - U * (k + 0.5);
      let prim;
      if (kind === 'square') prim = rect(cx, cy, colW * 0.94, U * 0.94);
      else if (kind === 'dome') prim = domeCell(cx, cy, U, D);
      else prim = spire(cx, cy, colW * 0.94, U * 0.94);
      prim.tone = tones[g];
      els.push(prim);
    }
    x += colW + gap;
  }
  return els;
}

/* A deterministic 3-element shuffle from the rng. */
function shuffle3(r, a) {
  const s = a.slice();
  for (let i = s.length - 1; i > 0; i--) {
    const j = r.int(0, i);
    const t = s[i];
    s[i] = s[j];
    s[j] = t;
  }
  return s;
}

/* A clean N×N grid: ONE primitive, ONE orientation, tone ramping evenly
   across the diagonal — like a woven sampler, not a scatter. */
function gridComp(r, D) {
  const N = r.pick([4, 5, 6]);
  const m = 0.05;
  const cell = (1 - 2 * m) / N;
  const kind = r.pick(['tri', 'square', 'dome']);
  const rot = r.int(0, 3);
  const els = [];
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const cx = m + cell * (i + 0.5);
      const cy = m + cell * (j + 0.5);
      let prim;
      if (kind === 'square') prim = rect(cx, cy, cell * 0.9, cell * 0.9);
      else if (kind === 'dome') prim = domeCell(cx, cy, cell, D);
      else prim = tri(cx, cy, cell * 0.92, rot);
      prim.tone = (i + j) / (2 * (N - 1) || 1);
      els.push(prim);
    }
  }
  return els;
}

/* A centred stack of squares under a spire — a clean obelisk/pencil, tone
   ramping up its height. */
function towerComp(r, D) {
  const K = r.pick([4, 5, 6]);
  const w = r.pick([0.28, 0.34]);
  const cx = 0.5;
  const m = 0.05;
  const h = (1 - 2 * m) / (K + 1);
  const els = [];
  const top = spire(cx, m + h * 0.5, w, h);
  top.tone = 1;
  els.push(top);
  for (let k = 0; k < K; k++) {
    const p = rect(cx, m + h * (k + 1.5), w, h * 0.96);
    p.tone = 1 - (k + 1) / (K + 1);
    els.push(p);
  }
  return els;
}

/* Concentric arcs (a rainbow) or rings (a tunnel), evenly stepped, tone
   brightening toward the centre — a 1-bit gradient of repeated shapes. */
function nestedComp(r, D) {
  const M = r.pick([5, 6, 7]);
  const rainbow = r.chance(0.5);
  const cx = 0.5;
  const cy = rainbow ? 0.66 : 0.5;
  const maxR = rainbow ? 0.5 : 0.48;
  const els = [];
  for (let k = 0; k < M; k++) {
    const innerF = (maxR * k) / M;
    const outerF = (maxR * (k + 1)) / M;
    const prim = rainbow ? arc(cx, cy, innerF, outerF, D, 'y', 'before') : ring(cx, cy, innerF, outerF, D);
    prim.tone = 1 - k / (M - 1 || 1);
    els.push(prim);
  }
  return els;
}

const ARCHETYPES = { stacks: stacksComp, grid: gridComp, tower: towerComp, nested: nestedComp };
const ARCHETYPE_BAG = ['stacks', 'stacks', 'grid', 'tower', 'nested'];

/* ── Detail → layers ──────────────────────────────────────────────────*/

/* A tone rendered as square-dot density: sparse quarter-dots for a dim
   element, a solid checker for a bright one. */
function ditherLayer(el, P, half) {
  const t = el.tone;
  if (t < 0.2) return { mark: 'quarter', tile: P, ink: 'tx', mask: el.mask };
  if (t < 0.4) return { mark: 'quarter', tile: P, offset: [half, half], ink: 'tx-strong', mask: el.mask };
  if (t < 0.6) return { mark: 'checker', tile: P, ink: 'tx-strong', mask: el.mask };
  if (t < 0.8) return { mark: 'checker', tile: P, ink: 'tx-solid', mask: el.mask };
  return { mark: 'solid', tile: P, ink: 'tx-solid', mask: el.mask };
}

/* An element filled with one coherent organic texture, clipped to its shape.
   The whole composition shares a `style`, so it reads as one artwork. */
function organicLayer(el, cell, style, rings) {
  const organic = { type: 'organic', ...el.field, cx: el.cx, cy: el.cy, style, cell, rings, rays: 8, arms: 2, invert: false };
  return { mark: 'solid', tile: cell, ink: 'tx-solid', mask: { type: 'intersect', of: [organic, el.mask] } };
}

/* Returns { width, height, layers, archetype, detail }. `detail` is
   'organic' or 'dither'; pin the arrangement with `{ archetype }`. */
export function generateCompositionSpec(seed, opts = {}) {
  const r = makeRng(seed);
  const picked = r.pick(ARCHETYPE_BAG); // always drawn, so bookmarks reproduce
  const arch = opts.archetype && ARCHETYPES[opts.archetype] ? opts.archetype : picked;
  const detail = opts.detail === 'dither' ? 'dither' : 'organic';

  const D = r.pick([200, 220, 240]); // render big — these are posters, not spots
  const P = r.pick([4, 5, 6]);
  const half = Math.round(P / 2);
  const cell = r.pick([2, 3]);
  const style = r.pick(['contours', 'rays', 'spiral']); // one for the whole piece
  const rings = r.int(3, 5);

  const elements = ARCHETYPES[arch](r, D);
  const layers = elements.map((el) => (detail === 'dither' ? ditherLayer(el, P, half) : organicLayer(el, cell, style, rings)));

  return { width: D, height: D, layers, archetype: arch, detail };
}
