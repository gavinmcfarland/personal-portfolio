/* ══════════════════════════════════════════════════════════════════
   12 · ENAMEL — content
   One source for every sheet. Projects carry an enamel `tone` again
   — unlike 11, where colour was rationed to the board — because in
   this set colour is the primary carrier of rank. With the type
   scale as flat as it is, a fill is doing the job a heading would
   normally do, so the tone assignment is meaning, not decoration.
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

  nav: [
    { id: 'index',   name: 'Index',   href: 'index.html' },
    { id: 'signal',  name: 'Signal',  href: 'signal.html' },
    { id: 'work',    name: 'Work',    href: 'work.html' },
    { id: 'project', name: 'Plugma',  href: 'project.html' },
    { id: 'journal', name: 'Journal', href: 'journal.html' },
    { id: 'note',    name: 'Note',    href: 'note.html' },
    { id: 'contact', name: 'Contact', href: 'contact.html' },
    { id: 'board',   name: 'Board',   href: 'board.html' },
  ],

  kinds: {
    tool:    { label: 'Tool',    tone: 'blue' },
    plugin:  { label: 'Plug-in', tone: 'teal' },
    library: { label: 'Library', tone: 'lime' },
  },

  projects: [
    { slug: 'plugma', year: '2024', name: 'plugma', href: 'project.html',
      kind: 'tool', tone: 'blue', tx: 'grid',
      desc: 'Zero-config toolchain for Figma plugins',
      long: 'One command to scaffold, one to develop with real hot reloading, one to ship. The framework stays your choice.' },

    { slug: 'askeroo', year: '2024', name: 'askeroo',
      href: 'https://github.com/gavinmcfarland/askeroo',
      kind: 'library', tone: 'lime', tx: 'rule',
      desc: 'CLI prompts you can back out of',
      long: 'A prompt library where every question remembers the one before it, so ⌃C is not the only way back.' },

    { slug: 'screenshot-2-layout', year: '2024', name: 'screenshot-2-layout', href: '#',
      kind: 'plugin', tone: 'teal', tx: 'dot',
      desc: 'Screenshot in, auto-layout frame out',
      long: 'Infers a nesting structure from a flat image and rebuilds it as real auto-layout, not a pile of absolute frames.' },

    { slug: 'figlet', year: '2023', name: 'figlet',
      href: 'https://www.figma.com/community/plugin/1215620774867583125/figlet',
      kind: 'tool', tone: 'vermilion', tx: 'hatch',
      desc: 'A plugin IDE that runs in the browser',
      long: 'Write, run and inspect a Figma plugin without leaving the canvas it is editing.' },

    { slug: 'table-creator', year: '2022', name: 'table-creator',
      href: 'https://www.figma.com/community/plugin/885838970710285271/table-creator',
      kind: 'plugin', tone: 'teal', tx: 'bar',
      desc: 'Real data tables on the canvas',
      long: 'Tables that stay tables — resizable, re-sortable, and still native Figma layers when you hand them over.' },

    { slug: 'icon-preview', year: '2021', name: 'icon-preview',
      href: 'https://www.figma.com/community/plugin/888907972695800109/icon-preview',
      kind: 'plugin', tone: 'blue', tx: 'dot',
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
      tag: 'figma', mins: 6, href: 'note.html', tone: 'blue',
      lede: 'A Figma plugin looks like one thing and behaves like two. Almost every difficulty in building one comes from that gap.' },
    { slug: 'tool-nobody-owns', date: '2026-02', year: '2026', title: 'The tool nobody owns',
      tag: 'tooling', mins: 4, href: 'note.html', tone: 'lime',
      lede: 'Every team has one script that everyone depends on and no one maintains.' },
    { slug: 'tokens-contract', date: '2025-11', year: '2025', title: 'Tokens are a contract',
      tag: 'systems', mins: 5, href: 'note.html', tone: 'teal',
      lede: 'A token is not a variable. It is a promise made in two codebases at once.' },
    { slug: 'draw-it-first', date: '2025-07', year: '2025', title: 'Draw it first',
      tag: 'process', mins: 3, href: 'note.html', tone: 'vermilion',
      lede: 'A problem you cannot draw is a problem you do not understand yet.' },
    { slug: 'deprecation', date: '2025-03', year: '2025', title: 'Deprecation is a feature',
      tag: 'systems', mins: 4, href: 'note.html', tone: 'teal',
      lede: 'A design system that cannot remove things can only grow until it is ignored.' },
    { slug: 'sixteen-px', date: '2024-10', year: '2024', title: 'Review icons at 16px',
      tag: 'craft', mins: 2, href: 'note.html', tone: 'lime',
      lede: 'An icon set only fails at the size it ships at, and that is the size nobody reviews it at.' },
    { slug: 'ci-for-design', date: '2024-04', year: '2024', title: 'CI for design artefacts',
      tag: 'tooling', mins: 5, href: 'note.html', tone: 'blue',
      lede: 'If the design file breaks the build, the design file is part of the build.' },
  ],

  /* The eight devices this system uses to make rank without ever
     changing the type size. `signal.html` demonstrates each one on
     identical content, which is the only fair way to judge them. */
  ranks: [
    { id: 'fill',    name: 'Enamel fill',   note: 'A saturated flat panel with its paired ink. The loudest device in the set, and the reason it can afford to have no display size at all.' },
    { id: 'invert',  name: 'Inversion',     note: 'Ink block, ground-coloured text. Loud without spending a colour, so it can be used where a fill would be too much.' },
    { id: 'weight',  name: 'Weight',        note: 'The same 15px at 600 instead of 400. The quietest device here, and the only one that survives being used on every sheet.' },
    { id: 'colour',  name: 'Accent text',   note: 'Vermilion on the ground. The one enamel allowed to be text rather than a fill, reserved for links, numbering and the live item.' },
    { id: 'rule',    name: 'Rule weight',   note: 'A 2px rule over a 1px hairline. Structural rank that costs no colour and no space at all.' },
    { id: 'number',  name: 'Numbering',     note: 'Two digits in the accent. Says "this is an ordered set" and "this is item three" at once, in four characters.' },
    { id: 'edge',    name: 'Edge marker',   note: 'A 3px enamel bar down the left of a block. Marks a run of content as belonging together without boxing it in.' },
    { id: 'space',   name: 'Space',         note: 'Rank by isolation — the same block with more room around it than its neighbours. The most expensive device, so it is used least.' },
  ],

  board: {
    title: 'plugma — working board',
    notes: [
      { x: 0,   y: 0,   w: 300, kind: 'doc', label: 'Brief',
        text: 'A zero-config toolchain for Figma plugins. Scaffold it, develop it with real hot reloading, ship it — without hand-assembling a bundler, a manifest and a message bridge first.' },
      { x: 380, y: -40, w: 176, kind: 'note', tone: 'lime',      label: '01', text: 'Zero\nconfig' },
      { x: 596, y: -40, w: 176, kind: 'note', tone: 'blue',      label: '02', text: 'Real HMR,\nstate kept' },
      { x: 380, y: 140, w: 176, kind: 'note', tone: 'teal',      label: '03', text: 'React\nSvelte\nVue' },
      { x: 596, y: 140, w: 176, kind: 'note', tone: 'vermilion', label: '04', text: 'One command\nto ship' },
      { x: 0,   y: 320, w: 340, kind: 'code', label: 'main.ts',
        text: "// sandbox half — document access, no DOM\nfigma.ui.onmessage = (msg) => {\n  if (msg.type === 'resize') {\n    figma.ui.resize(msg.w, msg.h)\n  }\n}" },
      { x: 852, y: -40, w: 300, kind: 'doc', label: 'How it works',
        text: 'The UI is served from a dev server while you work and inlined at build time, so the sandbox half never notices the difference. Messages are typed across the bridge.' },
      { x: 852, y: 220, w: 300, kind: 'doc', label: 'The point',
        text: 'Interface work stops being a stop-start loop. That is the whole return on the tool.' },
      { x: 380, y: 340, w: 392, kind: 'note', tone: 'ink', label: '05', text: 'Ship the loop,\nnot the config' },
    ],
  },
};
