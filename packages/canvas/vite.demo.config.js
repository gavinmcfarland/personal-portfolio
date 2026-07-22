import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* Dev server for the styling demos under ./demo. Consumes the canvas from source
   (../src) so a demo always reflects the current package. Run: `npm run demo`. */
export default defineConfig({
  root: fileURLToPath(new URL('./demo', import.meta.url)),
  plugins: [react()],
  server: { port: 5178 },
});
