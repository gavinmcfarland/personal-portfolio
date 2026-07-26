/* The pixel-pattern generator — a second algorithm.

   Where the dither generator paints fine dots clumped into geometry, this
   one paints COARSE solid blocks: a small boolean tile filled with structure
   and repeated across the field. It stays inside the same 1-bit, square,
   ordered aesthetic, but reads as pixel art rather than halftone.

   The quality trick is the same one that fixed the dither generator: never
   fill cells at random — that is just static. Structure comes from
   SYMMETRY. Each archetype decides cells only within a fundamental region
   and reflects them out, so the tile is ornamental by construction and,
   because it repeats, tiles seamlessly. Same seed, same pattern, always. */

import { makeRng } from './rng.js';

const emptyGrid = (n) => Array.from({ length: n }, () => new Array(n).fill(0));

/* ── Archetypes ───────────────────────────────────────────────────────
   Each returns a square boolean grid. */

/* A symmetric ornament — decide one fundamental region, mirror it out under
   one of five symmetry groups. Reads like a woven tile or an identicon. */
function mirrorTile(r) {
  const N = r.pick([6, 7, 8, 9, 10]);
  const density = 0.36 + r.next() * 0.2;
  const sym = r.pick(['mirror-x', 'mirror-y', 'quad', 'rotate', 'diagonal']);
  const g = emptyGrid(N);
  const put = (x, y, v) => { g[((y % N) + N) % N][((x % N) + N) % N] = v; };
  const mid = (N - 1) / 2;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // Only the fundamental region rolls the dice; the rest is a reflection.
      let fundamental;
      if (sym === 'mirror-x') fundamental = x <= mid;
      else if (sym === 'mirror-y') fundamental = y <= mid;
      else if (sym === 'quad') fundamental = x <= mid && y <= mid;
      else if (sym === 'diagonal') fundamental = x <= y;
      else fundamental = y < N / 2 || (y === Math.floor(N / 2) && x <= mid); // rotate
      if (!fundamental) continue;

      const v = r.chance(density) ? 1 : 0;
      put(x, y, v);
      if (sym === 'mirror-x') put(N - 1 - x, y, v);
      else if (sym === 'mirror-y') put(x, N - 1 - y, v);
      else if (sym === 'quad') { put(N - 1 - x, y, v); put(x, N - 1 - y, v); put(N - 1 - x, N - 1 - y, v); }
      else if (sym === 'diagonal') put(y, x, v);
      else put(N - 1 - x, N - 1 - y, v); // rotate 180°
    }
  }
  return g;
}

/* A truchet weave — a grid of KxK tiles, each holding a diagonal line in one
   of two orientations. Neighbouring lines meet at the edges, so the field
   knits itself into continuous maze-like paths. */
function truchetTile(r) {
  const K = r.pick([5, 6, 7, 8]);
  const T = r.pick([2, 3, 4]);
  const thick = r.pick([1, 1, 2]); // line half-thickness, in cells
  const g = emptyGrid(K * T);
  for (let ty = 0; ty < T; ty++) {
    for (let tx = 0; tx < T; tx++) {
      const flip = r.chance(0.5);
      for (let y = 0; y < K; y++) {
        for (let x = 0; x < K; x++) {
          const d = flip ? Math.abs(x - y) : Math.abs(x - (K - 1 - y));
          g[ty * K + y][tx * K + x] = d <= thick ? 1 : 0;
        }
      }
    }
  }
  return g;
}

/* Woven bars — horizontal and vertical bands that lace over and under each
   other, the way a basket does. Bold, regular, unmistakably built. */
function weaveTile(r) {
  const bar = r.pick([2, 3]); // bar thickness in cells
  const gap = r.pick([1, 2]); // space between bars
  const unit = bar + gap;
  const N = unit * 2;
  const g = emptyGrid(N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const hBar = y % unit < bar; // horizontal bar row
      const vBar = x % unit < bar; // vertical bar column
      // Over-under: in the first half the horizontal bar wins, in the second
      // the vertical one does, which is what makes it read as woven.
      const overUnder = (Math.floor(y / unit) + Math.floor(x / unit)) % 2 === 0;
      g[y][x] = (hBar && (overUnder || !vBar)) || (vBar && (!overUnder || !hBar)) ? 1 : 0;
    }
  }
  return g;
}

export const pixelArchetypes = {
  mirror: mirrorTile,
  truchet: truchetTile,
  weave: weaveTile,
};
const ARCHETYPE_BAG = ['mirror', 'mirror', 'truchet', 'truchet', 'weave'];

/* Build a pixel-pattern layer stack from a seed. Pass `{ archetype }` to pin
   the kind of pattern and vary only its parameters. */
export function generatePixelLayers(seed, opts = {}) {
  const r = makeRng(seed);
  // Always draw the pick (see generate.js) so bookmarks reproduce exactly.
  const picked = r.pick(ARCHETYPE_BAG);
  const name = opts.archetype && pixelArchetypes[opts.archetype] ? opts.archetype : picked;
  const grid = pixelArchetypes[name](r);
  const cell = r.int(9, 15); // CSS px per block — coarse enough to read as pixels
  const layers = [{ grid, cell, ink: 'tx-solid' }];
  layers.archetype = name;
  return layers;
}
