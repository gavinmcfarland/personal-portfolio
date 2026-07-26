/* The engine paints with named inks, never raw colours — a layer asks for
   `tx` or `tx-strong`, and the palette in scope decides what that means.
   That is the whole trick behind re-tinting a field by changing one value,
   and it is lifted straight from the CSS this package reproduces. */

/* Two grounds, the same two the mockup ships: the dark terminal surface and
   the "bone" sheet that looks like a manual page someone printed. */
export const palettes = {
  ink: {
    bg: '#0E0F0D',
    tx: 'rgba(217, 215, 203, 0.22)',
    'tx-strong': 'rgba(217, 215, 203, 0.40)',
    'tx-ground': 'rgba(217, 215, 203, 0.085)',
    /* Bold ink for solid pixel blocks, which need more punch than a dot. */
    'tx-solid': 'rgba(217, 215, 203, 0.72)',
  },
  bone: {
    bg: '#E6E3D8',
    tx: 'rgba(26, 27, 20, 0.22)',
    'tx-strong': 'rgba(26, 27, 20, 0.38)',
    'tx-ground': 'rgba(26, 27, 20, 0.10)',
    'tx-solid': 'rgba(26, 27, 20, 0.70)',
  },
};

/* Parse #rgb / #rrggbb / rgb() / rgba() into [r, g, b, a] with a in 0..1.
   Anything unrecognised comes back opaque black rather than throwing, so a
   typo dims a layer instead of blanking the canvas. */
export function parseColor(input) {
  if (Array.isArray(input)) return input.length === 3 ? [...input, 1] : input.slice(0, 4);
  const s = String(input).trim();

  if (s[0] === '#') {
    let hex = s.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }

  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1].split(',').map((p) => parseFloat(p));
    return [parts[0] | 0, parts[1] | 0, parts[2] | 0, parts[3] === undefined ? 1 : parts[3]];
  }

  return [0, 0, 0, 1];
}

/* Resolve a layer's `ink` — either a palette token or a literal colour —
   against the palette that is currently in scope. */
export function resolveInk(ink, palette) {
  if (ink && Object.prototype.hasOwnProperty.call(palette, ink)) return parseColor(palette[ink]);
  return parseColor(ink);
}

export function resolvePalette(palette) {
  if (!palette) return palettes.ink;
  if (typeof palette === 'string') return palettes[palette] || palettes.ink;
  return { ...palettes.ink, ...palette };
}
