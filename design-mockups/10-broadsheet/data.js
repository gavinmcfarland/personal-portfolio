/* ══════════════════════════════════════════════════════════════════
   10 · BROADSHEET — content
   One source for every page. This variation is about LAYOUT, so the
   content matters less for what it says than for the fact that it
   never changes: the atlas pushes this same array through twelve
   structures, and the only thing that differs between them is the
   shape. If the content drifted, the comparison would be worthless.
   ══════════════════════════════════════════════════════════════════ */

window.DATA = {

  who: {
    name: 'Gavin McFarland',
    role: 'Design engineer',
    line: 'I build the tools design systems are made with — and the systems themselves.',
    place: 'London, UK',
    email: 'gavin@limitlessloop.com',
    github: 'https://github.com/gavinmcfarland',
  },

  masthead: {
    title: 'THE WORKING SHEET',
    strap: 'Design systems · developer tooling · the seam between them',
    edition: 'Vol. 10 · Broadsheet edition',
  },

  nav: [
    { id: 'index',   name: 'Front',       href: 'index.html' },
    { id: 'layouts', name: 'Layouts',     href: 'layouts.html' },
    { id: 'journal', name: 'Journal',     href: 'journal.html' },
    { id: 'feature', name: 'Feature',     href: 'feature.html' },
    { id: 'gallery', name: 'Gallery',     href: 'gallery.html' },
    { id: 'project', name: 'Plugma',      href: 'project.html' },
    { id: 'archive', name: 'Classifieds', href: 'archive.html' },
    { id: 'contact', name: 'Contact',     href: 'contact.html' },
    { id: 'board',   name: 'Board',       href: 'board.html' },
  ],

  kinds: {
    tool:    { label: 'Tool',    tone: 'red' },
    plugin:  { label: 'Plug-in', tone: 'blue' },
    library: { label: 'Library', tone: 'ochre' },
  },

  /* `tx` picks a press texture, `tone` the flat spot colour under it.
     Both come from fixed vocabularies in system.css. */
  projects: [
    { slug: 'plugma', year: '2024', name: 'plugma', href: 'project.html',
      kind: 'tool', tx: 'halftone', tone: 'red',
      desc: 'Zero-config toolchain for Figma plugins',
      long: 'One command to scaffold, one to develop with real hot reloading, one to ship. The framework stays your choice.' },

    { slug: 'askeroo', year: '2024', name: 'askeroo',
      href: 'https://github.com/gavinmcfarland/askeroo',
      kind: 'library', tx: 'rules', tone: 'ochre',
      desc: 'CLI prompts you can back out of',
      long: 'A prompt library where every question remembers the one before it, so ⌃C is not the only way back.' },

    { slug: 'screenshot-2-layout', year: '2024', name: 'screenshot-2-layout', href: '#',
      kind: 'plugin', tx: 'stipple', tone: 'blue',
      desc: 'Screenshot in, auto-layout frame out',
      long: 'Infers a nesting structure from a flat image and rebuilds it as real auto-layout, not a pile of absolute frames.' },

    { slug: 'figlet', year: '2023', name: 'figlet',
      href: 'https://www.figma.com/community/plugin/1215620774867583125/figlet',
      kind: 'tool', tx: 'crosshatch', tone: 'moss',
      desc: 'A plugin IDE that runs in the browser',
      long: 'Write, run and inspect a Figma plugin without leaving the canvas it is editing.' },

    { slug: 'table-creator', year: '2022', name: 'table-creator',
      href: 'https://www.figma.com/community/plugin/885838970710285271/table-creator',
      kind: 'plugin', tx: 'weave', tone: 'slate',
      desc: 'Real data tables on the canvas',
      long: 'Tables that stay tables — resizable, re-sortable, and still native Figma layers when you hand them over.' },

    { slug: 'icon-preview', year: '2021', name: 'icon-preview',
      href: 'https://www.figma.com/community/plugin/888907972695800109/icon-preview',
      kind: 'plugin', tx: 'halftone', tone: 'blue',
      desc: 'Every icon at the size it ships at',
      long: 'Because an icon set only fails at 16px, and that is the size nobody reviews it at.' },
  ],

  capabilities: [
    { k: 'Design systems', v: 'Token pipelines, component APIs, contribution and deprecation process, and documentation that survives a handover.' },
    { k: 'Front-end',      v: 'TypeScript, Svelte, React, Vite. Accessibility to WCAG 2.2 AA treated as a build gate rather than a review step.' },
    { k: 'Tooling',        v: 'Node CLIs, bundler configuration, the Figma plugin API, and continuous integration that runs on design artefacts.' },
  ],

  facts: [
    { k: 'Place',  v: 'London, UK' },
    { k: 'Role',   v: 'Design engineer' },
    { k: 'Status', v: 'Independent' },
    { k: 'Since',  v: '2009' },
  ],

  clients: ['American Express', 'NatWest', 'Home Office', 'John Lewis', 'LSEG', 'Ecologi', 'Amazon'],

  posts: [
    { slug: 'hot-reload', date: '2026-05', year: '2026', title: 'Two programs, one plugin',
      tag: 'figma', mins: 6, pinned: true, href: 'feature.html',
      lede: 'A Figma plugin looks like one thing and behaves like two. Almost every difficulty in building one comes from that gap.' },
    { slug: 'tool-nobody-owns', date: '2026-02', year: '2026', title: 'The tool nobody owns',
      tag: 'tooling', mins: 4, href: 'feature.html',
      lede: 'Every team has one script that everyone depends on and no one maintains.' },
    { slug: 'tokens-contract', date: '2025-11', year: '2025', title: 'Tokens are a contract',
      tag: 'systems', mins: 5, href: 'feature.html',
      lede: 'A token is not a variable. It is a promise made in two codebases at once.' },
    { slug: 'draw-it-first', date: '2025-07', year: '2025', title: 'Draw it first',
      tag: 'process', mins: 3, href: 'feature.html',
      lede: 'A problem you cannot draw is a problem you do not understand yet.' },
    { slug: 'deprecation', date: '2025-03', year: '2025', title: 'Deprecation is a feature',
      tag: 'systems', mins: 4, href: 'feature.html',
      lede: 'A design system that cannot remove things can only grow until it is ignored.' },
    { slug: 'sixteen-px', date: '2024-10', year: '2024', title: 'Review icons at 16px',
      tag: 'craft', mins: 2, href: 'feature.html',
      lede: 'An icon set only fails at the size it ships at, and that is the size nobody reviews it at.' },
    { slug: 'ci-for-design', date: '2024-04', year: '2024', title: 'CI for design artefacts',
      tag: 'tooling', mins: 5, href: 'feature.html',
      lede: 'If the design file breaks the build, the design file is part of the build.' },
  ],

  /* The twelve structures the atlas steps through. `note` is the
     argument for using it — the atlas is a reference sheet, so each
     entry has to say what the shape is FOR, not just what it is. */
  layouts: [
    { id: 'flow',       name: 'Column flow',    note: 'Text set in newspaper columns with a rule between. Reads fast, wastes nothing, and fails the moment a column runs short.' },
    { id: 'split',      name: 'Split screen',   note: 'Two halves, one fixed while the other scrolls. The fixed half is the argument; the moving half is the evidence.' },
    { id: 'strip',      name: 'Filmstrip',      note: 'A horizontal run with scroll-snap. Good for a sequence the reader is meant to compare rather than search.' },
    { id: 'stagger',    name: 'Staggered',      note: 'A grid with every other cell dropped half a row. Breaks the ledger feel without abandoning the grid.' },
    { id: 'overlap',    name: 'Overlap',        note: 'Panels that cross into each other and stack in z. The one structure here allowed to break its own column.' },
    { id: 'bands',      name: 'Full-bleed bands', note: 'Alternating edge-to-edge strips. Rank comes from inversion and width, never from type size.' },
    { id: 'asym',       name: 'Asymmetric',     note: 'Seven columns of argument, five of apparatus. The gap between them is structural, not accidental.' },
    { id: 'classified', name: 'Classifieds',    note: 'Maximum density: three columns of small ads. Everything findable, nothing featured.' },
    { id: 'bento',      name: 'Bento',          note: 'Uneven spans on one grid. Useful when items genuinely differ in weight, dishonest when they do not.' },
    { id: 'rungs',      name: 'Rungs',          note: 'A vertical rail with rows hung off it. The shape a chronology wants.' },
    { id: 'measure',    name: 'Single measure', note: 'One narrow column and a great deal of nothing. The most expensive layout here, and the only one that can carry a long argument.' },
    { id: 'table',      name: 'Ruled table',    note: 'The baseline. Every other structure on this sheet is an argument for not using this one.' },
  ],

  board: {
    title: 'plugma — working board',
    notes: [
      { x: 0,   y: 0,   w: 300, kind: 'doc', label: 'Brief',
        text: 'A zero-config toolchain for Figma plugins. Scaffold it, develop it with real hot reloading, ship it — without hand-assembling a bundler, a manifest and a message bridge first.' },
      { x: 380, y: -40, w: 176, kind: 'note', tone: 'red',   label: '01', text: 'Zero\nconfig' },
      { x: 596, y: -40, w: 176, kind: 'note', tone: 'blue',  label: '02', text: 'Real HMR,\nstate kept' },
      { x: 380, y: 140, w: 176, kind: 'note', tone: 'ochre', label: '03', text: 'React\nSvelte\nVue' },
      { x: 596, y: 140, w: 176, kind: 'note', tone: 'moss',  label: '04', text: 'One command\nto ship' },
      { x: 0,   y: 320, w: 340, kind: 'code', label: 'main.ts',
        text: "// sandbox half — document access, no DOM\nfigma.ui.onmessage = (msg) => {\n  if (msg.type === 'resize') {\n    figma.ui.resize(msg.w, msg.h)\n  }\n}" },
      { x: 852, y: -40, w: 300, kind: 'doc', label: 'How it works',
        text: 'The UI is served from a dev server while you work and inlined at build time, so the sandbox half never notices the difference. Messages are typed across the bridge.' },
      { x: 852, y: 220, w: 300, kind: 'doc', label: 'The point',
        text: 'Interface work stops being a stop-start loop. That is the whole return on the tool.' },
      { x: 380, y: 340, w: 392, kind: 'note', tone: 'slate', label: '05', text: 'Ship the loop,\nnot the config' },
    ],
  },
};
