import { awenate } from "@awenate/react";

import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { canvasSave } from "./vite-plugin-canvas-save.js";

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
	plugins: [...editorOnly(command), tailwindcss(), react(), canvasSave()],
}));
