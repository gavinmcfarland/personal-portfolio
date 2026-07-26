/* The catalogue the mockup ships, transcribed from CSS into layer specs.

   FIELDS a–f are the six 1-bit plates. They are not interchangeable: each
   was tuned so its clumping reads at the size the entry prints it. GROUNDS
   are the same engine at about a third the ink, meant to sit behind running
   text. DECALS are small marks meant to be placed half off the edge of
   something — a seal, a tab, a chip, a weighted stripe.

   Each entry is a `layers` array (plus, for grounds and decals, a natural
   size and default ink). A field is deliberately the base grid plus one or
   two coarser grids masked into repeating geometry, so it has structure at
   more than one scale. */

export const fields = {
  /* Square dots clumped by a 72px checkerboard, with true circles cut into
     a coarse checker on top. The reference field, and the one Scale crops. */
  a: [
    { mark: 'quarter', tile: 6, ink: 'tx' },
    { mark: 'quarter', tile: 6, offset: [3, 3], ink: 'tx-strong', mask: { type: 'checker', size: 72 } },
    { mark: 'checker', tile: 10, ink: 'tx-strong', mask: { type: 'circleGrid', radius: 18, size: 96 } },
  ],

  /* Horizontal bands at a fixed 62px repeat — a wide band of checker with a
     ruled line of heavier squares running through it. Reads as ruled paper. */
  b: [
    { mark: 'quarter', tile: 5, ink: 'tx' },
    { mark: 'checker', tile: 8, ink: 'tx-strong', mask: { type: 'band', axis: 'y', on: 26, period: 62 } },
    { mark: 'quarter', tile: 12, ink: 'tx-strong', mask: { type: 'bandRange', axis: 'y', from: 34, to: 46, period: 62 } },
  ],

  /* The quietest field: a fine even grid with a single soft-centred pool of
     heavier dots. Use it when the plate is mostly there to be a surface. */
  c: [
    { mark: 'quarter', tile: 4, ink: 'tx' },
    { mark: 'quarter', tile: 4, offset: [2, 2], ink: 'tx-strong', mask: { type: 'circleCenter', radius: 74 } },
  ],

  /* Two grids of true circles at one pitch — a coarse checker inside the big
     circles, single heavy squares inside the small ones. */
  d: [
    { mark: 'quarter', tile: 7, ink: 'tx' },
    { mark: 'checker', tile: 7, ink: 'tx-strong', mask: { type: 'circleGrid', radius: 26, size: 78 } },
    { mark: 'quarter', tile: 14, ink: 'tx-strong', mask: { type: 'circleGrid', radius: 11, size: 78 } },
  ],

  /* Two fine grids beaten slightly out of phase, cut into vertical columns —
     a moiré that stays legible because both grids are hard-edged squares. */
  e: [
    { mark: 'quarter', tile: 7, ink: 'tx' },
    { mark: 'quarter', tile: 8, ink: 'tx' },
    { mark: 'checker', tile: 9, ink: 'tx-strong', mask: { type: 'band', axis: 'x', on: 30, period: 70 } },
  ],

  /* Two checkerboards of rectangles, at 40px and 120px — a modular field
     that looks like a plan of a building at two zoom levels at once. */
  f: [
    { mark: 'quarter', tile: 5, ink: 'tx' },
    { mark: 'checker', tile: 5, ink: 'tx-strong', mask: { type: 'checker', size: 40 } },
    { mark: 'quarter', tile: 10, ink: 'tx-strong', mask: { type: 'checker', size: 120 } },
  ],
};

/* Field order and the honest one-line note beside each, for gallery labels. */
export const fieldMeta = [
  { id: 'a', name: 'grid', use: 'The reference field. Checkerboard clumping with circles cut on top.' },
  { id: 'b', name: 'rule', use: 'Horizontal bands on a 62px repeat. Reads as ruled paper.' },
  { id: 'c', name: 'pool', use: 'A fine even grid with one soft-centred pool. The quietest of the six.' },
  { id: 'd', name: 'lens', use: 'Two grids of true circles — coarse checker in the big ones, single squares in the small.' },
  { id: 'e', name: 'moire', use: 'Two fine grids out of phase, cut into columns.' },
  { id: 'f', name: 'plan', use: 'Two checkerboards of rectangles at 40px and 120px.' },
];

/* Grounds — the same dots at about a third the ink, for behind running
   text. Each carries the size the mockup pours it at. */
export const grounds = {
  even: {
    width: 320,
    height: 160,
    layers: [{ mark: 'quarter', tile: 5, ink: 'tx-ground' }],
  },
  patch: {
    width: 320,
    height: 160,
    layers: [{ mark: 'quarter', tile: 6, ink: 'tx-ground', mask: { type: 'linear', axis: 'x', at: 0.46, side: 'after' } }],
  },
  band: {
    width: 320,
    height: 160,
    layers: [{ mark: 'quarter', tile: 5, ink: 'tx-ground', mask: { type: 'band', axis: 'y', on: 22, period: 44 } }],
  },
};

/* Decals — small marks stamped half off an edge. Sized as the mockup sizes
   them; render these with `background: null` so they overlap what is under
   them. */
export const decals = {
  /* A true circular ring — approved, current, finished. */
  seal: {
    width: 64,
    height: 64,
    background: null,
    layers: [{ mark: 'quarter', tile: 4, ink: 'tx-strong', mask: { type: 'ring', inner: 13, outer: 25 } }],
  },
  /* A checkered rectangle that hangs off an edge like a sticker. */
  tab: {
    width: 46,
    height: 18,
    background: null,
    layers: [{ mark: 'checker', tile: 4, ink: 'tx-strong' }],
  },
  /* A rectangle with a true circle set beside it, breaking the box. */
  chip: {
    width: 92,
    height: 44,
    background: null,
    layers: [
      {
        mark: 'quarter',
        tile: 5,
        ink: 'tx-strong',
        mask: [
          { type: 'linear', axis: 'x', at: 0.52, side: 'before' },
          { type: 'circleGrid', radius: 20, size: 92 },
        ],
      },
    ],
  },
  /* A weighted band, for when a hairline is too quiet. */
  stripe: {
    width: 240,
    height: 14,
    background: null,
    layers: [{ mark: 'checker', tile: 4, ink: 'tx-strong' }],
  },
};

/* The layers for a named field, ready to drop into a texture spec. */
export function fieldLayers(id) {
  const layers = fields[id];
  if (!layers) throw new Error(`Unknown field "${id}". Try one of: ${Object.keys(fields).join(', ')}`);
  return layers.map((l) => ({ ...l }));
}
