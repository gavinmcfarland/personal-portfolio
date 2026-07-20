/* ══════════════════════════════════════════════════════════════════
   09 · IMPOSITION — content
   One source for all nine templates. The same six projects are
   rendered as a ruled table (index), a bento (gallery), a mono index
   (archive) and all four at once (specimen) — so if the treatments
   ever disagree about the content, the system has failed, visibly.
   Counts are derived, never typed.
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

  /* Every page in the imposition, in press order. `n` is printed —
     the numbering IS the hierarchy in this system. */
  nav: [
    { id: 'index',    name: 'index',    href: 'index.html' },
    { id: 'journal',  name: 'journal',  href: 'journal.html' },
    { id: 'gallery',  name: 'gallery',  href: 'gallery.html' },
    { id: 'project',  name: 'plugma',   href: 'project.html' },
    { id: 'specimen', name: 'specimen', href: 'specimen.html' },
    { id: 'archive',  name: 'archive',  href: 'archive.html' },
    { id: 'contact',  name: 'contact',  href: 'contact.html' },
    { id: 'board',    name: 'board',    href: 'board.html' },
  ],

  /* Kind chips are flat fills with a paired ink — never tinted text. */
  kinds: {
    tool:    { label: 'tool',    tone: 'yellow' },
    plugin:  { label: 'plug-in', tone: 'cyan' },
    library: { label: 'library', tone: 'navy' },
  },

  /* `tx` picks the texture a project's plate is filled with, `tone`
     the flat colour under it. Both come from the fixed vocabularies
     in system.css — projects cannot invent their own. */
  projects: [
    { slug: 'plugma', year: '2024', name: 'plugma', href: 'project.html', local: true,
      kind: 'tool', tx: 'check', tone: 'yellow',
      desc: 'Zero-config toolchain for Figma plugins',
      long: 'One command to scaffold, one to develop with real hot reloading, one to ship.' },

    { slug: 'askeroo', year: '2024', name: 'askeroo',
      href: 'https://github.com/gavinmcfarland/askeroo',
      kind: 'library', tx: 'ruled', tone: 'navy',
      desc: 'CLI prompts you can back out of',
      long: 'A prompt library where every question remembers the one before it, so ⌃C is not the only way back.' },

    { slug: 'screenshot-2-layout', year: '2024', name: 'screenshot-2-layout', href: '#',
      kind: 'plugin', tx: 'dots', tone: 'cyan',
      desc: 'Screenshot in, auto-layout frame out',
      long: 'Infers a nesting structure from a flat image and rebuilds it as real auto-layout.' },

    { slug: 'figlet', year: '2023', name: 'figlet',
      href: 'https://www.figma.com/community/plugin/1215620774867583125/figlet',
      kind: 'tool', tx: 'scan', tone: 'pink',
      desc: 'A plugin IDE that runs in the browser',
      long: 'Write, run and inspect a Figma plugin without leaving the canvas it is editing.' },

    { slug: 'table-creator', year: '2022', name: 'table-creator',
      href: 'https://www.figma.com/community/plugin/885838970710285271/table-creator',
      kind: 'plugin', tx: 'ruled', tone: 'sage',
      desc: 'Real data tables on the canvas',
      long: 'Tables that stay tables — resizable, re-sortable, and still native Figma layers.' },

    { slug: 'icon-preview', year: '2021', name: 'icon-preview',
      href: 'https://www.figma.com/community/plugin/888907972695800109/icon-preview',
      kind: 'plugin', tx: 'hatch', tone: 'slate',
      desc: 'Every icon at the size it ships at',
      long: 'Because an icon set only fails at 16px, and that is the size nobody reviews it at.' },
  ],

  capabilities: [
    { k: 'design systems', v: 'Token pipelines, component APIs, contribution and deprecation process, documentation that survives a handover.' },
    { k: 'front-end',      v: 'TypeScript, Svelte, React, Vite. Accessibility to WCAG 2.2 AA treated as a build gate, not a review step.' },
    { k: 'tooling',        v: 'Node CLIs, bundler configuration, the Figma plugin API, and CI that runs on design artefacts.' },
  ],

  facts: [
    { k: 'place',   v: 'London, UK' },
    { k: 'role',    v: 'Design engineer' },
    { k: 'status',  v: 'Independent' },
    { k: 'since',   v: '2009' },
  ],

  clients: ['American Express', 'NatWest', 'Home Office', 'John Lewis', 'LSEG', 'Ecologi', 'Amazon'],

  /* Journal. One entry carries a full body and is what post.html
     shows; the rest exist so the ledger has honest density. */
  posts: [
    { slug: 'hot-reload', date: '2026-05', year: '2026', title: 'Two programs, one plugin',
      tag: 'figma', mins: 6, pinned: true, href: 'post.html', local: true,
      lede: 'A Figma plugin looks like one thing and behaves like two. Almost every difficulty in building one comes from that gap.' },

    { slug: 'tool-nobody-owns', date: '2026-02', year: '2026', title: 'The tool nobody owns',
      tag: 'tooling', mins: 4, href: 'post.html',
      lede: 'Every team has one script that everyone depends on and no one maintains.' },

    { slug: 'tokens-contract', date: '2025-11', year: '2025', title: 'Tokens are a contract',
      tag: 'systems', mins: 5, href: 'post.html',
      lede: 'A token is not a variable. It is a promise made in two codebases at once.' },

    { slug: 'draw-it-first', date: '2025-07', year: '2025', title: 'Draw it first',
      tag: 'process', mins: 3, href: 'post.html',
      lede: 'A problem you cannot draw is a problem you do not understand yet.' },

    { slug: 'deprecation', date: '2025-03', year: '2025', title: 'Deprecation is a feature',
      tag: 'systems', mins: 4, href: 'post.html',
      lede: 'A design system that cannot remove things can only grow until it is ignored.' },

    { slug: 'sixteen-px', date: '2024-10', year: '2024', title: 'Review icons at 16px',
      tag: 'craft', mins: 2, href: 'post.html',
      lede: 'An icon set only fails at the size it ships at, and that is the size nobody reviews it at.' },

    { slug: 'ci-for-design', date: '2024-04', year: '2024', title: 'CI for design artefacts',
      tag: 'tooling', mins: 5, href: 'post.html',
      lede: 'If the design file breaks the build, the design file is part of the build.' },
  ],

  /* Board notes — world coordinates, one of the four bold tones.
     Rendered by board.js on board.html and, statically and smaller,
     as the figure on project.html. */
  board: {
    title: 'plugma — working board',
    notes: [
      { x: 0,    y: 0,   w: 300, kind: 'doc', label: 'brief',
        text: 'A zero-config toolchain for Figma plugins. Scaffold it, develop it with real hot reloading, ship it — without hand-assembling a bundler, a manifest and a message bridge first.' },
      { x: 380,  y: -40, w: 176, kind: 'note', tone: 'yellow', label: '01', text: 'Zero\nconfig' },
      { x: 596,  y: -40, w: 176, kind: 'note', tone: 'cyan',   label: '02', text: 'Real HMR,\nstate kept' },
      { x: 380,  y: 140, w: 176, kind: 'note', tone: 'sage',   label: '03', text: 'React\nSvelte\nVue' },
      { x: 596,  y: 140, w: 176, kind: 'note', tone: 'navy',   label: '04', text: 'One command\nto ship' },
      { x: 0,    y: 320, w: 340, kind: 'code', label: 'main.ts',
        text: "// sandbox half — document access, no DOM\nfigma.ui.onmessage = (msg) => {\n  if (msg.type === 'resize') {\n    figma.ui.resize(msg.w, msg.h)\n  }\n}" },
      { x: 852,  y: -40, w: 300, kind: 'doc', label: 'how it works',
        text: 'The UI is served from a dev server while you work and inlined at build time, so the sandbox half never notices the difference. Messages are typed across the bridge.' },
      { x: 852,  y: 220, w: 300, kind: 'doc', label: 'the point',
        text: 'Interface work stops being a stop-start loop. That is the whole return on the tool.' },
      { x: 380,  y: 340, w: 392, kind: 'note', tone: 'pink', label: '05', text: 'Ship the loop,\nnot the config' },
    ],
  },
};
