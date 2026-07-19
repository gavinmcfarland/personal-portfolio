/* ══════════════════════════════════════════════════════════════════
   PLATE·CONSOLE — content
   One source for every template. Each project names its bitmap icon
   and a category colour from the palette; the changelog and the CV
   read from here too, so counts and cross-links cannot drift.
   ══════════════════════════════════════════════════════════════════ */

window.DATA = {

  kinds: {
    tool:    { label:'Tool',    colour:'var(--c-navy)' },
    plugin:  { label:'Plug-in', colour:'var(--c-teal)' },
    library: { label:'Library', colour:'var(--c-maroon)' },
  },

  projects: [
    { slug:'plugma', year:'2024', name:'plugma', href:'project.html', local:true,
      kind:'tool', icon:'monitor', desc:'Zero-config toolchain for Figma plugins' },
    { slug:'askeroo', year:'2024', name:'askeroo',
      href:'https://github.com/gavinmcfarland/askeroo',
      kind:'library', icon:'doc', desc:'CLI prompts you can back out of' },
    { slug:'screenshot-2-layout', year:'2024', name:'screenshot-2-layout', href:'#',
      kind:'plugin', icon:'folder', desc:'Screenshot in, auto-layout frame out' },
    { slug:'figlet', year:'2023', name:'figlet',
      href:'https://www.figma.com/community/plugin/1215620774867583125/figlet',
      kind:'tool', icon:'floppy', desc:'A plugin IDE that runs in the browser' },
    { slug:'table-creator', year:'2022', name:'table-creator',
      href:'https://www.figma.com/community/plugin/885838970710285271/table-creator',
      kind:'plugin', icon:'grid', desc:'Real data tables on the canvas' },
    { slug:'icon-preview', year:'2021', name:'icon-preview',
      href:'https://www.figma.com/community/plugin/888907972695800109/icon-preview',
      kind:'plugin', icon:'chart', desc:'Every icon at the size it ships at' },
  ],

  /* Plugma's release notes — the changelog template */
  releases: [
    { ver:'1.4.0', date:'2026-06-18', items:[
      { t:'new', s:'Vue 3 template, alongside React and Svelte.' },
      { t:'new', s:'<code>plugma doctor</code> checks a manifest against the current API.' },
      { t:'chg', s:'Dev server binds to 127.0.0.1 by default rather than 0.0.0.0.' },
      { t:'fix', s:'Hot reload no longer drops plugin state when the manifest changes.' },
    ]},
    { ver:'1.3.2', date:'2026-04-02', items:[
      { t:'fix', s:'Windows paths with spaces broke the inline build step.' },
      { t:'fix', s:'Source maps pointed at the pre-bundle file.' },
    ]},
    { ver:'1.3.0', date:'2026-02-11', items:[
      { t:'new', s:'Typed message bridge — one declaration, both halves.' },
      { t:'chg', s:'Build output moved from <code>dist/</code> to <code>build/</code>.' },
      { t:'fix', s:'Watcher missed files added after start.' },
    ]},
    { ver:'1.2.0', date:'2025-11-27', items:[
      { t:'new', s:'Single-command release: version, build, package.' },
      { t:'chg', s:'Dropped Node 16.' },
    ]},
  ],

  /* the CV template */
  cv: {
    roles: [
      { when:'2024 —', what:'Independent', where:'Design systems &amp; developer tooling. Plugma, Askeroo, client work.' },
      { when:'2021 — 2024', what:'Senior Design Engineer', where:'Design system for a UK retail group — tokens, components, governance.' },
      { when:'2018 — 2021', what:'Design Engineer', where:'Financial services. Front-end build and a component library used by nine teams.' },
      { when:'2014 — 2018', what:'Interaction Designer', where:'Government and public-sector services.' },
      { when:'2010 — 2014', what:'Front-end Developer', where:'Agency work — retail, publishing, charity.' },
    ],
    skills: [
      { k:'Design systems', v:'Token pipelines, component APIs, contribution and deprecation process, documentation that survives handover.' },
      { k:'Front-end', v:'TypeScript, Svelte, React, Vite. Accessibility to WCAG 2.2 AA as a build gate, not a review step.' },
      { k:'Tooling', v:'Node CLIs, bundler configuration, Figma plugin API, CI for design artefacts.' },
    ],
    clients: 'American Express · NatWest · Home Office · John Lewis · LSEG · Ecologi · Amazon',
  },

  nav: [
    { id:'home',      name:'Index',     href:'index.html',       icon:'folder' },
    { id:'project',   name:'Plugma',    href:'project.html',     icon:'monitor' },
    { id:'changelog', name:'Changelog', href:'changelog.html',   icon:'doc' },
    { id:'specimen',  name:'Icons',     href:'specimen.html',    icon:'grid' },
    { id:'cv',        name:'CV',        href:'cv.html',          icon:'chart' },
  ],
};
