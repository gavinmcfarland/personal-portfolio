import { awenate } from "@awenate/react";

import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { canvasSave } from "./vite-plugin-canvas-save.js";

// Consume the canvas package as source during dev/build so its JSX is transformed
// by @vitejs/plugin-react (a symlinked node_modules dep would be skipped as
// node_modules). Swap this for the built package when publishing. Exact-match
// regexes so the bare specifier and the ./styles.css subpath resolve cleanly
// (a plain string alias would prefix-match and corrupt the subpath).
const canvasSrc = fileURLToPath(new URL("../canvas/src/index.js", import.meta.url));
const canvasCss = fileURLToPath(new URL("../canvas/src/canvas.css", import.meta.url));

// https://vite.dev/config/
export default defineConfig({
	resolve: {
		alias: process.env.CANVAS_FROM_DIST
			? []
			: [
				{ find: /^@gavinmcfarland\/canvas$/, replacement: canvasSrc },
				{ find: /^@gavinmcfarland\/canvas\/styles\.css$/, replacement: canvasCss },
			],
	},
	plugins: [
    awenate(),
		canvasSave(),
		tailwindcss(), react()],
});
