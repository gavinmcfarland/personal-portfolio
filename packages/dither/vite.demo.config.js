import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/* Dev server for the gallery under ./demo. It consumes the engine from
   source (../src) so the demo always reflects the current package. Run it
   with `npm run demo`. */
export default defineConfig({
  root: fileURLToPath(new URL('./demo', import.meta.url)),
  server: { port: 5179 },
});
