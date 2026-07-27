/* The palette the dither engine paints this site's textures with.

   The engine paints with named inks rather than colours, so anything it draws
   re-tints with the page by being handed an Enamel palette instead of one of
   the package's own. The ink STRENGTHS are the package's (`tx-solid` at ~0.7,
   the value the dither demo renders its patterns at) so a plate reads with
   the contrast it was picked at; only the hues are ours — bone ink on
   graphite, graphite on steel.

   The palette also decides polarity: the package reads the surface it is
   painting onto and, on a dark one, flips a dot to stand for a BRIGHT part of
   the picture rather than a dark one. So the same artwork prints as a
   positive in both themes instead of coming back as its own negative in one.

   Shared by every dithered surface on the site — the project plates and the
   video textures — so a texture cannot drift from a plate beside it. */
export const DITHER_PALETTES = {
  light: {
    bg: "#c3c8cd",
    tx: "rgba(22, 25, 28, 0.22)",
    "tx-strong": "rgba(22, 25, 28, 0.38)",
    "tx-ground": "rgba(22, 25, 28, 0.10)",
    "tx-solid": "rgba(22, 25, 28, 0.70)",
  },
  dark: {
    bg: "#111110",
    tx: "rgba(235, 231, 220, 0.22)",
    "tx-strong": "rgba(235, 231, 220, 0.40)",
    "tx-ground": "rgba(235, 231, 220, 0.085)",
    "tx-solid": "rgba(235, 231, 220, 0.72)",
  },
};

export const paletteFor = (theme) => DITHER_PALETTES[theme] || DITHER_PALETTES.dark;
