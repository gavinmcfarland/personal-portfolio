import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tether } from "../../../visual-code-editor/packages/vite-plugin-tether/vite-plugin-tether";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), tether({ react: "19" }), react()],
});
