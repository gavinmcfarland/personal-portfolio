/* ══════════════════════════════════════════════════════════════════
   14 · COLOURBAR — content
   The register is a manual page, so the content model is shaped like
   one: everything has a NAME, a one-line synopsis and a body. Each
   project also names the STRIP it is printed with and the ink it is
   printed in — in this set a strip is an illustration rather than a
   placeholder, and the choice of colour is part of the entry rather
   than decoration applied afterwards.

   `strip` is one of the six geometries in §3 of system.css.
   `inks`  is the ordered list of patches, drawn from the sixteen.
           Cell count matters: a-step wants 6–8, b-wedge wants
           exactly 6, c-quad exactly 4, d-rail exactly 5, e-slug
           exactly 1, f-key all 16.
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
    { id: 'index',   name: 'gavin(1)',   href: 'index.html' },
    { id: 'work',    name: 'work(1)',    href: 'work.html' },
    { id: 'project', name: 'plugma(1)',  href: 'project.html' },
    { id: 'journal', name: 'journal(1)', href: 'journal.html' },
    { id: 'note',    name: 'note(1)',    href: 'note.html' },
    { id: 'article', name: 'article(7)', href: 'article.html' },
    { id: 'colour',  name: 'colour(7)',  href: 'colour.html' },
    { id: 'contact', name: 'contact(1)', href: 'contact.html' },
    { id: 'board',   name: 'board(1)',   href: 'board.html' },
  ],

  /* One colour per category, so a dense row can be scanned for one
     kind of thing without reading a word of it. Three kinds, three
     of the sixteen. */
  kinds: {
    Tool:      { label: 'tool',    tone: 'navy' },
    Library:   { label: 'library', tone: 'teal' },
    'Plug-in': { label: 'plug-in', tone: 'maroon' },
  },

  projects: [
    { slug: 'plugma', year: '2024', name: 'plugma', href: 'project.html',
      flag: '--toolchain', kind: 'Tool',
      strip: 'b', inks: ['silver', 'navy', 'teal', 'aqua', 'white', 'navy'],
      desc: 'Build Figma plugins with a single command and the hot reloading the platform never shipped.',
      long: 'A plugin is two programs that cannot see each other. Plugma puts the bundler, the manifest and the message bridge underneath one command, and keeps the plugin state alive across an edit.',
      link: 'plugma.dev' },

    { slug: 'askeroo', year: '2024', name: 'askeroo',
      href: 'https://github.com/gavinmcfarland/askeroo',
      flag: '--prompts', kind: 'Library',
      strip: 'a', inks: ['teal', 'aqua', 'white', 'silver', 'gray', 'black', 'teal', 'aqua'],
      desc: 'Command-line prompts that remember the question before them, so ⌃C is not the only way back.',
      long: 'Every question holds a reference to its predecessor, which makes backward navigation a property of the data rather than a feature bolted on afterwards.',
      link: 'github.com' },

    { slug: 'screenshot-2-layout', year: '2024', name: 'screenshot-2-layout', href: '#',
      flag: '--infer', kind: 'Plug-in',
      strip: 'c', inks: ['maroon', 'silver', 'white', 'red'],
      desc: 'Take a flat screenshot and rebuild it as a real auto-layout frame, not a pile of absolute boxes.',
      long: 'Infers a nesting structure from pixel alignment and rebuilds it with genuine auto-layout, so the result survives being edited afterwards.',
      link: 'figma.com/community' },

    { slug: 'figlet', year: '2023', name: 'figlet',
      href: 'https://www.figma.com/community/plugin/1215620774867583125/figlet',
      flag: '--ide', kind: 'Tool',
      strip: 'd', inks: ['navy', 'aqua', 'teal', 'silver', 'white'],
      desc: 'Write, run and inspect a Figma plugin without leaving the canvas it is editing.',
      long: 'A plugin IDE that runs inside the browser, so the edit-run loop happens in the same window as the document being changed.',
      link: 'figma.com/community' },

    { slug: 'table-creator', year: '2022', name: 'table-creator',
      href: 'https://www.figma.com/community/plugin/885838970710285271/table-creator',
      flag: '--tables', kind: 'Plug-in',
      strip: 'e', inks: ['olive'],
      desc: 'Create and maintain complex data tables on the Figma canvas, with bulk edits that survive later changes to the design.',
      long: 'Tables stay tables — resizable, re-sortable, and still native layers when you hand the file over.',
      link: 'figma.com/community' },

    { slug: 'icon-preview', year: '2021', name: 'icon-preview',
      href: 'https://www.figma.com/community/plugin/888907972695800109/icon-preview',
      flag: '--icons', kind: 'Plug-in',
      strip: 'a', inks: ['purple', 'fuchsia', 'white', 'silver', 'gray', 'purple'],
      desc: 'Preview the icon being edited at the preset sizes it will ship at, across web, iOS and Android, without leaving the canvas.',
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

  channels: [
    { k: 'email',  v: 'gavin@limitlessloop.com', href: 'mailto:gavin@limitlessloop.com', note: 'Read daily. The reliable one.' },
    { k: 'github', v: 'github.com/gavinmcfarland', href: 'https://github.com/gavinmcfarland', note: 'Everything under work(1) that is public.' },
    { k: 'figma',  v: 'figma.com/@gavinmcfarland', href: 'https://www.figma.com/@gavinmcfarland', note: 'The plug-ins, and where the issues get filed.' },
  ],

  posts: [
    { slug: 'hot-reload', date: '2026-05', year: '2026', title: 'Two programs, one plugin',
      tag: 'figma', mins: 6, href: 'note.html', ink: 'navy',
      lede: 'A Figma plugin looks like one thing and behaves like two. Almost every difficulty in building one comes from that gap.' },
    { slug: 'tool-nobody-owns', date: '2026-02', year: '2026', title: 'The tool nobody owns',
      tag: 'tooling', mins: 4, href: 'note.html', ink: 'teal',
      lede: 'Every team has one script that everyone depends on and no one maintains.' },
    { slug: 'tokens-contract', date: '2025-11', year: '2025', title: 'Tokens are a contract',
      tag: 'systems', mins: 5, href: 'article.html', ink: 'maroon',
      lede: 'A token is not a variable. It is a promise made in two codebases at once.' },
    { slug: 'draw-it-first', date: '2025-07', year: '2025', title: 'Draw it first',
      tag: 'process', mins: 3, href: 'note.html', ink: 'olive',
      lede: 'A problem you cannot draw is a problem you do not understand yet.' },
    { slug: 'deprecation', date: '2025-03', year: '2025', title: 'Deprecation is a feature',
      tag: 'systems', mins: 4, href: 'note.html', ink: 'maroon',
      lede: 'A design system that cannot remove things can only grow until it is ignored.' },
    { slug: 'sixteen-px', date: '2024-10', year: '2024', title: 'Review icons at 16px',
      tag: 'craft', mins: 2, href: 'note.html', ink: 'purple',
      lede: 'An icon set only fails at the size it ships at, and that is the size nobody reviews it at.' },
    { slug: 'ci-for-design', date: '2024-04', year: '2024', title: 'CI for design artefacts',
      tag: 'tooling', mins: 5, href: 'note.html', ink: 'teal',
      lede: 'If the design file breaks the build, the design file is part of the build.' },
  ],

  /* The six geometries and the four marks — the subject of
     colour(7). `use` is the honest note on where each earns a place,
     and `cells` is the count it was drawn for. */
  strips: [
    { id: 'a', name: 'step',  cells: '6–8',
      use: 'The control strip proper: equal patches in one row. The only geometry that reads at any width and any height, which is why it is the default and why half the set uses it.' },
    { id: 'b', name: 'wedge', cells: '6',
      use: 'The same row with patches growing 1:1:2:3:5:8. A density wedge measures tone by area; this measures hue by area, so the last colour is the one the picture is about. Wants a wide crop.' },
    { id: 'c', name: 'quad',  cells: '4',
      use: 'Four unequal blocks on a 3:2 / 2:3 split. The quietest of the six — reach for it when the words beside the strip are carrying the entry.' },
    { id: 'd', name: 'rail',  cells: '5',
      use: 'One field with a column of small patches down its edge: a plate with its own control strip attached, which is how a proof actually arrives from a press.' },
    { id: 'e', name: 'slug',  cells: '1',
      use: 'A single flat carrying a knocked-out folio numeral. The numeral is printed in the paired ink rather than in a tint, because a tint is a screen and this set has none.' },
    { id: 'f', name: 'key',   cells: '16',
      use: 'All sixteen at once, eight across and two down. The loudest field here and the only place the whole palette prints together: one per page, and colour(7) spends its one on the page about colour.' },
  ],

  marks: [
    { id: 'crop',  name: 'crop',
      use: 'Register marks in the margin. The one mark 13 also left undithered, because a register mark that is approximate is not a register mark. Says "this is a proof" without a word of explanation.' },
    { id: 'stamp', name: 'stamp',
      use: 'A square ring in one flat colour. 13 cut its seal as a true circle with a mask; a set that has banned curves has to say the same thing with a rectangle, and a double rule says it.' },
    { id: 'tab',   name: 'tab',
      use: 'A small flat flag hanging half off an edge, the way a sticker does. Carries two words at most — a tab that needs a sentence is a caption.' },
    { id: 'bleed', name: 'bleed',
      use: 'A band of solid colour running the width of the sheet, used as a rule with weight where a hairline would be too quiet. In the flow rather than absolute.' },
  ],

  /* The build log on project(1). */
  log: [
    { k: 'v0.1', v: 'One command that bundled both halves and nothing else. Proved the idea and almost nothing about the ergonomics.' },
    { k: 'v0.4', v: 'The message bridge grew types. The first version where a rename in the sandbox half broke the build rather than the plugin.' },
    { k: 'v0.9', v: 'Real hot reloading: the UI is served from a dev server while you work and inlined at build time, so the sandbox half never notices the difference.' },
    { k: 'v1.0', v: 'Framework templates, a published manifest schema, and the decision to stop adding options.' },
  ],

  spec: [
    { k: 'ROLE',    v: 'Design engineer — the seam between a design system and the code that ships it' },
    { k: 'STACK',   v: 'TypeScript, Svelte, Node.js, React, Vite, Figma API' },
    { k: 'LICENCE', v: 'MIT' },
    { k: 'STATUS',  v: 'Maintained' },
    { k: 'SINCE',   v: '2024' },
  ],

  board: {
    title: 'plugma — working board',
    notes: [
      { x: 0,   y: 0,   w: 300, kind: 'doc', label: 'BRIEF',
        text: 'A zero-config toolchain for Figma plugins. Scaffold it, develop it with real hot reloading, ship it — without hand-assembling a bundler, a manifest and a message bridge first.' },
      { x: 380, y: -40, w: 176, kind: 'note', ink: 'navy',   label: '01', text: 'Zero\nconfig' },
      { x: 596, y: -40, w: 176, kind: 'note', ink: 'teal',   label: '02', text: 'Real HMR,\nstate kept' },
      { x: 380, y: 140, w: 176, kind: 'note', ink: 'yellow', label: '03', text: 'React\nSvelte\nVue' },
      { x: 596, y: 140, w: 176, kind: 'note', ink: 'silver', label: '04', text: 'One command\nto ship' },
      { x: 0,   y: 320, w: 340, kind: 'code', label: 'main.ts',
        text: "// sandbox half — document access, no DOM\nfigma.ui.onmessage = (msg) => {\n  if (msg.type === 'resize') {\n    figma.ui.resize(msg.w, msg.h)\n  }\n}" },
      { x: 852, y: -40, w: 300, kind: 'doc', label: 'HOW IT WORKS',
        text: 'The UI is served from a dev server while you work and inlined at build time, so the sandbox half never notices the difference. Messages are typed across the bridge.' },
      { x: 852, y: 220, w: 300, kind: 'doc', label: 'THE POINT',
        text: 'Interface work stops being a stop-start loop. That is the whole return on the tool.' },
      { x: 380, y: 340, w: 392, kind: 'note', ink: 'maroon', label: '05', text: 'Ship the loop,\nnot the config' },
    ],
  },
};
