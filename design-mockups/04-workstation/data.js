/* ══════════════════════════════════════════════════════════════════
   WORKSTATION — content
   One source for everything that appears in more than one place: the
   document home, the icon view, the project page's prev/next, and
   the taskbar. A year fixed once is fixed everywhere.
   ══════════════════════════════════════════════════════════════════ */

window.DATA = {

  projects: [
    { slug:'plugma', year:'1996', name:'Plugma', href:'project.html', local:true,
      kind:'Application', size:'412 KB',
      desc:'Zero-config toolchain for Figma plugins' },

    { slug:'askeroo', year:'1996', name:'Askeroo',
      href:'https://github.com/gavinmcfarland/askeroo',
      kind:'Library', size:'86 KB',
      desc:'CLI prompts you can back out of' },

    { slug:'screenshot-2-layout', year:'1996', name:'Screenshot 2 Layout', href:'#',
      kind:'Plug-in', size:'204 KB',
      desc:'Screenshot in, auto-layout frame out' },

    { slug:'figlet', year:'1995', name:'Figlet',
      href:'https://www.figma.com/community/plugin/1215620774867583125/figlet',
      kind:'Application', size:'1.2 MB',
      desc:'A plugin IDE that runs in the browser' },

    { slug:'table-creator', year:'1994', name:'Table Creator',
      href:'https://www.figma.com/community/plugin/885838970710285271/table-creator',
      kind:'Plug-in', size:'318 KB',
      desc:'Real data tables on the canvas' },

    { slug:'icon-preview', year:'1993', name:'Icon Preview',
      href:'https://www.figma.com/community/plugin/888907972695800109/icon-preview',
      kind:'Plug-in', size:'97 KB',
      desc:'Every icon at the size it ships at' },
  ],

  /* The Start menu and the taskbar are built from this, so adding a
     page in one place adds it everywhere. */
  pages: [
    { id:'home',    name:'Portfolio',     href:'index.html',         ico:'folder' },
    { id:'gallery', name:'My Projects',   href:'gallery.html',       ico:'folder' },
    { id:'project', name:'Plugma',        href:'project.html',       ico:'doc' },
    { id:'board',   name:'Plugma — Board', href:'project-canvas.html', ico:'board' },
    { id:'contact', name:'Contact',       href:'contact.html',       ico:'mail' },
  ],
};
