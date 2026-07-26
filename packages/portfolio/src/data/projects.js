/* Selected projects, in the order they appear on the page.

   `seed` + `archetype` are the project's dither plate — the abstract artwork on
   its home-page row. <ProjectPlate> feeds both to @gavinmcfarland/dither's
   `retro` generator: the seed decides the pattern's parameters, the archetype
   which algorithm draws them. Same pair, same plate, always.

   Pin the archetype rather than letting the seed choose it. The generator draws
   the pick either way, so naming it never shifts the parameters — but it does
   mean a plate stays the algorithm it was chosen as, whatever the package adds
   to its archetype bag later. Where a comment names a `dither-xxxx` label, that
   is the caption the dither demo prints for the texture (a hash of the seed,
   not the seed itself) — kept so a plate can be matched back to the demo tile
   it was picked from.

   `summary` drives the list row on the home page; the richer fields
   (`tagline`, `description`, `highlights`, `role`, `year`, …) drive the
   dedicated project page at /projects/:id.

   Set `draft: true` to hide a project everywhere — it's kept out of the home
   list and its /projects/:id page returns Not Found. Use `visibleProjects`
   (below) anywhere you want only the published set. */
export const projects = [
	{
		id: 'figlet',
		seed: 'retro-7003-19', // demo label dither-9126
		archetype: 'plasma',
		title: 'Figlet',
		kind: 'tool',
		summary: 'A browser-based IDE for Figma plugins, write and run plugin code instantly, no local setup. Like CodePen for Figma.',
		tagline: 'A browser-based IDE for Figma plugins, write and run plugin code instantly, no local setup.',
		tech: ['JavaScript', 'Figma API', 'Svelte', 'Supabase'],
		role: 'Creator',
		year: '2023',
		link: 'https://www.figma.com/community/plugin/1215620774867583125/figlet',
		linkLabel: 'Figma Community',
		description: [
			'Getting started with Figma plugin development normally means a local toolchain before you can write a single line. Figlet collapses that barrier: an in-browser editor where you write plugin code and run it against the live document immediately.',
			'Think of it as CodePen for Figma — an instant, low-commitment place to prototype ideas, learn the plugin API, or share a working snippet.',
		],
		highlights: [
			'Write and run plugin code directly in the browser',
			'No local environment or build step to get started',
			'Instant feedback against the live Figma document',
			'Great for prototyping, learning and sharing snippets',
		],
	},
	{
		id: 'plugma',
		seed: 'plugma-25',
		archetype: 'maze',
		title: 'Plugma',
		kind: 'tool',
		draft: true,
		summary: 'A zero-config CLI for building Figma plugins with true hot-module reloading. Works with React, Svelte and Vue.',
		tagline: 'A zero-config CLI for building Figma plugins — with hot-module reloading that actually works.',
		tech: ['Node.js', 'TypeScript', 'Vite'],
		role: 'Creator & maintainer',
		year: '2024',
		link: 'https://www.plugma.dev/',
		linkLabel: 'plugma.dev',
		repo: 'https://github.com/gavinmcfarland/plugma',
		description: [
			'Building Figma plugins usually means wrestling with bundler config, manifest wiring and a slow reload-the-whole-thing feedback loop. Plugma removes that friction: a single command scaffolds, runs and builds a plugin, with genuine hot-module reloading between the plugin UI and the Figma sandbox.',
			'It is framework-agnostic by design — the same workflow drops into React, Svelte or Vue projects — and ships production builds ready for the Figma Community with no extra setup.',
		],
		highlights: [
			'True HMR across the UI and plugin sandbox — no full reloads',
			'Framework-agnostic: React, Svelte and Vue out of the box',
			'Zero config to start; a single command to build and publish',
			'Powered by Vite for fast, modern bundling',
		],
	},
	{
		id: 'askeroo',
		seed: 'retro-7003-22', // demo label dither-9023
		archetype: 'bayer',
		title: 'Askeroo',
		kind: 'library',
		summary: 'A modern CLI prompt library with stateful back-navigation, conditional fields and task runners. Built on React and Ink.',
		tagline: 'A modern CLI prompt library that treats a terminal flow like a real, navigable form.',
		tech: ['TypeScript', 'React', 'Ink'],
		role: 'Creator & maintainer',
		year: '2024',
		link: 'https://github.com/gavinmcfarland/askeroo',
		linkLabel: 'GitHub',
		description: [
			'Most command-line prompt libraries are one-way: answer a question, move on, and there is no going back. Askeroo models a CLI flow as stateful and reversible — users can step backwards, revise earlier answers, and see later fields react.',
			'Built on React and Ink, it supports conditional fields that appear based on prior input, plus integrated task runners so long-running steps sit naturally inside the same flow.',
		],
		highlights: [
			'Stateful back-navigation — revise earlier answers at any time',
			'Conditional fields that respond to prior input',
			'Built-in task runners for long-running steps',
			'Composable, declarative API built on React + Ink',
		],
	},
	{
		id: 'table-creator',
		seed: 'table-creator-9',
		archetype: 'chevron',
		title: 'Table Creator',
		kind: 'plugin',
		draft: true,
		summary: 'A Figma plugin for creating and maintaining complex data tables on the canvas, with dynamic content and bulk edits.',
		tagline: 'A Figma plugin for building and maintaining complex data tables directly on the canvas.',
		tech: ['TypeScript', 'Figma API', 'Svelte'],
		role: 'Creator',
		year: '2022',
		link: 'https://www.figma.com/community/plugin/885838970710285271/table-creator',
		linkLabel: 'Figma Community',
		description: [
			'Data tables in design tools are tedious to build and painful to keep in sync — a change to one column means hand-editing every row. Table Creator makes tables a first-class, maintainable object on the Figma canvas.',
			'It supports dynamic content and bulk edits, so structural changes propagate across the whole table instead of being repeated cell by cell.',
		],
		highlights: [
			'Create structured, complex tables on the canvas',
			'Dynamic content that stays in sync',
			'Bulk edits across rows and columns',
			'Keeps large tables maintainable over time',
		],
	},
	{
		id: 'icon-preview',
		seed: 'retro-7007-12', // demo label dither-a7b9
		archetype: 'bayer',
		title: 'Icon Preview',
		kind: 'plugin',
		summary: 'A Figma plugin that live-previews the icon you are editing at preset sizes for web, iOS and Android.',
		tagline: 'See the icon you are editing rendered live at every size that matters, web, iOS and Android.',
		tech: ['JavaScript', 'Figma API'],
		role: 'Creator',
		year: '2021',
		link: 'https://www.figma.com/community/plugin/888907972695800109/icon-preview',
		linkLabel: 'Figma Community',
		description: [
			'Icons that look crisp at 256px can fall apart at 16px, and checking every target size by hand means duplicating frames and squinting. Icon Preview removes that loop: it detects the icon you are editing and shows a live preview of it across the preset sizes used on web, iOS and Android.',
			'Edit, refresh, and see the result at every size at once — or switch icons from the picker without leaving the preview. It supports artwork up to 256px, so the same workflow covers everything from favicons to app icons.',
		],
		highlights: [
			'Live preview of the selected icon while you edit',
			'Preset sizes for web, iOS and Android in one view',
			'Detects the icon you are working on automatically',
			'Supports artwork up to 256px',
		],
	},
	{
		id: 'layer-styles',
		seed: 'dither-a1b9',
		archetype: 'bayer',
		title: 'Layer Styles',
		kind: 'plugin',
		summary: 'A Figma plugin for saving and applying style presets, strokes, fills, corner radius, effects, padding, grids, opacity and blend modes.',
		tagline: 'Save any combination of layer properties as a preset and reapply it across your design.',
		tech: ['JavaScript', 'Figma API'],
		role: 'Creator',
		year: '2020',
		link: 'https://www.figma.com/community/plugin/908303483495091267/layer-styles',
		linkLabel: 'Figma Community',
		description: [
			"Figma's native styles cover fills, strokes, effects and text, but they stop short of everything else that makes a component feel finished, corner radius, padding, layout grids, opacity and blend modes all have to be reset by hand every time. Layer Styles closes that gap: it saves any combination of those properties as a reusable preset you can apply to any layer.",
			'Build a style from an existing frame or shape, then apply it to multiple selections at once. Update a preset and refresh it to push the change across everything it touches, or detach a layer when it needs to go its own way, all from the Properties panel where you already work.',
		],
		highlights: [
			'Save presets spanning strokes, fills, corner radius, effects, padding, grids, opacity and blend modes',
			'Apply a saved style to multiple selected layers at once',
			'Refresh a preset to propagate updates across every layer using it',
			'Detach layers from a style, and work directly from the Properties panel',
		],
	},
];

/* The published set — everything not marked `draft`. This is what the home
   list and the numbered count should use. */
export const visibleProjects = projects.filter((p) => !p.draft);
