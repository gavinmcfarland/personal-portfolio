import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tetherReact } from "../../../visual-code-editor/packages/vite-plugin-tether/react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), tetherReact(), react()],
});
