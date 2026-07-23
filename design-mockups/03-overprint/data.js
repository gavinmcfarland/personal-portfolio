/* ══════════════════════════════════════════════════════════════════
   OVERPRINT — content
   One source for everything that appears in more than one place. The
   cover shows four pieces, the archive shows all of them, and the
   piece page reads its neighbours for prev/next — all from here, so
   a year fixed once is fixed everywhere.
   ══════════════════════════════════════════════════════════════════ */

window.DATA = {

  /* Selected work. `cover: true` puts a piece on the front. */
  pieces: [
    { slug:'plugma', year:'2024', name:'plugma', cover:true, local:true,
      href:'piece.html',
      desc:'Zero-config toolchain for Figma plugins',
      kind:'tool' },

    { slug:'askeroo', year:'2024', name:'askeroo', cover:true,
      href:'https://github.com/gavinmcfarland/askeroo',
      desc:'CLI prompts you can back out of',
      kind:'library' },

    { slug:'screenshot-2-layout', year:'2024', name:'screenshot-2-layout',
      href:'#',
      desc:'Screenshot in, auto-layout frame out',
      kind:'plugin' },

    { slug:'figlet', year:'2023', name:'figlet', cover:true,
      href:'https://www.figma.com/community/plugin/1215620774867583125/figlet',
      desc:'A plugin IDE that runs in the browser',
      kind:'tool' },

    { slug:'table-creator', year:'2022', name:'table-creator', cover:true,
      href:'https://www.figma.com/community/plugin/885838970710285271/table-creator',
      desc:'Real data tables on the canvas',
      kind:'plugin' },

    { slug:'icon-preview', year:'2021', name:'icon-preview',
      href:'https://www.figma.com/community/plugin/888907972695800109/icon-preview',
      desc:'Every icon at the size it ships at',
      kind:'plugin' },
  ],

  /* Field notes. Only the first has a page in this mockup. */
  notes: [
    { date:'2026-05', name:'two programs, one plugin', href:'note.html', local:true,
      desc:'Why the Figma plugin model is harder than it looks' },
    { date:'2026-02', name:'the tool nobody owns', href:'#',
      desc:'On building the missing piece and leaving it documented' },
    { date:'2025-11', name:'tokens are a contract', href:'#',
      desc:'What a design system owes the codebase' },
    { date:'2025-07', name:'draw it first', href:'#',
      desc:'A problem you cannot draw is one you do not understand' },
  ],

  /* The colophon, printed on every page. */
  colophon: [
    { k:'set in',   v:'Space Grotesk / Space Mono' },
    { k:'inks',     v:'blue · fluoro pink' },
    { k:'built with', v:'html, css, no framework' },
    { k:'contact',  v:'gavin@limitlessloop.com', href:'mailto:gavin@limitlessloop.com' },
  ],
};
