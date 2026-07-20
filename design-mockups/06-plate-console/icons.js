/* ══════════════════════════════════════════════════════════════════
   PLATE·CONSOLE — the icon set
   ------------------------------------------------------------------
   Icons are authored as bitmaps: a grid of characters, one character
   per pixel, mapped to the 16-colour system palette and rendered to
   merged <rect> runs at load.

   TWO SIZES, DRAWN SEPARATELY. A 32×32 icon scaled down to 16px puts
   every source pixel on a half-pixel and turns to mud, so the small
   set is not a scaled copy — it is drawn again at 16×16 with fewer
   details and heavier forms. That is how icon sets worked when they
   were bitmaps, and it is the reason they stayed legible.

   `icon(name, {size})` picks the right grid and falls back to the
   size that exists. `specimen.html` shows every cell in both sets.
   ══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  /* The 16-colour VGA palette. Nothing outside it. */
  const PAL = {
    k:'#0A0A0A', w:'#FFFFFF', s:'#C0C0C0', g:'#808080',
    n:'#000080', b:'#0000FF', t:'#008080', c:'#00FFFF',
    y:'#FFFF00', o:'#808000', r:'#FF0000', m:'#800000',
    l:'#00FF00', e:'#008000', p:'#800080', f:'#FF00FF',
  };

  /* ── 32×32 — the detailed set ──────────────────────────────────
     Shading is done with the palette's own steps (white → silver →
     gray → black) rather than opacity, because a 16-colour icon has
     no alpha to spend. */
  const G32 = {

    /* 3½-inch disk: shutter, body, write label */
    floppy: [
      '................................',
      '................................',
      '................................',
      '...kkkkkkkkkkkkkkkkkkkkkkkkkk...',
      '...ksssssskkkkkkkkkkssssssssk...',
      '...ksssssskwwwwwwwwkssssssssk...',
      '...ksssssskwwwwwwwwkssssssssk...',
      '...ksssssskwwwwwwwwkssssssssk...',
      '...ksssssskwwwwwwwwkssssssssk...',
      '...ksssssskwwwwwwwwkssssssssk...',
      '...ksssssskwwwwwwwwkssssssssk...',
      '...ksssssskkkkkkkkkkssssssssk...',
      '...kssssssssssssssssssssssssk...',
      '...kssssssssssssssssssssssssk...',
      '...kssssssssssssssssssssssssk...',
      '...kssssssssssssssssssssssssk...',
      '...kssssssssssssssssssssssssk...',
      '...ksskkkkkkkkkkkkkkkkkkkkssk...',
      '...ksskwwwwwwwwwwwwwwwwwwkssk...',
      '...ksskwnnnnnnnnnnnnnnwwwkssk...',
      '...ksskwwwwwwwwwwwwwwwwwwkssk...',
      '...ksskwnnnnnnnnnnwwwwwwwkssk...',
      '...ksskwwwwwwwwwwwwwwwwwwkssk...',
      '...ksskwnnnnnnnnnnnnwwwwwkssk...',
      '...ksskwwwwwwwwwwwwwwwwwwkssk...',
      '...ksskwnnnnnnnwwwwwwwwwwkssk...',
      '...ksskwwwwwwwwwwwwwwwwwwkssk...',
      '...ksskkkkkkkkkkkkkkkkkkkkssk...',
      '...kkkkkkkkkkkkkkkkkkkkkkkkkk...',
      '................................',
      '................................',
      '................................',
    ],

    folder: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '...kkkkkkkkkkk..................',
      '...kyyyyyyyyyk..................',
      '...kyyyyyyyyyk..................',
      '...kyyyyyyyyykkkkkkkkkkkkkkkk...',
      '...kyyyyyyyyyyyyyyyyyyyyyyyyk...',
      '...kyyyyyyyyyyyyyyyyyyyyyyyyk...',
      '...kyyyyyyyyyyyyyyyyyyyyyyyyk...',
      '...kyyyyyyyyyyyyyyyyyyyyyyyyk...',
      '...kyyyyyyyyyyyyyyyyyyyyyyyyk...',
      '...kyyyyyyyyyyyyyyyyyyyyyyyyk...',
      '...kyyyyyyyyyyyyyyyyyyyyyyyyk...',
      '...kyyyyyyyyyyyyyyyyyyyyyyyyk...',
      '...kyyyyyyyyyyyyyyyyyyyyyyyyk...',
      '...kyyyyyyyyyyyyyyyyyyyyyyyyk...',
      '...kyyyyyyyyyyyyyyyyyyyyyyyyk...',
      '...kyyyyyyyyyyyyyyyyyyyyyyyyk...',
      '...kyyyyyyyyyyyyyyyyyyyyyyyyk...',
      '...kooooooooooooooooooooooook...',
      '...kooooooooooooooooooooooook...',
      '...kooooooooooooooooooooooook...',
      '...kooooooooooooooooooooooook...',
      '...kkkkkkkkkkkkkkkkkkkkkkkkkk...',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],

    doc: [
      '................................',
      '................................',
      '................................',
      '......kkkkkkkkkkkkkkkkkkkk......',
      '......knnnnnnnnnnnnnnnnnnk......',
      '......knnnnnnnnnnnnnnnnnnk......',
      '......knnnnnnnnnnnnnnnnnnk......',
      '......kwwwwwwwwwwwwwwwwwwk......',
      '......kwggggggggggggggggwk......',
      '......kwwwwwwwwwwwwwwwwwwk......',
      '......kwgggggggggggggwwwwk......',
      '......kwwwwwwwwwwwwwwwwwwk......',
      '......kwggggggggggggggggwk......',
      '......kwwwwwwwwwwwwwwwwwwk......',
      '......kwgggggggggwwwwwwwwk......',
      '......kwwwwwwwwwwwwwwwwwwk......',
      '......kwggggggggggggggggwk......',
      '......kwwwwwwwwwwwwwwwwwwk......',
      '......kwggggggggggggwwwwwk......',
      '......kwwwwwwwwwwwwwwwwwwk......',
      '......kwggggggggggggggggwk......',
      '......kwwwwwwwwwwwwwwwwwwk......',
      '......kwggggggggwwwwwwwwwk......',
      '......kwwwwwwwwwwwwwwwwwwk......',
      '......kwggggggggggggggggwk......',
      '......kwwwwwwwwwwwwwwwwwwk......',
      '......kwgggggggggggwwwwwwk......',
      '......kwwwwwwwwwwwwwwwwwwk......',
      '......kkkkkkkkkkkkkkkkkkkk......',
      '................................',
      '................................',
      '................................',
    ],

    /* CRT with a live console on it */
    monitor: [
      '................................',
      '................................',
      '................................',
      '................................',
      '...kkkkkkkkkkkkkkkkkkkkkkkkkk...',
      '...kssssssssssssssssssssssssk...',
      '...kskkkkkkkkkkkkkkkkkkkkkksk...',
      '...ksknnnnnnnnnnnnnnnnnnnnksk...',
      '...ksknlnnnnnnnnnnnnnnnnnnksk...',
      '...ksknnlnnnnnnnnnnnnnnnnnksk...',
      '...ksknlnnnnnnnnnnnnnnnnnnksk...',
      '...ksknnnnnnnnnnnnnnnnnnnnksk...',
      '...ksknnnllllllllllnnnnnnnksk...',
      '...ksknnnnnnnnnnnnnnnnnnnnksk...',
      '...ksknnnlllllllnnnnnnnnnnksk...',
      '...ksknnnnnnnnnnnnnnnnnnnnksk...',
      '...ksknnnlllllllllllllnnnnksk...',
      '...ksknnnnnnnnnnnnnnnnnnnnksk...',
      '...ksknnnlllllnnnnnnnnnnnnksk...',
      '...ksknnnnnnnnnnnnnnnnnnnnksk...',
      '...kskkkkkkkkkkkkkkkkkkkkkksk...',
      '...kssssssssssssssssssssssssk...',
      '...kkkkkkkkkkkkkkkkkkkkkkkkkk...',
      '..........kkkkkkkkkkkk..........',
      '..........kssssssssssk..........',
      '..........kssssssssssk..........',
      '......kkkkkkkkkkkkkkkkkkkk......',
      '......kssssssssssssssssssk......',
      '......kkkkkkkkkkkkkkkkkkkk......',
      '................................',
      '................................',
      '................................',
    ],

    chart: [
      '................................',
      '................................',
      '................................',
      '................................',
      '.....k..........................',
      '.....k..........................',
      '.....k..........................',
      '.....k................kkkkk.....',
      '.....k................ktttk.....',
      '.....k................ktttk.....',
      '.....k................ktttk.....',
      '.....k................ktttk.....',
      '.....k.........kkkkk..ktttk.....',
      '.....k.........knnnk..ktttk.....',
      '.....k.........knnnk..ktttk.....',
      '.....k.........knnnk..ktttk.....',
      '.....k.........knnnk..ktttk.....',
      '.....k.........knnnk..ktttk.....',
      '.....k..kkkkk..knnnk..ktttk.....',
      '.....k..krrrk..knnnk..ktttk.....',
      '.....k..krrrk..knnnk..ktttk.....',
      '.....k..krrrk..knnnk..ktttk.....',
      '.....k..krrrk..knnnk..ktttk.....',
      '.....k..krrrk..knnnk..ktttk.....',
      '.....k..krrrk..knnnk..ktttk.....',
      '.....k..krrrk..knnnk..ktttk.....',
      '.....kkkkkkkkkkkkkkkkkkkkkkk....',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],

    /* spreadsheet / data table */
    grid: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '....kkkkkkkkkkkkkkkkkkkkkkkk....',
      '....knnnnnnnnnnnnnnnnnnnnnnk....',
      '....knnnnnnnnnnnnnnnnnnnnnnk....',
      '....knnnnnnnnnnnnnnnnnnnnnnk....',
      '....kkkkkkkkkkkkkkkkkkkkkkkk....',
      '....kwwwwwwkwwwwwwwkwwwwwwwk....',
      '....kwwwwwwkwwwwwwwkwwwwwwwk....',
      '....kwwwwwwkwwwwwwwkwwwwwwwk....',
      '....kkkkkkkkkkkkkkkkkkkkkkkk....',
      '....kwwwwwwkwwwwwwwkwwwwwwwk....',
      '....kwwwwwwkwwwwwwwkwwwwwwwk....',
      '....kwwwwwwkwwwwwwwkwwwwwwwk....',
      '....kkkkkkkkkkkkkkkkkkkkkkkk....',
      '....kwwwwwwkwwwwwwwkwwwwwwwk....',
      '....kwwwwwwkwwwwwwwkwwwwwwwk....',
      '....kwwwwwwkwwwwwwwkwwwwwwwk....',
      '....kkkkkkkkkkkkkkkkkkkkkkkk....',
      '....kwwwwwwkwwwwwwwkwwwwwwwk....',
      '....kwwwwwwkwwwwwwwkwwwwwwwk....',
      '....kwwwwwwkwwwwwwwkwwwwwwwk....',
      '....kkkkkkkkkkkkkkkkkkkkkkkk....',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  };

  /* ── 16×16 — the small set ─────────────────────────────────────
     Drawn again, not scaled. Fewer details, heavier forms. */
  const G16 = {
    floppy: [
      '................',
      '................',
      '..kkkkkkkkkkkk..',
      '..kssssssssssk..',
      '..kskkkkkkkksk..',
      '..kskwwwwwwksk..',
      '..kskwwwwwwksk..',
      '..kskkkkkkkksk..',
      '..kssssssssssk..',
      '..kssssssssssk..',
      '..kwwwwwwwwwwk..',
      '..kwkkkkkkkkwk..',
      '..kwkkkkkkkkwk..',
      '..kkkkkkkkkkkk..',
      '................',
      '................',
    ],
    folder: [
      '................',
      '................',
      '..kkkkk.........',
      '..kyyyk.........',
      '..kyyyykkkkkkk..',
      '..kyyyyyyyyyyk..',
      '..kyyyyyyyyyyk..',
      '..kyyyyyyyyyyk..',
      '..kyyyyyyyyyyk..',
      '..kyyyyyyyyyyk..',
      '..kyyyyyyyyyyk..',
      '..kooooooooook..',
      '..kooooooooook..',
      '..kkkkkkkkkkkk..',
      '................',
      '................',
    ],
    doc: [
      '................',
      '...kkkkkkkkkk...',
      '...knnnnnnnnk...',
      '...kwwwwwwwwk...',
      '...kwggggggwk...',
      '...kwwwwwwwwk...',
      '...kwgggggwwk...',
      '...kwwwwwwwwk...',
      '...kwggggggwk...',
      '...kwwwwwwwwk...',
      '...kwggggwwwk...',
      '...kwwwwwwwwk...',
      '...kwggggggwk...',
      '...kkkkkkkkkk...',
      '................',
      '................',
    ],
    monitor: [
      '................',
      '................',
      '..kkkkkkkkkkkk..',
      '..knnnnnnnnnnk..',
      '..knlnnnnnnnnk..',
      '..knnlnnnnnnnk..',
      '..knlnnnnnnnnk..',
      '..knnnllllnnnk..',
      '..knnnnnnnnnnk..',
      '..knnnlllnnnnk..',
      '..kkkkkkkkkkkk..',
      '.....kkkkkk.....',
      '...kkkkkkkkkk...',
      '...kkkkkkkkkk...',
      '................',
      '................',
    ],
    chart: [
      '................',
      '................',
      '................',
      '................',
      '...........kkk..',
      '...........ktk..',
      '.......kkk.ktk..',
      '.......knk.ktk..',
      '.......knk.ktk..',
      '...kkk.knk.ktk..',
      '...krk.knk.ktk..',
      '...krk.knk.ktk..',
      '...krk.knk.ktk..',
      '..kkkkkkkkkkkk..',
      '................',
      '................',
    ],
    grid: [
      '................',
      '................',
      '..kkkkkkkkkkkk..',
      '..knnnnnnnnnnk..',
      '..kkkkkkkkkkkk..',
      '..kwwwkwwwkwwk..',
      '..kwwwkwwwkwwk..',
      '..kkkkkkkkkkkk..',
      '..kwwwkwwwkwwk..',
      '..kwwwkwwwkwwk..',
      '..kkkkkkkkkkkk..',
      '..kwwwkwwwkwwk..',
      '..kwwwkwwwkwwk..',
      '..kkkkkkkkkkkk..',
      '................',
      '................',
    ],
    mail: [
      '................',
      '................',
      '................',
      '................',
      '..kkkkkkkkkkkk..',
      '..kwwwwwwwwwwk..',
      '..kkwwwwwwwwkk..',
      '..kwkkwwwwkkwk..',
      '..kwwkkwwkkwwk..',
      '..kwwwkkkkwwwk..',
      '..kwwwwwwwwwwk..',
      '..kwwwwwwwwwwk..',
      '..kkkkkkkkkkkk..',
      '................',
      '................',
      '................',
    ],
    net: [
      '................',
      '................',
      '................',
      '.....kkkkkk.....',
      '...kkttttttkk...',
      '..kttttttttttk..',
      '..ktttkkkktttk..',
      '..kttttttttttk..',
      '..ktttkkkktttk..',
      '..kttttttttttk..',
      '...kkttttttkk...',
      '.....kkkkkk.....',
      '................',
      '................',
      '................',
      '................',
    ],
  };

  /* icons48.js registers the large set and the dither table before
     this file runs. Both are optional. */
  const G48 = window.ICON_G48 || {};
  const DITHER = window.ICON_DITHER || {};

  const SETS = { 16:G16, 32:G32, 48:G48 };

  /* Resolve one cell to a hex. An UPPERCASE key is a 50% chequer of
     its pair, alternating on (x + y) — which is how a 16-colour icon
     gets a third tone out of two colours. */
  function colourAt(ch, x, y) {
    const pair = DITHER[ch];
    if (pair) return PAL[pair[(x + y) % 2]];
    return PAL[ch];
  }

  /* Merge horizontal runs of one resolved colour into a single rect.
     A dithered area cannot merge — its colour alternates every pixel
     — so it costs one rect per cell. That is the price of the
     chequer, and it is why dither is used for shading rather than
     for whole icons. */
  function toSvg(grid, size, cls, label) {
    let rects = '';
    grid.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        if (ch === '.') { x++; continue; }
        const fill = colourAt(ch, x, y);
        let run = 1;
        while (x + run < row.length && row[x + run] === ch && colourAt(ch, x + run, y) === fill) run++;
        rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${fill || '#000'}"/>`;
        x += run;
      }
    });
    return `<svg class="${cls}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" ` +
      (label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"') + `>${rects}</svg>`;
  }

  const CACHE = {};

  /* Prefer the requested size; otherwise step down to the nearest
     one that has actually been drawn. Never scale up — an icon
     enlarged past its own grid is just big mud. */
  const ORDER = [48, 32, 16];

  window.icon = function icon(name, opts) {
    const o = opts || {};
    const want = ORDER.includes(o.size) ? o.size : 16;
    const size = SETS[want][name]
      ? want
      : ORDER.filter((s) => s <= want).find((s) => SETS[s][name])
        || ORDER.find((s) => SETS[s][name]);
    const grid = size && SETS[size][name];
    if (!grid) return '';
    /* The box follows the RESOLVED size, not the requested one. If a
       name was only ever drawn at 48, asking for 32 gets a 48px icon
       — larger than asked for, but never a resampled one. Rendering
       a 48 grid into a 32 box is the mud this whole format exists to
       avoid, and a fallback that quietly does it is worse than no
       fallback. `specimen.html` lists which sizes exist. */
    const cls = 'ico ico--' + size;
    const key = `${name}|${size}|${cls}|${o.label || ''}`;
    if (!CACHE[key]) CACHE[key] = toSvg(grid, size, cls, o.label);
    return CACHE[key];
  };

  /* specimen.html reads these */
  window.ICON_SETS = SETS;
  window.ICON_PALETTE = PAL;
  window.ICON_DITHER_TABLE = DITHER;
  window.ICON_COLOUR_AT = colourAt;
  window.ICON_NAMES = [...new Set([...Object.keys(G48), ...Object.keys(G32), ...Object.keys(G16)])];
})();
