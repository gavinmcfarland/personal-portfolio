/* ══════════════════════════════════════════════════════════════════
   CONSOLE — the icon set
   ------------------------------------------------------------------
   Icons are authored as bitmaps, not paths. Each is a 16×16 grid of
   characters, one character per pixel, mapped to the system palette
   and rendered to <rect> runs at load.

   This is the one idea taken wholesale from the era, and it is taken
   because it is genuinely better here, not because it is nostalgic:

     · they are legible at 16px, which vector icon sets rarely are
     · they are editable as text in a diff
     · they cost about 400 bytes each, with no sprite sheet and no
       icon font
     · `shape-rendering: crispEdges` keeps them aliased at any size,
       so they scale up without going soft

   Horizontal runs are merged, so a 16×16 icon is typically 30–60
   rects rather than 256.
   ══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  /* The 16-colour system palette. Nothing outside it. */
  const PAL = {
    k:'#0A0A0A', w:'#FFFFFF', s:'#C0C0C0', g:'#808080',
    n:'#000080', b:'#0000FF', t:'#008080', c:'#00FFFF',
    y:'#FFFF00', o:'#808000', r:'#FF0000', m:'#800000',
    l:'#00FF00', e:'#008000', p:'#800080', f:'#FF00FF',
  };

  const GRIDS = {

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
      '...kwwwwwwwwk...',
      '...kwnnnnnnwk...',
      '...kwwwwwwwwk...',
      '...kwnnnnnnwk...',
      '...kwwwwwwwwk...',
      '...kwnnnnwwwk...',
      '...kwwwwwwwwk...',
      '...kwnnnnnnwk...',
      '...kwwwwwwwwk...',
      '...kwnnnnwwwk...',
      '...kwwwwwwwwk...',
      '...kkkkkkkkkk...',
      '................',
      '................',
    ],

    disc: [
      '................',
      '................',
      '.....kkkkkk.....',
      '...kkcccccckk...',
      '..kcccccccccck..',
      '..kccckkkkccck..',
      '.kcckwwwwwwkcck.',
      '.kcckwwwwwwkcck.',
      '.kcckwwwwwwkcck.',
      '..kccckkkkccck..',
      '..kcccccccccck..',
      '...kkcccccckk...',
      '.....kkkkkk.....',
      '................',
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

    board: [
      '................',
      '................',
      '................',
      '..kkkkkkkkkkkk..',
      '..kssssssssssk..',
      '..ksyyyssssssk..',
      '..ksyyyssssssk..',
      '..kssssssssssk..',
      '..ksssssnnnssk..',
      '..ksssssnnnssk..',
      '..kssssssssssk..',
      '..kssssssssssk..',
      '..kkkkkkkkkkkk..',
      '................',
      '................',
      '................',
    ],

    term: [
      '................',
      '................',
      '................',
      '..kkkkkkkkkkkk..',
      '..knnnnnnnnnnk..',
      '..knlnnnnnnnnk..',
      '..knnlnnnnnnnk..',
      '..knlnnnnnnnnk..',
      '..knnnllllnnnk..',
      '..knnnnnnnnnnk..',
      '..knnnnnnnnnnk..',
      '..kkkkkkkkkkkk..',
      '................',
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

  /* Merge horizontal runs of the same colour into single rects. */
  function toSvg(grid, label) {
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
    return `<svg class="ico" viewBox="0 0 16 16" shape-rendering="crispEdges" ` +
           (label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"') +
           `>${rects}</svg>`;
  }

  const CACHE = {};
  window.icon = function icon(name, label) {
    const key = name + '|' + (label || '');
    if (!CACHE[key]) CACHE[key] = GRIDS[name] ? toSvg(GRIDS[name], label) : '';
    return CACHE[key];
  };
  window.ICON_NAMES = Object.keys(GRIDS);
})();
