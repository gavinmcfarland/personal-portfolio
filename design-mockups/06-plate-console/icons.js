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

  const SETS = { 16:G16, 32:G32 };

  /* Merge horizontal runs of one colour into a single rect. */
  function toSvg(grid, size, cls, label) {
    let rects = '';
    grid.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        if (ch === '.') { x++; continue; }
        let run = 1;
        while (x + run < row.length && row[x + run] === ch) run++;
        rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${PAL[ch] || '#000'}"/>`;
        x += run;
      }
    });
    return `<svg class="${cls}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" ` +
      (label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"') + `>${rects}</svg>`;
  }

  const CACHE = {};

  window.icon = function icon(name, opts) {
    const o = opts || {};
    const want = o.size === 32 ? 32 : 16;
    /* fall back to whichever size actually exists for this name */
    const size = SETS[want][name] ? want : (SETS[want === 32 ? 16 : 32][name] ? (want === 32 ? 16 : 32) : want);
    const grid = SETS[size] && SETS[size][name];
    if (!grid) return '';
    const cls = 'ico ico--' + want;
    const key = `${name}|${size}|${cls}|${o.label || ''}`;
    if (!CACHE[key]) CACHE[key] = toSvg(grid, size, cls, o.label);
    return CACHE[key];
  };

  /* specimen.html reads these */
  window.ICON_SETS = SETS;
  window.ICON_PALETTE = PAL;
  window.ICON_NAMES = [...new Set([...Object.keys(G32), ...Object.keys(G16)])];
})();
