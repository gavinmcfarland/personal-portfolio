import { awenate } from "@awenate/react";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { canvasSave } from "./vite-plugin-canvas-save.js";


// https://vite.dev/config/
export default defineConfig({
	plugins: [
    awenate(),
		canvasSave(),
		tailwindcss(), react()],
});
