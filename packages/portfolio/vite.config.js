import { awenate } from "@awenate/react";

import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Consume the canvas package as source so its JSX is transformed by
// @vitejs/plugin-react (a symlinked node_modules dep would be skipped). Exact
// regexes so the bare specifier and the ./styles.css subpath resolve cleanly.
const canvasSrc = fileURLToPath(new URL("../canvas/src/index.js", import.meta.url));
const canvasCss = fileURLToPath(new URL("../canvas/src/canvas.css", import.meta.url));

// https://vite.dev/config/
export default defineConfig({
	resolve: {
		alias: [
			{ find: /^@gavinmcfarland\/canvas$/, replacement: canvasSrc },
			{ find: /^@gavinmcfarland\/canvas\/styles\.css$/, replacement: canvasCss },
		],
	},
	plugins: [
    awenate(),
		tailwindcss(), react()],
});
