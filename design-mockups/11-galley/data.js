/* ══════════════════════════════════════════════════════════════════
   11 · GALLEY — content
   One source for every sheet. Two things differ from the earlier
   sets, and both follow from the constraints:

     · Projects carry a TEXTURE but no colour. The document half of
       this system is two inks — paper and ink — plus red for
       correction, and nothing else. A project cannot bring its own
       palette with it.
     · Board notes DO carry colour, because the board is the one
       surface where colour is allowed to live. See §5 of system.css.
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
    { id: 'index',   name: 'Galley',  href: 'index.html' },
    { id: 'space',   name: 'Space',   href: 'space.html' },
    { id: 'work',    name: 'Work',    href: 'work.html' },
    { id: 'project', name: 'Plugma',  href: 'project.html' },
    { id: 'journal', name: 'Journal', href: 'journal.html' },
    { id: 'note',    name: 'Note',    href: 'note.html' },
    { id: 'contact', name: 'Contact', href: 'contact.html' },
    { id: 'board',   name: 'Board',   href: 'board.html' },
  ],

  kinds: {
    tool:    { label: 'Tool' },
    plugin:  { label: 'Plug-in' },
    library: { label: 'Library' },
  },

  /* `tx` selects one of the five ink textures. There is no `tone`. */
  projects: [
    { slug: 'plugma', year: '2024', name: 'plugma', href: 'project.html',
      kind: 'tool', tx: 'rule',
      desc: 'Zero-config toolchain for Figma plugins',
      long: 'One command to scaffold, one to develop with real hot reloading, one to ship. The framework stays your choice.' },

    { slug: 'askeroo', year: '2024', name: 'askeroo',
      href: 'https://github.com/gavinmcfarland/askeroo',
      kind: 'library', tx: 'stipple',
      desc: 'CLI prompts you can back out of',
      long: 'A prompt library where every question remembers the one before it, so ⌃C is not the only way back.' },

    { slug: 'screenshot-2-layout', year: '2024', name: 'screenshot-2-layout', href: '#',
      kind: 'plugin', tx: 'grid',
      desc: 'Screenshot in, auto-layout frame out',
      long: 'Infers a nesting structure from a flat image and rebuilds it as real auto-layout, not a pile of absolute frames.' },

    { slug: 'figlet', year: '2023', name: 'figlet',
      href: 'https://www.figma.com/community/plugin/1215620774867583125/figlet',
      kind: 'tool', tx: 'hatch',
      desc: 'A plugin IDE that runs in the browser',
      long: 'Write, run and inspect a Figma plugin without leaving the canvas it is editing.' },

    { slug: 'table-creator', year: '2022', name: 'table-creator',
      href: 'https://www.figma.com/community/plugin/885838970710285271/table-creator',
      kind: 'plugin', tx: 'weave',
      desc: 'Real data tables on the canvas',
      long: 'Tables that stay tables — resizable, re-sortable, and still native Figma layers when you hand them over.' },

    { slug: 'icon-preview', year: '2021', name: 'icon-preview',
      href: 'https://www.figma.com/community/plugin/888907972695800109/icon-preview',
      kind: 'plugin', tx: 'stipple',
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
      tag: 'figma', mins: 6, href: 'note.html',
      lede: 'A Figma plugin looks like one thing and behaves like two. Almost every difficulty in building one comes from that gap.' },
    { slug: 'tool-nobody-owns', date: '2026-02', year: '2026', title: 'The tool nobody owns',
      tag: 'tooling', mins: 4, href: 'note.html',
      lede: 'Every team has one script that everyone depends on and no one maintains.' },
    { slug: 'tokens-contract', date: '2025-11', year: '2025', title: 'Tokens are a contract',
      tag: 'systems', mins: 5, href: 'note.html',
      lede: 'A token is not a variable. It is a promise made in two codebases at once.' },
    { slug: 'draw-it-first', date: '2025-07', year: '2025', title: 'Draw it first',
      tag: 'process', mins: 3, href: 'note.html',
      lede: 'A problem you cannot draw is a problem you do not understand yet.' },
    { slug: 'deprecation', date: '2025-03', year: '2025', title: 'Deprecation is a feature',
      tag: 'systems', mins: 4, href: 'note.html',
      lede: 'A design system that cannot remove things can only grow until it is ignored.' },
    { slug: 'sixteen-px', date: '2024-10', year: '2024', title: 'Review icons at 16px',
      tag: 'craft', mins: 2, href: 'note.html',
      lede: 'An icon set only fails at the size it ships at, and that is the size nobody reviews it at.' },
    { slug: 'ci-for-design', date: '2024-04', year: '2024', title: 'CI for design artefacts',
      tag: 'tooling', mins: 5, href: 'note.html',
      lede: 'If the design file breaks the build, the design file is part of the build.' },
  ],

  /* The occupations of the sheet — the subject of space.html.
     `note` says what the placement is FOR; `hint` is the mono
     annotation printed in the empty part of each frame, because on
     a galley the empty part is where the annotation goes. */
  places: [
    { id: 'tl',      name: 'Top left',        note: 'The default, and the one most pages should use. Content starts where the eye already is and the sheet is left open below and to the right.', hint: 'start / start' },
    { id: 'measure', name: 'The column',      note: 'One measure of 34em, set hard against the left margin. This is a galley: the type is the whole artefact and the rest of the sheet is for the hand that corrects it.', hint: '34em / start' },
    { id: 'hang',    name: 'Hanging notes',   note: 'Text on the left, annotations hung in the open field beside it. The emptiness is not decoration — it is where the marginalia lives.', hint: 'measure + margin' },
    { id: 'bleed',   name: 'Full bleed',      note: 'Edge to edge, no margin at all. Used once or twice per set: after a page of held-back margins, a band that touches both edges reads as loud without raising its voice.', hint: '100vw' },
    { id: 'bl',      name: 'Bottom left',     note: 'Content sinks to the foot of the frame, so the emptiness sits above it and presses down. The shape a closing statement wants.', hint: 'end / start' },
    { id: 'cl',      name: 'Centred left',    note: 'Vertically centred, still left-aligned. Reads calmer than top-left and costs a whole viewport to say very little.', hint: 'center / start' },
    { id: 'split',   name: 'Held apart',      note: 'One block at the top, one at the foot, and the full height of the frame between them doing nothing. The gap is the argument.', hint: 'space-between' },
    { id: 'wide',    name: 'Full width',      note: 'The measure released to the whole sheet. Only a table or a rule can survive out here; prose cannot, which is why prose is not allowed it.', hint: '100% / start' },
    { id: 'tr',      name: 'Right',           note: 'The counterweight. Used once, and only against something already anchored left — otherwise the sheet just looks mistakenly set.', hint: 'start / end' },
  ],

  /* THE ONE PLACE COLOUR LIVES. */
  board: {
    title: 'plugma — working board',
    notes: [
      { x: 0,   y: 0,   w: 300, kind: 'doc', label: 'Brief',
        text: 'A zero-config toolchain for Figma plugins. Scaffold it, develop it with real hot reloading, ship it — without hand-assembling a bundler, a manifest and a message bridge first.' },
      { x: 380, y: -40, w: 176, kind: 'note', tone: 'citron', label: '01', text: 'Zero\nconfig' },
      { x: 596, y: -40, w: 176, kind: 'note', tone: 'sky',    label: '02', text: 'Real HMR,\nstate kept' },
      { x: 380, y: 140, w: 176, kind: 'note', tone: 'rose',   label: '03', text: 'React\nSvelte\nVue' },
      { x: 596, y: 140, w: 176, kind: 'note', tone: 'ink',    label: '04', text: 'One command\nto ship' },
      { x: 0,   y: 320, w: 340, kind: 'code', label: 'main.ts',
        text: "// sandbox half — document access, no DOM\nfigma.ui.onmessage = (msg) => {\n  if (msg.type === 'resize') {\n    figma.ui.resize(msg.w, msg.h)\n  }\n}" },
      { x: 852, y: -40, w: 300, kind: 'doc', label: 'How it works',
        text: 'The UI is served from a dev server while you work and inlined at build time, so the sandbox half never notices the difference. Messages are typed across the bridge.' },
      { x: 852, y: 220, w: 300, kind: 'doc', label: 'The point',
        text: 'Interface work stops being a stop-start loop. That is the whole return on the tool.' },
      { x: 380, y: 340, w: 392, kind: 'note', tone: 'moss', label: '05', text: 'Ship the loop,\nnot the config' },
    ],
  },
};
