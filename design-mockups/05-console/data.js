/* ══════════════════════════════════════════════════════════════════
   CONSOLE — content
   One source for everything appearing in more than one place. Each
   project names its own bitmap icon and a category colour from the
   16-colour palette, so the icon and the swatch on the index, the
   detail page and the footer counts all come from here.
   ══════════════════════════════════════════════════════════════════ */

window.DATA = {

  /* Categories carry a palette colour. It is functional: it is how
     you scan a long list for one kind of thing. */
  kinds: {
    tool:    { label:'Tool',    colour:'var(--c-navy)' },
    plugin:  { label:'Plug-in', colour:'var(--c-teal)' },
    library: { label:'Library', colour:'var(--c-maroon)' },
  },

  projects: [
    { slug:'plugma', year:'2024', name:'Plugma', href:'project.html', local:true,
      kind:'tool', icon:'term',
      desc:'Zero-config toolchain for Figma plugins' },

    { slug:'askeroo', year:'2024', name:'Askeroo',
      href:'https://github.com/gavinmcfarland/askeroo',
      kind:'library', icon:'doc',
      desc:'CLI prompts you can back out of' },

    { slug:'screenshot-2-layout', year:'2024', name:'Screenshot 2 Layout', href:'#',
      kind:'plugin', icon:'board',
      desc:'Screenshot in, auto-layout frame out' },

    { slug:'figlet', year:'2023', name:'Figlet',
      href:'https://www.figma.com/community/plugin/1215620774867583125/figlet',
      kind:'tool', icon:'disc',
      desc:'A plugin IDE that runs in the browser' },

    { slug:'table-creator', year:'2022', name:'Table Creator',
      href:'https://www.figma.com/community/plugin/885838970710285271/table-creator',
      kind:'plugin', icon:'chart',
      desc:'Real data tables on the canvas' },

    { slug:'icon-preview', year:'2021', name:'Icon Preview',
      href:'https://www.figma.com/community/plugin/888907972695800109/icon-preview',
      kind:'plugin', icon:'floppy',
      desc:'Every icon at the size it ships at' },
  ],

  nav: [
    { id:'home',    name:'Work',    href:'index.html',   icon:'folder' },
    { id:'project', name:'Plugma',  href:'project.html', icon:'term' },
    { id:'contact', name:'Contact', href:'contact.html', icon:'mail' },
  ],
};
