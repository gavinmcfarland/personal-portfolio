/* Dev-only endpoint that bakes the live canvas into a committed data file.
   The "Publish" button POSTs the current board here; we write it to
   src/data/canvasState.json, which the app loads as its base state in both
   dev and production. Only registered by `vite serve` — never in the build. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TARGET = path.resolve(process.cwd(), 'src/data/canvasState.json');
const ASSET_DIR = path.resolve(process.cwd(), 'public/canvas-assets');

/* data:image/png;base64,… → { ext, buffer }. Returns null if not a data URL. */
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/avif': 'avif' };
function decodeDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!m) return null;
  const ext = EXT[m[1]];
  if (!ext) return null;
  return { ext, buffer: Buffer.from(m[2], 'base64') };
}

/* Only our content-hash-named files are eligible for pruning — anything else in
   the folder (manually added images) is left untouched. */
const ASSET_RE = /^[0-9a-f]{16}\.(?:png|jpg|gif|webp|svg|avif)$/;

/* Every image node across the snapshot, whether it's the legacy single-board
   shape ({nodes}) or the multi-page shape ({pages:[{nodes}]}). */
function allNodes(data) {
  if (Array.isArray(data.pages)) return data.pages.flatMap((p) => (Array.isArray(p.nodes) ? p.nodes : []));
  return Array.isArray(data.nodes) ? data.nodes : [];
}

/* Delete generated assets no image node in the published snapshot references. */
function pruneAssets(data) {
  if (!fs.existsSync(ASSET_DIR)) return [];
  const referenced = new Set(
    allNodes(data)
      .filter((n) => n && n.type === 'image' && typeof n.src === 'string' && n.src.startsWith('/canvas-assets/'))
      .map((n) => n.src.slice('/canvas-assets/'.length))
  );
  const removed = [];
  for (const name of fs.readdirSync(ASSET_DIR)) {
    if (ASSET_RE.test(name) && !referenced.has(name)) {
      fs.unlinkSync(path.join(ASSET_DIR, name));
      removed.push(name);
    }
  }
  return removed;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export function canvasSave() {
  return {
    name: 'canvas-save',
    apply: 'serve',
    /* Don't let publishing the snapshot trigger an HMR reload — the live board
       already reflects these edits, so a reload only jars the view. The file
       matters on the next fresh load and in the production build.
       (Dropped images under public/canvas-assets are intentionally NOT ignored:
       Vite won't serve files whose path is in the watch-ignore list.) */
    config() {
      return { server: { watch: { ignored: ['**/src/data/canvasState.json'] } } };
    },
    configureServer(server) {
      /* Persist a dropped image as a committed static asset, keyed by content
         hash (identical drops dedupe to one file). Returns its public URL. */
      server.middlewares.use('/__canvas/asset', (req, res, next) => {
        if (req.method !== 'POST') return next();
        res.setHeader('content-type', 'application/json');
        readBody(req).then((body) => {
          try {
            const { dataUrl } = JSON.parse(body);
            const decoded = decodeDataUrl(dataUrl);
            if (!decoded) throw new Error('unsupported or missing image data URL');
            const hash = crypto.createHash('sha1').update(decoded.buffer).digest('hex').slice(0, 16);
            const name = `${hash}.${decoded.ext}`;
            const file = path.join(ASSET_DIR, name);
            if (!fs.existsSync(file)) {
              fs.mkdirSync(ASSET_DIR, { recursive: true });
              fs.writeFileSync(file, decoded.buffer);
              server.config.logger.info(`  canvas image → public/canvas-assets/${name}`);
            }
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, url: `/canvas-assets/${name}` }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
          }
        });
      });

      server.middlewares.use('/__canvas/save', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          res.setHeader('content-type', 'application/json');
          try {
            const data = JSON.parse(body);
            if (!data || !(Array.isArray(data.pages) || Array.isArray(data.nodes))) {
              throw new Error('expected { pages: [...] } or { nodes: [...] }');
            }
            fs.writeFileSync(TARGET, JSON.stringify(data, null, 2) + '\n');
            server.config.logger.info(`  canvas published → ${path.relative(process.cwd(), TARGET)}`);
            const removed = pruneAssets(data);
            if (removed.length) server.config.logger.info(`  pruned ${removed.length} orphaned asset(s)`);
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, pruned: removed.length }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
          }
        });
      });
    },
  };
}
