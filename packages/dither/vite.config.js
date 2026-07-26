import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/* Library build: the whole engine is framework-agnostic vanilla ESM, so
   there is nothing to externalise — it bundles to a single `dist/index.js`.
   Consumers import { field, generate, DitherTexture } and hand it a canvas. */
export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.js', import.meta.url)),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
});
