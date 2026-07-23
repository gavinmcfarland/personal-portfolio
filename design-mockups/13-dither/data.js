/* ══════════════════════════════════════════════════════════════════
   13 · DITHER — content
   The register is a manual page, so the content model is shaped like
   one: everything has a NAME, a one-line synopsis, and a body. Each
   project also names the dither plate it is printed with, because in
   this set a plate is an illustration rather than a placeholder and
   the choice of field is part of the entry.
   ══════════════════════════════════════════════════════════════════ */

window.DATA = {

  who: {
    name: 'Gavin McFarland',
    role: 'Design engineer',
    line: 'Builds the tools design systems are made with, and the systems themselves.',
    place: 'London, United Kingdom',
    email: 'gavin@limitlessloop.com',
    github: 'https://github.com/gavinmcfarland',
    stack: 'TypeScript, Svelte, Node.js, React, Vite, Figma API',
    domains: 'Finance, government, retail',
  },

  nav: [
    { id: 'index',    name: 'gavin(1)',    href: 'index.html' },
    { id: 'work',     name: 'work(1)',     href: 'work.html' },
    { id: 'project',  name: 'plugma(1)',   href: 'project.html' },
    { id: 'journal',  name: 'journal(1)',  href: 'journal.html' },
    { id: 'note',     name: 'note(1)',     href: 'note.html' },
    { id: 'textures', name: 'dither(7)',   href: 'textures.html' },
    { id: 'contact',  name: 'contact(1)',  href: 'contact.html' },
    { id: 'board',    name: 'board(1)',    href: 'board.html' },
  ],

  /* `plate` names one of the six dither fields in §3 of system.css.
     They are not interchangeable: each was tuned so its clumping
     reads at the size the entry prints it. */
  projects: [
    { slug: 'plugma', year: '2024', name: 'plugma', href: 'project.html',
      flag: '--toolchain', plate: 'a', kind: 'Tool',
      desc: 'Build Figma plugins with a single command and the hot reloading the platform never shipped.',
      long: 'A plugin is two programs that cannot see each other. Plugma puts the bundler, the manifest and the message bridge underneath one command, and keeps the plugin state alive across an edit.',
      link: 'plugma.dev' },

    { slug: 'askeroo', year: '2024', name: 'askeroo',
      href: 'https://github.com/gavinmcfarland/askeroo',
      flag: '--prompts', plate: 'b', kind: 'Library',
      desc: 'Command-line prompts that remember the question before them, so ⌃C is not the only way back.',
      long: 'Every question holds a reference to its predecessor, which makes backward navigation a property of the data rather than a feature bolted on afterwards.',
      link: 'github.com' },

    { slug: 'screenshot-2-layout', year: '2024', name: 'screenshot-2-layout', href: '#',
      flag: '--infer', plate: 'c', kind: 'Plug-in',
      desc: 'Take a flat screenshot and rebuild it as a real auto-layout frame, not a pile of absolute boxes.',
      long: 'Infers a nesting structure from pixel alignment and rebuilds it with genuine auto-layout, so the result survives being edited afterwards.',
      link: 'figma.com/community' },

    { slug: 'figlet', year: '2023', name: 'figlet',
      href: 'https://www.figma.com/community/plugin/1215620774867583125/figlet',
      flag: '--ide', plate: 'd', kind: 'Tool',
      desc: 'Write, run and inspect a Figma plugin without leaving the canvas it is editing.',
      long: 'A plugin IDE that runs inside the browser, so the edit-run loop happens in the same window as the document being changed.',
      link: 'figma.com/community' },

    { slug: 'table-creator', year: '2022', name: 'table-creator',
      href: 'https://www.figma.com/community/plugin/885838970710285271/table-creator',
      flag: '--tables', plate: 'e', kind: 'Plug-in',
      desc: 'Create and maintain complex data tables on the Figma canvas, with dynamic content and bulk edits that survive later changes to the design.',
      long: 'Tables stay tables — resizable, re-sortable, and still native layers when you hand the file over.',
      link: 'figma.com/community' },

    { slug: 'icon-preview', year: '2021', name: 'icon-preview',
      href: 'https://www.figma.com/community/plugin/888907972695800109/icon-preview',
      flag: '--icons', plate: 'f', kind: 'Plug-in',
      desc: 'Preview the icon currently being edited at the preset sizes it will ship at, across web, iOS and Android, without leaving the canvas.',
      long: 'An icon set only fails at the size it ships at, and that is the size nobody reviews it at.',
      link: 'figma.com/community' },
  ],

  capabilities: [
    { k: '--design-systems', v: 'Token pipelines, component APIs, contribution and deprecation process, and documentation that survives a handover.' },
    { k: '--front-end',      v: 'TypeScript, Svelte, React, Vite. Accessibility to WCAG 2.2 AA treated as a build gate rather than a review step.' },
    { k: '--tooling',        v: 'Node CLIs, bundler configuration, the Figma plugin API, and continuous integration that runs on design artefacts.' },
  ],

  environment: [
    { k: 'STACK',   v: 'TypeScript, Svelte, Node.js, React, Vite, Figma API' },
    { k: 'BASED',   v: 'London, United Kingdom' },
    { k: 'DOMAINS', v: 'Finance, government, retail' },
    { k: 'SINCE',   v: '2009' },
  ],

  clients: ['American Express', 'NatWest', 'Home Office', 'John Lewis', 'LSEG', 'Ecologi', 'Amazon'],

  posts: [
    { slug: 'hot-reload', date: '2026-05', year: '2026', title: 'Two programs, one plugin',
      tag: 'figma', mins: 6, href: 'note.html', plate: 'a',
      lede: 'A Figma plugin looks like one thing and behaves like two. Almost every difficulty in building one comes from that gap.' },
    { slug: 'tool-nobody-owns', date: '2026-02', year: '2026', title: 'The tool nobody owns',
      tag: 'tooling', mins: 4, href: 'note.html', plate: 'c',
      lede: 'Every team has one script that everyone depends on and no one maintains.' },
    { slug: 'tokens-contract', date: '2025-11', year: '2025', title: 'Tokens are a contract',
      tag: 'systems', mins: 5, href: 'note.html', plate: 'e',
      lede: 'A token is not a variable. It is a promise made in two codebases at once.' },
    { slug: 'draw-it-first', date: '2025-07', year: '2025', title: 'Draw it first',
      tag: 'process', mins: 3, href: 'note.html', plate: 'b',
      lede: 'A problem you cannot draw is a problem you do not understand yet.' },
    { slug: 'deprecation', date: '2025-03', year: '2025', title: 'Deprecation is a feature',
      tag: 'systems', mins: 4, href: 'note.html', plate: 'd',
      lede: 'A design system that cannot remove things can only grow until it is ignored.' },
    { slug: 'sixteen-px', date: '2024-10', year: '2024', title: 'Review icons at 16px',
      tag: 'craft', mins: 2, href: 'note.html', plate: 'f',
      lede: 'An icon set only fails at the size it ships at, and that is the size nobody reviews it at.' },
    { slug: 'ci-for-design', date: '2024-04', year: '2024', title: 'CI for design artefacts',
      tag: 'tooling', mins: 5, href: 'note.html', plate: 'c',
      lede: 'If the design file breaks the build, the design file is part of the build.' },
  ],

  /* The six fields and the five decals — the subject of dither(7).
     `use` is the honest note on where each one earns its keep. */
  plates: [
    { id: 'a', name: 'grid',  use: 'Square dots on a 6px pitch, with the denser passages falling on a 72px checkerboard. The default: the clumping is laid out on a grid, so it reads as constructed rather than as noise.' },
    { id: 'b', name: 'band',  use: 'Rectangular bands on a fixed 62px repeat, a narrower dense rule sitting inside each. Wants a wide crop; a tall one cuts the rhythm and looks like a mistake.' },
    { id: 'c', name: 'fine',  use: 'An even 4px field with a single true circle of denser dots at the centre. The quietest of the six — use it when the words beside the plate are carrying the entry.' },
    { id: 'd', name: 'disc',  use: 'A regular grid of true circles, each with a smaller concentric circle of coarser dots inside it. The loudest field: one per page.' },
    { id: 'e', name: 'moiré', use: 'Two square grids at 7px and 8px, beating against each other. The one field whose pattern is generated by arithmetic rather than drawn by a mask.' },
    { id: 'f', name: 'block', use: 'Two checkerboards of rectangles at 40px and 120px — a modular mosaic. Every edge is vertical or horizontal, which makes it the most obviously built of the six.' },
  ],

  decals: [
    { id: 'seal',   name: 'seal',   use: 'A true circular ring of square dots, cut with an explicit radius so it stays round in any box. Stamped over a corner to mark something approved, current, or simply finished.' },
    { id: 'crop',   name: 'crop',   use: 'Register marks in the margin. Says "this is a proof" without a word of explanation.' },
    { id: 'tab',    name: 'tab',    use: 'A small hatched flag that sits half off the edge of a block, the way a sticker does.' },
    { id: 'chip',   name: 'chip',   use: 'A rectangle with a true circle set beside it, both filled with the same dots. It overlaps whatever it is placed on, but it is plainly a constructed shape rather than a splash.' },
    { id: 'stripe', name: 'stripe', use: 'A dithered band, used as a rule with weight. Separates sections when a hairline would be too quiet.' },
  ],

  board: {
    title: 'plugma — working board',
    notes: [
      { x: 0,   y: 0,   w: 300, kind: 'doc', label: 'BRIEF',
        text: 'A zero-config toolchain for Figma plugins. Scaffold it, develop it with real hot reloading, ship it — without hand-assembling a bundler, a manifest and a message bridge first.' },
      { x: 380, y: -40, w: 176, kind: 'note', plate: 'a', label: '01', text: 'Zero\nconfig' },
      { x: 596, y: -40, w: 176, kind: 'note', plate: 'd', label: '02', text: 'Real HMR,\nstate kept' },
      { x: 380, y: 140, w: 176, kind: 'note', plate: 'e', label: '03', text: 'React\nSvelte\nVue' },
      { x: 596, y: 140, w: 176, kind: 'note', plate: 'b', label: '04', text: 'One command\nto ship' },
      { x: 0,   y: 320, w: 340, kind: 'code', label: 'main.ts',
        text: "// sandbox half — document access, no DOM\nfigma.ui.onmessage = (msg) => {\n  if (msg.type === 'resize') {\n    figma.ui.resize(msg.w, msg.h)\n  }\n}" },
      { x: 852, y: -40, w: 300, kind: 'doc', label: 'HOW IT WORKS',
        text: 'The UI is served from a dev server while you work and inlined at build time, so the sandbox half never notices the difference. Messages are typed across the bridge.' },
      { x: 852, y: 220, w: 300, kind: 'doc', label: 'THE POINT',
        text: 'Interface work stops being a stop-start loop. That is the whole return on the tool.' },
      { x: 380, y: 340, w: 392, kind: 'note', plate: 'f', label: '05', text: 'Ship the loop,\nnot the config' },
    ],
  },
};
