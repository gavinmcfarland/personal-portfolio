/* Dev-only endpoints that bake a live canvas into a committed data file.
   The "Save" button POSTs { key, snapshot } here; we write it to
   src/data/canvas/<key>.json, which the app loads as that board's published
   state in both dev and production. Only registered by `vite serve` — never
   in the build. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const BOARD_DIR = path.resolve(process.cwd(), 'src/data/canvas');
const ASSET_DIR = path.resolve(process.cwd(), 'public/canvas-assets');

/* Board keys mirror the <Canvas storageKey> they came from — keep them to a
   filename-safe alphabet so the key can never escape BOARD_DIR. */
const KEY_RE = /^[a-zA-Z0-9_-]+$/;

/* data:image/png;base64,… → { ext, buffer }. Returns null if not a data URL. */
const EXT = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/avif': 'avif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogv', 'video/quicktime': 'mov',
};
function decodeDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!m) return null;
  const ext = EXT[m[1]];
  if (!ext) return null;
  return { ext, buffer: Buffer.from(m[2], 'base64') };
}

/* Only our content-hash-named files are eligible for pruning — anything else in
   the folder (manually added images) is left untouched. */
const ASSET_RE = /^[0-9a-f]{16}\.(?:png|jpg|gif|webp|svg|avif|mp4|webm|ogv|mov)$/;

/* Every node across a snapshot, whether it's the legacy single-board shape
   ({nodes}) or the multi-page shape ({pages:[{nodes}]}). */
function allNodes(data) {
  if (Array.isArray(data.pages)) return data.pages.flatMap((p) => (Array.isArray(p.nodes) ? p.nodes : []));
  return Array.isArray(data.nodes) ? data.nodes : [];
}

/* Asset filenames a snapshot's media nodes reference. */
function assetRefs(data) {
  const refs = new Set();
  for (const n of allNodes(data)) {
    if (n && (n.type === 'image' || n.type === 'video') && typeof n.src === 'string' && n.src.startsWith('/canvas-assets/')) {
      refs.add(n.src.slice('/canvas-assets/'.length));
    }
  }
  return refs;
}

function readBoard(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/* Delete generated assets orphaned by this save. Only files the PREVIOUS
   committed version of the saved board referenced are candidates — a sweep of
   everything unreferenced would also delete media just dropped onto a
   different board, which lives only in that board's localStorage autosave
   until its own Save. A candidate survives if any committed board (including
   the one just written) still references it. */
function pruneAssets(prevRefs) {
  if (!prevRefs.size || !fs.existsSync(ASSET_DIR)) return [];
  const referenced = new Set();
  if (fs.existsSync(BOARD_DIR)) {
    for (const file of fs.readdirSync(BOARD_DIR)) {
      if (!file.endsWith('.json')) continue;
      const data = readBoard(path.join(BOARD_DIR, file));
      if (data) assetRefs(data).forEach((name) => referenced.add(name));
    }
  }
  const removed = [];
  for (const name of prevRefs) {
    if (ASSET_RE.test(name) && !referenced.has(name) && fs.existsSync(path.join(ASSET_DIR, name))) {
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
    /* Don't let saving a snapshot trigger an HMR reload — the live board
       already reflects these edits, so a reload only jars the view. The files
       matter on the next fresh load and in the production build.
       (Dropped images under public/canvas-assets are intentionally NOT ignored:
       Vite won't serve files whose path is in the watch-ignore list.) */
    config() {
      return { server: { watch: { ignored: ['**/src/data/canvas/**'] } } };
    },
    configureServer(server) {
      /* Persist dropped media as a committed static asset, keyed by content
         hash (identical drops dedupe to one file). Returns its public URL. */
      server.middlewares.use('/__canvas/asset', (req, res, next) => {
        if (req.method !== 'POST') return next();
        res.setHeader('content-type', 'application/json');
        readBody(req).then((body) => {
          try {
            const { dataUrl } = JSON.parse(body);
            const decoded = decodeDataUrl(dataUrl);
            if (!decoded) throw new Error('unsupported or missing media data URL');
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
        readBody(req).then((body) => {
          res.setHeader('content-type', 'application/json');
          try {
            const { key, snapshot } = JSON.parse(body);
            if (!KEY_RE.test(key || '')) throw new Error('missing or unsafe board key');
            if (!snapshot || !(Array.isArray(snapshot.pages) || Array.isArray(snapshot.nodes))) {
              throw new Error('expected snapshot with { pages: [...] } or { nodes: [...] }');
            }
            fs.mkdirSync(BOARD_DIR, { recursive: true });
            const target = path.join(BOARD_DIR, `${key}.json`);
            const prev = fs.existsSync(target) ? readBoard(target) : null;
            fs.writeFileSync(target, JSON.stringify(snapshot, null, 2) + '\n');
            server.config.logger.info(`  canvas saved → ${path.relative(process.cwd(), target)}`);
            const removed = pruneAssets(prev ? assetRefs(prev) : new Set());
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
