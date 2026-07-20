/* ══════════════════════════════════════════════════════════════════
   PLATE·CONSOLE — the 48×48 set
   ------------------------------------------------------------------
   The large icons, and the reason the authoring format grew a
   feature: DITHER.

   A 16-colour palette has no in-between shades. The way icons of
   this era got a third tone out of two colours was a 50% chequer —
   alternate pixels of each, which the eye averages at small sizes.
   Doing that by hand in a character grid means writing 'yoyoyo' /
   'oyoyoy' on alternating rows, which is unreadable and impossible
   to edit.

   So the grid gained a rule:

     lowercase  →  a solid palette colour        (y = yellow)
     UPPERCASE  →  a 50% chequer of that colour
                   against its paired shade      (Y = yellow/olive)

   The pairs are declared once in DITHER below, and the renderer
   resolves each cell from (x + y) % 2. The grids stay readable, the
   shading stays authentic, and the palette stays at 16 colours.

   These are drawn again at 48 — not scaled from 32 — for the same
   reason the 16 and 32 sets differ: detail that reads at 48 becomes
   noise at 32.
   ══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  /* UPPERCASE key → [colour, paired shade]. The chequer alternates
     between the two on (x + y) % 2. */
  const DITHER = {
    Y:['y','o'],   // yellow  → olive        (folder bodies)
    S:['s','g'],   // silver  → gray         (plastic, metal)
    W:['w','s'],   // white   → silver       (paper, highlights)
    G:['g','k'],   // gray    → black        (deep shadow)
    C:['c','t'],   // aqua    → teal         (screens, covers)
    T:['t','n'],   // teal    → navy         (dark screens)
    N:['n','k'],   // navy    → black        (shadowed navy)
    R:['r','m'],   // red     → maroon
    L:['l','e'],   // lime    → green
  };

  const G48 = {

    /* Folder — front face, dithered body, olive underside, and a
       white top lip so the fold reads as a fold. */
    folder: [
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '....kkkkkkkkkkkkkk..............................',
      '....kwwwwwwwwwwwwk..............................',
      '....kyyyyyyyyyyyyk..............................',
      '....kyyyyyyyyyyyyk..............................',
      '....kyyyyyyyyyyyyk..............................',
      '....kyyyyyyyyyyyykkkkkkkkkkkkkkkkkkkkkkkkkk.....',
      '....kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk.....',
      '....kyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyk.....',
      '....kyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyk.....',
      '....kyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyk.....',
      '....kyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyk.....',
      '....kyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyk.....',
      '....kyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyk.....',
      '....kyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyk.....',
      '....kyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyk.....',
      '....kyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyk.....',
      '....kYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYk.....',
      '....kYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYk.....',
      '....kYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYk.....',
      '....kYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYk.....',
      '....kYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYk.....',
      '....kooooooooooooooooooooooooooooooooooooook....',
      '....kooooooooooooooooooooooooooooooooooooook....',
      '....kooooooooooooooooooooooooooooooooooooook....',
      '....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
      '.....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG.....',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
    ],

    /* Notepad — spiral binding, aqua cover with a dithered face,
       ruled white pages showing beneath and to the right. */
    notepad: [
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '.......k...k...k...k...k...k...k...k............',
      '......kSk.kSk.kSk.kSk.kSk.kSk.kSk.kSk...........',
      '......kSk.kSk.kSk.kSk.kSk.kSk.kSk.kSk...........',
      '.....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.........',
      '.....kccccccccccccccccccccccccccccccccck........',
      '.....kcwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwck........',
      '.....kcwCCCCCCCCCCCCCCCCCCCCCCCCCCCCCwck........',
      '.....kcwCkkkkkkkkkkkkkkkkkkkkkkkkkkCCwck........',
      '.....kcwCCCCCCCCCCCCCCCCCCCCCCCCCCCCCwck........',
      '.....kcwCkkkkkkkkkkkkkkkkkkkkkkkkkkCCwck........',
      '.....kcwCCCCCCCCCCCCCCCCCCCCCCCCCCCCCwck........',
      '.....kcwCkkkkkkkkkkkkkkkkkkkkkkCCCCCCwck........',
      '.....kcwCCCCCCCCCCCCCCCCCCCCCCCCCCCCCwck........',
      '.....kcwCkkkkkkkkkkkkkkkkkkkkkkkkkkCCwck........',
      '.....kcwCCCCCCCCCCCCCCCCCCCCCCCCCCCCCwck........',
      '.....kcwCkkkkkkkkkkkkkkkkkkkkkkCCCCCCwck........',
      '.....kcwCCCCCCCCCCCCCCCCCCCCCCCCCCCCCwck........',
      '.....kcwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwck........',
      '.....kccccccccccccccccccccccccccccccccckkkk.....',
      '.....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkwwwk.....',
      '......kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk.....',
      '......kwkkkkkkkkkkkkkkkkkkkkkkkkkkwwwwwwwwk.....',
      '......kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk.....',
      '......kwkkkkkkkkkkkkkkkkkkkkkkwwwwwwwwwwwwk.....',
      '......kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk.....',
      '......kwkkkkkkkkkkkkkkkkkkkkkkkkkkwwwwwwwwk.....',
      '......kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk.....',
      '......kwkkkkkkkkkkkkkkkkkkkkkkwwwwwwwwwwwwk.....',
      '......kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk.....',
      '......kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk.....',
      '......kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk.....',
      '......kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
      '.......GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG.....',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
      '................................................',
    ],
  };

  /* Workstation — CRT on a dithered plastic body, a live console on
     the screen, and a keyboard on its own plane below. The silver is
     mostly chequered against gray, which is what stops a large flat
     icon looking like a flat rectangle. */
  G48.monitor = [
    '................................................',
    '................................................',
    '................................................',
    '.....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk...........',
    '.....kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwks..........',
    '.....kwSSSSSSSSSSSSSSSSSSSSSSSSSSSSwkSs.........',
    '.....kwSkkkkkkkkkkkkkkkkkkkkkkkkkkSwkSs.........',
    '.....kwSknnnnnnnnnnnnnnnnnnnnnnnnkSwkSs.........',
    '.....kwSknlnnnnnnnnnnnnnnnnnnnnnnkSwkSs.........',
    '.....kwSknnlnnnnnnnnnnnnnnnnnnnnnkSwkSs.........',
    '.....kwSknlnnnnnnnnnnnnnnnnnnnnnnkSwkSs.........',
    '.....kwSknnnnnnnnnnnnnnnnnnnnnnnnkSwkSs.........',
    '.....kwSknnnllllllllllllnnnnnnnnnkSwkSs.........',
    '.....kwSknnnnnnnnnnnnnnnnnnnnnnnnkSwkSs.........',
    '.....kwSknnnlllllllllnnnnnnnnnnnnkSwkSs.........',
    '.....kwSknnnnnnnnnnnnnnnnnnnnnnnnkSwkSs.........',
    '.....kwSknnnllllllllllllllllnnnnnkSwkSs.........',
    '.....kwSknnnnnnnnnnnnnnnnnnnnnnnnkSwkSs.........',
    '.....kwSknnnlllllllnnnnnnnnnnnnnnkSwkSs.........',
    '.....kwSknnnnnnnnnnnnnnnnnnnnnnnnkSwkSs.........',
    '.....kwSkkkkkkkkkkkkkkkkkkkkkkkkkkSwkSs.........',
    '.....kwSSSSSSSSSSSSSSSSSSSSSSSSSSSSwkSs.........',
    '.....kwSSSSSSSlSSSSSSSSSSSSSSSSSSSSwkSs.........',
    '.....kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwkSs.........',
    '.....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkSs.........',
    '......sGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGss.........',
    '................................................',
    '.......kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.......',
    '......kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk......',
    '.....kwSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSwk.....',
    '.....kwSkkSkkSkkSkkSkkSkkSkkSkkSkkSkkSkkSSwk....',
    '.....kwSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSwk....',
    '.....kwSkkSkkSkkSkkSkkSkkSkkSkkSkkSkkSkkSSwk....',
    '.....kwSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSwk....',
    '.....kwSkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkSwk....',
    '.....kwSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSwk....',
    '.....kGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGk....',
    '.....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk....',
    '......GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
  ];

  /* Disk — metal shutter, dithered plastic shell, ruled write label,
     and the bevelled corner the real thing had. */
  G48.floppy = [
    '................................................',
    '................................................',
    '................................................',
    '.......kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk...........',
    '.......kwwwwwwwwwwwwwwwwwwwwwwwwwwwkk...........',
    '.......kwSSSSSSSSkkkkkkkkkkSSSSSSSSwkk..........',
    '.......kwSSSSSSSSkwwwwwwwwkSSSSSSSSSwk..........',
    '.......kwSSSSSSSSkwWWWWWWwkSSSSSSSSSwk..........',
    '.......kwSSSSSSSSkwWWWWWWwkSSSSSSSSSwk..........',
    '.......kwSSSSSSSSkwWWWWWWwkSSSSSSSSSwk..........',
    '.......kwSSSSSSSSkwWWWWWWwkSSSSSSSSSwk..........',
    '.......kwSSSSSSSSkwWWWWWWwkSSSSSSSSSwk..........',
    '.......kwSSSSSSSSkwwwwwwwwkSSSSSSSSSwk..........',
    '.......kwSSSSSSSSkkkkkkkkkkSSSSSSSSSwk..........',
    '.......kwSSSSSSSSSSSSSSSSSSSSSSSSSSSwk..........',
    '.......kwSSSSSSSSSSSSSSSSSSSSSSSSSSSwk..........',
    '.......kwSSSSSSSSSSSSSSSSSSSSSSSSSSSwk..........',
    '.......kwSSSSSSSSSSSSSSSSSSSSSSSSSSSwk..........',
    '.......kwSSSkkkkkkkkkkkkkkkkkkkkSSSSwk..........',
    '.......kwSSSkwwwwwwwwwwwwwwwwwwkSSSSwk..........',
    '.......kwSSSkwnnnnnnnnnnnnnnwwkSSSSSwk..........',
    '.......kwSSSkwwwwwwwwwwwwwwwwwwkSSSSwk..........',
    '.......kwSSSkwnnnnnnnnnnnwwwwwwkSSSSwk..........',
    '.......kwSSSkwwwwwwwwwwwwwwwwwwkSSSSwk..........',
    '.......kwSSSkwnnnnnnnnnnnnnnnwwkSSSSwk..........',
    '.......kwSSSkwwwwwwwwwwwwwwwwwwkSSSSwk..........',
    '.......kwSSSkwnnnnnnnnwwwwwwwwwkSSSSwk..........',
    '.......kwSSSkwwwwwwwwwwwwwwwwwwkSSSSwk..........',
    '.......kwSSSkwnnnnnnnnnnnnwwwwwkSSSSwk..........',
    '.......kwSSSkwwwwwwwwwwwwwwwwwwkSSSSwk..........',
    '.......kwSSSkkkkkkkkkkkkkkkkkkkkSSSSwk..........',
    '.......kwSSSSSSSSSSSSSSSSSSSSSSSSSSSwk..........',
    '.......kwSSSSSSSSSSSSSSSSSSSSSSSSSSSwk..........',
    '.......kwGGGGGGGGGGGGGGGGGGGGGGGGGGGwk..........',
    '.......kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..........',
    '........GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG..........',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
  ];

  /* Hand the set and the dither table to icons.js, which owns the
     renderer and the public `icon()` API. */
  window.ICON_G48 = G48;
  window.ICON_DITHER = DITHER;
})();
