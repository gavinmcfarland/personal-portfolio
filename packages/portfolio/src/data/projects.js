/* Selected projects, in the order they appear on the page.

   The abstract plate on a project's home-page row is its own drawing, not a
   generated pattern: an SVG per project in src/assets/project-art/, keyed by
   `id` in src/data/projectArt.js, redrawn as square dots by <ProjectPlate>.
   Adding a project means adding an SVG under the same id — a project with no
   artwork simply renders an empty plate.

   `summary` drives the list row on the home page; the richer fields
   (`tagline`, `description`, `highlights`, `role`, `year`, …) drive the
   dedicated project page at /projects/:id.

   Set `draft: true` to hide a project everywhere — it's kept out of the home
   list and its /projects/:id page returns Not Found. Use `visibleProjects`
   (below) anywhere you want only the published set. */
export const projects = [
	{
		id: 'figlet',
		title: 'Figlet',
		kind: 'tool',
		summary: 'A browser-based IDE for Figma plugins, write and run plugin code instantly, no local setup. Like CodePen for Figma.',
		tagline: 'An in-browser editor for Figma plugin code, with a console, type hints for the plugin API, and a library of shared snippets.',
		tech: ['JavaScript', 'Figma API', 'Svelte', 'Supabase'],
		role: 'Creator',
		year: '2023',
		link: 'https://www.figma.com/community/plugin/1215620774867583125/figlet',
		linkLabel: 'Figma Community',
		description: [
			'Figma plugin development normally requires a local toolchain before any code can run. Figlet provides an editor in the browser that runs plugin code against the open document.',
			'It also includes a console for output, type hints for the plugin API, tutorials covering the basics, and accounts for publishing snippets that other people can open and reuse.',
		],
		highlights: [
			'Editor, console and type hints for the plugin API',
			'Runs code against the open Figma document',
			'Snippet library for publishing and reuse',
			'Tutorials covering the plugin API',
		],
	},
	{
		id: 'plugma',
		title: 'Plugma',
		kind: 'tool',
		draft: true,
		summary: 'A zero-config CLI for building Figma plugins with true hot-module reloading. Works with React, Svelte and Vue.',
		tagline: 'A CLI that scaffolds a plugin from a template and covers development, production builds and GitHub releases in three commands.',
		tech: ['Node.js', 'TypeScript', 'Vite'],
		role: 'Creator & maintainer',
		year: '2024',
		link: 'https://www.plugma.dev/',
		linkLabel: 'plugma.dev',
		repo: 'https://github.com/gavinmcfarland/plugma',
		description: [
			'Figma plugin projects normally need their own bundler config, manifest wiring and a full reload on every change. Plugma provides three commands, dev, build and release, over a Vite-based setup with hot-module reloading between the plugin UI and the Figma sandbox.',
			'The same workflow applies to React, Svelte and Vue projects, and includes browser previews of the plugin UI, unified bundling, and .env support for environment variables.',
		],
		highlights: [
			'Hot-module reloading across the UI and plugin sandbox',
			'Browser preview of the plugin UI during development',
			'Templates for React, Svelte and Vue',
			'Vite-based bundling, with .env support',
		],
	},
	{
		id: 'askeroo',
		title: 'Askeroo',
		kind: 'library',
		summary: 'A modern CLI prompt library with stateful back-navigation, conditional fields and task runners. Built on React and Ink.',
		tagline: 'A prompt library for command-line flows. Answers are held in state, and the flow is replayed when someone steps back to change one.',
		tech: ['TypeScript', 'React', 'Ink'],
		role: 'Creator & maintainer',
		year: '2024',
		link: 'https://github.com/gavinmcfarland/askeroo',
		linkLabel: 'GitHub',
		description: [
			'Most command-line prompt libraries move in one direction: a question is answered and the flow continues, with no way back. Askeroo keeps answers in state and replays the flow when a user steps backwards, so earlier answers can be revised and later prompts re-evaluated.',
			'It is built on React and Ink, and provides text, confirm, radio, multi-select and note prompts, conditional prompts based on earlier answers, grouping, and task runners for long-running steps. It is currently an alpha release.',
		],
		highlights: [
			'Back-navigation, with the flow replayed on each change',
			'Conditional prompts based on earlier answers',
			'Task runners for long-running steps',
			'Built on React and Ink; custom prompts supported',
		],
	},
	{
		id: 'table-creator',
		title: 'Table Creator',
		kind: 'plugin',
		draft: true,
		summary: 'A Figma plugin for creating and maintaining complex data tables on the canvas, with dynamic content and bulk edits.',
		tagline: 'A Figma plugin that generates tables from component templates and keeps them editable as rows, columns and cells.',
		tech: ['TypeScript', 'Figma API', 'Svelte'],
		role: 'Creator',
		year: '2022',
		link: 'https://www.figma.com/community/plugin/885838970710285271/table-creator',
		linkLabel: 'Figma Community',
		description: [
			'Tables in Figma are slow to build and hard to keep consistent, because a change to one column has to be repeated in every row. Table Creator generates a table from a component template, taking the number of columns and rows, the table and cell sizes, cell alignment and whether a header is included.',
			'Existing tables stay editable: rows and columns can be inserted or selected, the axes switched, column resizing toggled, and every table updated when its template changes. A table can also be detached from its template.',
		],
		highlights: [
			'Tables generated from component templates',
			'Insert and select rows and columns; switch the axes',
			'Update existing tables when a template changes',
			'Detach a table from its template',
		],
	},
	{
		id: 'icon-preview',
		title: 'Icon Preview',
		kind: 'plugin',
		summary: 'A Figma plugin that live-previews the icon you are editing at preset sizes for web, iOS and Android.',
		tagline: 'A Figma plugin that renders the selected icon at general, iOS and Android preset sizes, and updates as the artwork is edited.',
		tech: ['JavaScript', 'Figma API'],
		role: 'Creator',
		year: '2021',
		link: 'https://www.figma.com/community/plugin/888907972695800109/icon-preview',
		linkLabel: 'Figma Community',
		description: [
			'An icon that reads clearly at 128px can break down at 16px, and checking each target size normally means duplicating frames. Icon Preview detects the icon being edited and renders it at the preset sizes for general use, iOS and Android in a single panel.',
			'The presets cover 16 to 128 for general use, 20 to 83.5 for iOS, and 16 to 48 for Android, each labelled with what it is used for. The preview follows the current selection or can be locked to one icon, and supports artwork up to 256px.',
		],
		highlights: [
			'General (16–128px), iOS and Android presets in one panel',
			'Follows the current selection, or locks to one icon',
			'Re-renders at every size as the icon is edited',
			'Supports artwork up to 256px',
		],
	},
	{
		id: 'layer-styles',
		title: 'Layer Styles',
		kind: 'plugin',
		summary: 'A Figma plugin for saving and applying style presets, strokes, fills, corner radius, effects, padding, grids, opacity and blend modes.',
		tagline: "Turn a layer's visual properties into a reusable style. Apply it anywhere, then edit it once to update every layer that uses it.",
		tech: ['JavaScript', 'Figma API'],
		role: 'Creator',
		year: '2020',
		link: 'https://www.figma.com/community/plugin/908303483495091267/layer-styles',
		linkLabel: 'Figma Community',
		description: [
			"Layer Styles saves the appearance of a layer as a named, reusable style: fills, strokes, stroke weight and alignment, corner radius, effects, padding, item spacing, layout grids, opacity and blend mode. Figma's own styles cover fills, strokes, effects and text, so the rest normally has to be set by hand on each layer.",
			'A style is created from a selected layer, then applied to any other selection. Styles are stored in the file itself and listed in the plugin panel, where they can be renamed, edited or removed. Editing one updates every layer using it across all pages, and a layer can be detached from its style from the Properties panel.',
		],
		highlights: [
			'Named styles created from any selected layer',
			'Covers radius, padding, grids, opacity and blend mode',
			'Editing a style updates every layer using it, across all pages',
			'Detach a layer from its style in the Properties panel',
		],
	},
];

/* The published set — everything not marked `draft`. This is what the home
   list and the numbered count should use. */
export const visibleProjects = projects.filter((p) => !p.draft);
