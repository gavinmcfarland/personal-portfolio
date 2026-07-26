/* Retro-inspired pattern generators — a third family, four algorithms deep.

   Each one is a distinct piece of computing history, and each stays inside
   the package's 1-bit, square, ordered aesthetic:

     · bayer    — ordered dithering. A gradient broken into a crosshatched
                  ramp by a Bayer threshold matrix. Mac / Game Boy / newsprint.
     · xor      — "munching squares". Bitwise formulas like (x ^ y) & k that
                  fold into nested plaids and tartan diamonds. PDP-1 / demoscene.
     · automata — elementary cellular automata. Wolfram's Rule 90 draws a
                  Sierpinski triangle; other rules draw fractal bands. 8-bit.
     · teletext — 2×3 sixel block mosaics, optionally with the gutters of
                  "separated graphics" mode. 80s broadcast Ceefax.

   Three of the four (xor, automata, teletext) just emit a boolean tile and
   ride the engine's existing `cells` layer. Bayer alone gates a `solid` mark
   with a `threshold` mask so its gradient fills the canvas at render time. */

import { makeRng } from './rng.js';

const grid = (h, w) => Array.from({ length: h }, () => new Array(w).fill(0));

/* ── Bayer ordered dither ─────────────────────────────────────────────
   No boolean tile — the ramp is entirely in the threshold mask, so it can
   span whatever size it is rendered at (a radial vignette that fills the
   frame, not a tiled blob). */
export function bayerMaskSpec(r) {
  return {
    type: 'threshold',
    field: r.pick(['radial', 'linear-x', 'linear-y', 'diagonal', 'angular']),
    order: r.pick([2, 4, 4, 8]), // 4 is the sweet spot, so weight it
    cell: r.pick([2, 3, 4]), // pixel size of each dither block
    invert: r.chance(0.5),
  };
}

function bayerLayers(r) {
  const mask = bayerMaskSpec(r);
  // tile = the dither cell, so the solid mark's square blocks line up with
  // the threshold and stay whole when a shape is intersected in.
  return [{ mark: 'solid', tile: mask.cell, ink: 'tx-solid', mask }];
}

/* ── XOR munching squares ─────────────────────────────────────────────
   A power-of-two tile so the bitwise pattern wraps seamlessly. A handful of
   formula variants, each a different retro one-liner. */
export function xorGrid(r) {
  const N = 1 << r.int(4, 6); // 16–64
  const variant = r.pick(['xor', 'mul', 'and', 'xor-mod', 'sum']);
  const k = 1 << r.int(1, 4);
  const m = r.pick([3, 5, 6, 7, 9]);
  const t = Math.max(1, Math.floor(m / 2));
  const g = grid(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let on;
      if (variant === 'xor') on = ((x ^ y) & k) !== 0;
      else if (variant === 'mul') on = ((x * y) & k) !== 0;
      else if (variant === 'and') on = ((x & y) & k) !== 0;
      else if (variant === 'xor-mod') on = (x ^ y) % m < t;
      else on = ((x + y) & k) !== 0; // diagonal stripes
      g[y][x] = on ? 1 : 0;
    }
  }
  return g;
}

/* ── Elementary cellular automata ─────────────────────────────────────
   A 1-D row evolved downward under a Wolfram rule, wrapping toroidally so
   the tile repeats horizontally. A single centre seed draws one clean
   triangle; a random seed fills the field with self-similar structure. */
const CA_RULES = [90, 30, 150, 18, 22, 60, 105, 45, 73, 182, 94];
/* `opts.full` forces a dense random seed row (skipping the single-centre
   triangle), so a small crop — such as a decal fill — is never mostly bare. */
export function caGrid(r, opts = {}) {
  const N = r.pick([40, 48, 56, 64]);
  const rule = r.pick(CA_RULES);
  let cur;
  if (!opts.full && r.chance(0.4)) {
    cur = new Array(N).fill(0);
    cur[N >> 1] = 1; // single centred seed → a triangle
  } else {
    const d = (opts.full ? 0.42 : 0.3) + r.next() * (opts.full ? 0.13 : 0.3);
    cur = Array.from({ length: N }, () => (r.chance(d) ? 1 : 0));
  }
  const rows = [cur.slice()];
  for (let s = 1; s < N; s++) {
    const next = new Array(N);
    for (let i = 0; i < N; i++) {
      const l = cur[(i - 1 + N) % N];
      const c = cur[i];
      const rt = cur[(i + 1) % N];
      next[i] = (rule >> ((l << 2) | (c << 1) | rt)) & 1;
    }
    rows.push(next);
    cur = next;
  }
  return rows;
}

/* ── Teletext / Ceefax sixel mosaic ───────────────────────────────────
   Each character is 2 blocks wide by 3 tall — the teletext graphics cell.
   Blocks are chosen with horizontal mirror symmetry so the mosaic reads as
   an ornament rather than noise, then expanded to cells; "separated
   graphics" leaves a one-cell gutter around each lit block. */
export function teletextGrid(r) {
  const cols = r.pick([3, 4, 5]);
  const rows = cols;
  const B = r.pick([3, 4]); // cells per block edge
  const sep = r.chance(0.5) ? 1 : 0; // separated-graphics gutter
  const density = 0.42 + r.next() * 0.18;

  const bx = cols * 2;
  const by = rows * 3;
  const on = grid(by, bx);
  const mid = (bx - 1) / 2;
  for (let y = 0; y < by; y++) {
    for (let x = 0; x <= mid; x++) {
      const v = r.chance(density) ? 1 : 0;
      on[y][x] = v;
      on[y][bx - 1 - x] = v;
    }
  }

  const g = grid(by * B, bx * B);
  for (let y = 0; y < by; y++) {
    for (let x = 0; x < bx; x++) {
      if (!on[y][x]) continue;
      for (let iy = 0; iy < B; iy++) {
        for (let ix = 0; ix < B; ix++) {
          if (sep && (ix < 1 || iy < 1)) continue; // gutter on top/left
          g[y * B + iy][x * B + ix] = 1;
        }
      }
    }
  }
  return g;
}

/* ── Maze ──────────────────────────────────────────────────────────────
   A recursive-backtracker maze. Passage cells sit on odd coordinates; the
   walls between them are knocked down as the carver wanders, leaving the
   solvable single-path maze of early games and screensavers. */
export function mazeGrid(r) {
  const m = r.pick([8, 10, 12, 14]); // cells per side
  const N = 2 * m + 1;
  const g = grid(N, N).map((row) => row.fill(1)); // 1 = wall
  const stack = [[1, 1]];
  g[1][1] = 0;
  const DIRS = [[0, -2], [0, 2], [-2, 0], [2, 0]];
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const open = [];
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx > 0 && ny > 0 && nx < N - 1 && ny < N - 1 && g[ny][nx] === 1) open.push([nx, ny, dx, dy]);
    }
    if (!open.length) { stack.pop(); continue; }
    const [nx, ny, dx, dy] = open[r.int(0, open.length - 1)];
    g[cy + dy / 2][cx + dx / 2] = 0; // knock the wall between
    g[ny][nx] = 0; // and enter the cell
    stack.push([nx, ny]);
  }
  return g;
}

/* ── Life ──────────────────────────────────────────────────────────────
   Conway's Game of Life run a few generations from a random soup on a
   torus — the frozen still-lifes, blinkers and debris of a screensaver. */
export function lifeGrid(r) {
  const N = r.pick([40, 48, 56, 64]);
  const d = 0.28 + r.next() * 0.14;
  let cur = grid(N, N).map((row) => row.map(() => (r.chance(d) ? 1 : 0)));
  const gens = r.int(2, 6);
  for (let s = 0; s < gens; s++) {
    const next = grid(N, N);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx || dy) n += cur[(y + dy + N) % N][(x + dx + N) % N];
          }
        }
        next[y][x] = cur[y][x] ? (n === 2 || n === 3 ? 1 : 0) : n === 3 ? 1 : 0;
      }
    }
    cur = next;
  }
  return cur;
}

/* ── Invaders ──────────────────────────────────────────────────────────
   A sheet of little arcade sprites — each a horizontally-mirrored blob on
   its own tile, so a wall of them tiles cleanly. */
export function invadersGrid(r) {
  const sw = r.pick([5, 7]); // sprite width (odd, so it mirrors)
  const sh = r.pick([4, 5, 6]);
  const gap = r.pick([1, 2]);
  const cols = r.pick([2, 3]);
  const rows = cols;
  const cw = sw + gap;
  const ch = sh + gap;
  const g = grid(rows * ch, cols * cw);
  const half = Math.ceil(sw / 2);
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const d = 0.44 + r.next() * 0.16;
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < half; x++) {
          const v = r.chance(d) ? 1 : 0;
          g[cy * ch + y][cx * cw + x] = v;
          g[cy * ch + y][cx * cw + (sw - 1 - x)] = v;
        }
      }
    }
  }
  return g;
}

/* ── Plasma ────────────────────────────────────────────────────────────
   Summed sine waves — the demoscene plasma — broken into 1 bit by a 4×4
   Bayer dither. Integer frequencies keep it seamlessly tileable. */
const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export function plasmaGrid(r) {
  const N = r.pick([48, 64, 80]);
  const a = r.int(1, 3);
  const b = r.int(1, 3);
  const c = r.int(1, 4);
  const g = grid(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const v = y / N;
      const s = Math.sin(2 * Math.PI * a * u) + Math.sin(2 * Math.PI * b * v) + Math.sin(2 * Math.PI * c * (u + v));
      const val = (s + 3) / 6; // → 0..1
      g[y][x] = val > (BAYER4[y % 4][x % 4] + 0.5) / 16 ? 1 : 0;
    }
  }
  return g;
}

/* ── Chevron ───────────────────────────────────────────────────────────
   Zigzag stripes — a triangle wave shears the stripe offset across x, the
   op-art chevron of a 1970s knit. Divisor-sized so it tiles. */
export function chevronGrid(r) {
  const N = 48;
  const amp = r.pick([6, 8, 12]); // divisors of 48
  const stripe = r.pick([6, 8, 12]);
  const on = Math.max(2, Math.round(stripe * 0.5));
  const g = grid(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const tri = Math.abs((x % (2 * amp)) - amp); // triangle wave 0..amp
      g[y][x] = (y + tri) % stripe < on ? 1 : 0;
    }
  }
  return g;
}

export const retroArchetypes = {
  bayer: bayerLayers,
  xor: (r) => [{ grid: xorGrid(r), cell: r.pick([2, 3, 4]), ink: 'tx-solid' }],
  automata: (r) => [{ grid: caGrid(r), cell: r.pick([3, 4, 5]), ink: 'tx-solid' }],
  teletext: (r) => [{ grid: teletextGrid(r), cell: r.pick([2, 3]), ink: 'tx-solid' }],
  maze: (r) => [{ grid: mazeGrid(r), cell: r.pick([3, 4, 5]), ink: 'tx-solid' }],
  life: (r) => [{ grid: lifeGrid(r), cell: r.pick([3, 4, 5]), ink: 'tx-solid' }],
  invaders: (r) => [{ grid: invadersGrid(r), cell: r.pick([4, 5, 6]), ink: 'tx-solid' }],
  plasma: (r) => [{ grid: plasmaGrid(r), cell: r.pick([2, 3]), ink: 'tx-solid' }],
  chevron: (r) => [{ grid: chevronGrid(r), cell: r.pick([3, 4]), ink: 'tx-solid' }],
};
const ARCHETYPE_BAG = ['bayer', 'xor', 'automata', 'teletext', 'maze', 'life', 'invaders', 'plasma', 'chevron'];

/* Build a retro-pattern layer stack from a seed. Pass `{ archetype }` to pin
   the algorithm and vary only its parameters. */
export function generateRetroLayers(seed, opts = {}) {
  const r = makeRng(seed);
  // Always draw the pick (see generate.js) so bookmarks reproduce exactly.
  const picked = r.pick(ARCHETYPE_BAG);
  const name = opts.archetype && retroArchetypes[opts.archetype] ? opts.archetype : picked;
  const layers = retroArchetypes[name](r);
  layers.archetype = name;
  return layers;
}
