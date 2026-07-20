/* ══════════════════════════════════════════════════════════════════
   08 · HARD MOUNT — content
   One source for all five templates. Every count shown on any page
   is derived from this object rather than typed, so the index, the
   gallery and the footer cannot drift apart.
   ══════════════════════════════════════════════════════════════════ */

window.DATA = {

  who: {
    name: 'Gavin McFarland',
    role: 'Design engineer',
    line: 'I build the tools that design systems are made with — and the systems themselves.',
    place: 'London, UK',
    email: 'gavin@limitlessloop.com',
    github: 'https://github.com/gavinmcfarland',
  },

  kinds: {
    /* Flat fills only — these are printed as bordered swatches, so
       they are chosen to stay distinguishable at 8px square. */
    tool:    { label: 'Tool',    colour: 'var(--mark)' },
    plugin:  { label: 'Plug-in', colour: 'var(--accent)' },
    library: { label: 'Library', colour: 'transparent' },
  },

  /* `art` selects one of the six CSS plate patterns in system.css.
     `glyph` is the serif mark that sits on top of it. */
  projects: [
    { slug: 'plugma', year: '2024', name: 'plugma', href: 'project.html', local: true,
      kind: 'tool', art: 'arcs', glyph: 'P',
      desc: 'Zero-config toolchain for Figma plugins',
      long: 'One command to scaffold, one to develop with real hot reloading, one to ship.' },

    { slug: 'askeroo', year: '2024', name: 'askeroo',
      href: 'https://github.com/gavinmcfarland/askeroo',
      kind: 'library', art: 'stack', glyph: 'A',
      desc: 'CLI prompts you can back out of',
      long: 'A prompt library where every question remembers the one before it, so ⌃C is not the only way back.' },

    { slug: 'screenshot-2-layout', year: '2024', name: 'screenshot-2-layout', href: '#',
      kind: 'plugin', art: 'grid', glyph: 'S',
      desc: 'Screenshot in, auto-layout frame out',
      long: 'Infers a nesting structure from a flat image and rebuilds it as real auto-layout.' },

    { slug: 'figlet', year: '2023', name: 'figlet',
      href: 'https://www.figma.com/community/plugin/1215620774867583125/figlet',
      kind: 'tool', art: 'bars', glyph: 'F',
      desc: 'A plugin IDE that runs in the browser',
      long: 'Write, run and inspect a Figma plugin without leaving the canvas it is editing.' },

    { slug: 'table-creator', year: '2022', name: 'table-creator',
      href: 'https://www.figma.com/community/plugin/885838970710285271/table-creator',
      kind: 'plugin', art: 'rule', glyph: 'T',
      desc: 'Real data tables on the canvas',
      long: 'Tables that stay tables — resizable, re-sortable, and still native Figma layers.' },

    { slug: 'icon-preview', year: '2021', name: 'icon-preview',
      href: 'https://www.figma.com/community/plugin/888907972695800109/icon-preview',
      kind: 'plugin', art: 'dots', glyph: 'I',
      desc: 'Every icon at the size it ships at',
      long: 'Because an icon set only fails at 16px, and that is the size nobody reviews it at.' },
  ],

  capabilities: [
    { k: 'Design systems', v: 'Token pipelines, component APIs, contribution and deprecation process, documentation that survives a handover.' },
    { k: 'Front-end',      v: 'TypeScript, Svelte, React, Vite. Accessibility to WCAG 2.2 AA treated as a build gate, not a review step.' },
    { k: 'Tooling',        v: 'Node CLIs, bundler configuration, the Figma plugin API, and CI that runs on design artefacts.' },
  ],

  facts: [
    { k: 'Year',   v: '2024' },
    { k: 'Role',   v: 'Creator, maintainer' },
    { k: 'Status', v: 'Maintained' },
    { k: 'Stack',  v: 'Node, TypeScript, Vite' },
    { k: 'Licence', v: 'MIT' },
  ],

  clients: ['American Express', 'NatWest', 'Home Office', 'John Lewis', 'LSEG', 'Ecologi', 'Amazon'],

  nav: [
    { id: 'home',    name: 'Index',   href: 'index.html' },
    { id: 'work',    name: 'Gallery', href: 'gallery.html' },
    { id: 'project', name: 'Plugma',  href: 'project.html' },
    { id: 'canvas',  name: 'Board',   href: 'project-canvas.html' },
    { id: 'contact', name: 'Contact', href: 'contact.html' },
  ],
};
