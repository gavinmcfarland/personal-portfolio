import { awenate } from "@awenate/react";

import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { canvasSave } from "./vite-plugin-canvas-save.js";
import { canvasNotes } from "./vite-plugin-canvas-notes.js";
import { present } from "./vite-plugin-present.js";
import { clipWarmup } from "./vite-plugin-clip-warmup.js";
import { writingIndex } from "./vite-plugin-writing-index.js";

// The masthead clip, named here so its fetch can start with the CSS instead
// of after the bundle. Keep in step with the import in Intro.jsx.
const MASTHEAD_CLIP = "src/assets/avatar.mp4";
const MASTHEAD_CLIP_GLOBAL = "__mastheadClip";

// Consume the canvas package as source so its JSX is transformed by
// @vitejs/plugin-react (a symlinked node_modules dep would be skipped). Exact
// regexes so the bare specifier and the ./styles.css subpath resolve cleanly.
const canvasSrc = fileURLToPath(new URL("../canvas/src/index.js", import.meta.url));
const canvasCss = fileURLToPath(new URL("../canvas/src/styles.css", import.meta.url));

// Awenate is an editing tool, and it belongs to the editor. It injects its
// bridge into index.html unconditionally — 1.1MB of inline script, ahead of
// everything, on a page whose whole JS bundle is smaller than that — tags the
// DOM with source-location attributes, and rewrites `vh` in CSS to a variable
// the editor's iframe sets, which is exactly wrong in a real browser window.
// None of that is wanted by a visitor, and nothing under src/ imports it, so
// it loads for `vite dev` and is absent from the build.
const editorOnly = (command) => (command === "serve" ? [awenate()] : []);

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
	resolve: {
		alias: [
			{ find: /^@gavinmcfarland\/canvas$/, replacement: canvasSrc },
			{ find: /^@gavinmcfarland\/canvas\/styles\.css$/, replacement: canvasCss },
		],
	},
	plugins: [
		...editorOnly(command),
		tailwindcss(),
		react(),
		canvasSave(),
		canvasNotes(),
		present(),
		clipWarmup({ file: MASTHEAD_CLIP, globalName: MASTHEAD_CLIP_GLOBAL }),
		writingIndex(),
	],
	// Listen on every interface so the phone remote can reach the dev server
	// over the LAN. Vite prints the Network URL on boot, and /__present/link
	// hands the same address to the presenter for its QR code.
	//
	// Off 5173, because every other Vite project claims that port too. Binding a
	// wildcard host does not collide with another server's specific `[::1]` bind,
	// so both start, `localhost` resolves to `::1`, and the other project answers
	// with no warning from either side. strictPort turns the next such clash into
	// a boot failure instead of a page from someone else's app.
	server: { host: true, port: 5180, strictPort: true },
}));
