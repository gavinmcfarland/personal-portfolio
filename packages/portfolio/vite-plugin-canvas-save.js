/* Dev-only endpoint that bakes the live canvas into a committed data file.
   The "Publish" button POSTs the current board here; we write it to
   src/data/canvasState.json, which the app loads as its base state in both
   dev and production. Only registered by `vite serve` — never in the build. */
import fs from 'node:fs';
import path from 'node:path';

const TARGET = path.resolve(process.cwd(), 'src/data/canvasState.json');

export function canvasSave() {
  return {
    name: 'canvas-save',
    apply: 'serve',
    /* Don't let publishing the snapshot trigger an HMR reload — the live board
       already reflects these edits, so a reload only jars the view. The file
       matters on the next fresh load and in the production build. */
    config() {
      return { server: { watch: { ignored: ['**/src/data/canvasState.json'] } } };
    },
    configureServer(server) {
      server.middlewares.use('/__canvas/save', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          res.setHeader('content-type', 'application/json');
          try {
            const data = JSON.parse(body);
            if (!data || !Array.isArray(data.nodes)) throw new Error('expected { nodes: [...] }');
            fs.writeFileSync(TARGET, JSON.stringify(data, null, 2) + '\n');
            server.config.logger.info(`  canvas published → ${path.relative(process.cwd(), TARGET)}`);
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
          }
        });
      });
    },
  };
}
