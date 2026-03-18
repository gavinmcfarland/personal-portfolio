export const projects = [
  {
    id: 'plugma',
    title: 'Plugma',
    tagline: 'Figma Plugin Development CLI',
    description: 'A command-line tool that simplifies Figma plugin development. Features true hot module reloading, in-browser previews, unified bundling, and .env support. Supports React, Svelte, and Vue.',
    features: [
      'True Hot Module Reloading (HMR)',
      'Zero-configuration setup',
      'Multi-framework support (React, Svelte, Vue)',
      'In-browser previews',
      'Built-in development server',
      'Environment variable support'
    ],
    tech: ['Node.js', 'TypeScript', 'Vite'],
    link: 'https://www.plugma.dev/',
    github: 'https://github.com/gavinmcfarland/plugma',
    category: 'Developer Tool',
    highlight: true
  },
  {
    id: 'table-creator',
    title: 'Table Creator',
    tagline: 'Figma Plugin',
    description: 'A Figma plugin for creating and managing complex data tables directly on the canvas. Handles dynamic content, custom styling, and bulk operations with an intuitive interface.',
    features: [
      'Dynamic data handling',
      'Custom styling system',
      'Bulk operations',
      'Real-time updates',
      'Export functionality'
    ],
    tech: ['TypeScript', 'Figma Plugin API', 'Svelte'],
    link: 'https://www.figma.com/community/plugin/885838970710285271/table-creator',
    github: 'https://github.com/gavinmcfarland/figma-table-creator',
    category: 'Figma Plugin',
    highlight: true
  },
  {
    id: 'askeroo',
    title: 'Askeroo',
    tagline: 'CLI Prompt Library',
    description: 'A modern CLI prompt library with flow control, back navigation, and conditional fields. Build interactive CLI experiences with text, radio, multi-select prompts, task runners, and markdown notes.',
    features: [
      'Stateful back navigation',
      'Dynamic branching & conditionals',
      'Task execution with progress tracking',
      'Markdown & chalk support',
      'Custom prompts via React & Ink'
    ],
    tech: ['TypeScript', 'React', 'Ink'],
    link: 'https://www.npmjs.com/package/askeroo',
    github: 'https://github.com/gavinmcfarland/askeroo',
    category: 'Developer Tool',
    highlight: true
  },
  {
    id: 'figlet',
    title: 'Figlet',
    tagline: 'Figma Plugin IDE',
    description: 'A browser-based IDE for Figma plugin prototyping. Like CodePen but for Figma — write and execute plugin code instantly without any local setup.',
    features: [
      'Live code execution',
      'Cloud-based workspace',
      'Community sharing',
      'No setup required',
      'Syntax highlighting'
    ],
    tech: ['JavaScript', 'Figma Plugin API', 'Svelte'],
    link: 'https://www.figma.com/community/plugin/1215620774867583125/figlet',
    github: null,
    category: 'Figma Plugin',
    highlight: true
  },
  {
    id: 'table-widget',
    title: 'Table Widget',
    tagline: 'Figma Widget',
    description: 'A Figma widget that brings spreadsheet-like data editing to the canvas. Teams can import CSVs, edit cells in real-time, and keep data synchronized across collaborators.',
    features: [
      'Real-time collaboration',
      'CSV/Excel import',
      'Data synchronization',
      'Multi-format export',
      'Performance optimized'
    ],
    tech: ['TypeScript', 'Figma Widget API', 'Svelte'],
    link: 'https://www.figma.com/community/widget/1027585818512741999/table',
    github: 'https://github.com/gavinmcfarland/figma-widget-table',
    category: 'Figma Widget',
    highlight: false
  }
];
