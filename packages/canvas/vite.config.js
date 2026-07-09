import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* Library build: bundles the JSX engine into ESM with React externalised, so
   downstream apps supply their own React (peerDependency). The stylesheet is
   plain CSS shipped as-is via the ./styles.css export — it is intentionally not
   imported by the JS entry, so consumers opt into styling explicitly. */
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.js', import.meta.url)),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
    },
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
});
