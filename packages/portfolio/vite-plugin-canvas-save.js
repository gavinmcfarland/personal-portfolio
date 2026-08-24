/* Dev-only endpoints that bake a live canvas into a committed data file.
   The "Save" button POSTs { key, snapshot } here; we write it to
   src/data/canvas/<key>.json, which the app loads as that board's published
   state in both dev and production. Only registered by `vite serve` — never
   in the build. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { auditHtml } from '../canvas/src/html-bridge.js';

const BOARD_DIR = path.resolve(process.cwd(), 'src/data/canvas');
const ASSET_DIR = path.resolve(process.cwd(), 'public/canvas-assets');
const PRIVATE_DIR = path.resolve(process.cwd(), 'public/private');

/* Where pruned assets go instead of being deleted outright. A prune is a guess
   made from the files on disk, and the boards on disk are only ever a snapshot
   of what the live editor holds: a cut waiting to be pasted, an undo waiting to
   be pressed, a second tab, a private board whose refs are encrypted and
   invisible here. Any of those brings a reference back a moment later — and the
   bytes have to still exist when it does (see restoreAssets). Outside public/
   so a trashed file is neither served nor copied into the build. */
const TRASH_DIR = path.resolve(process.cwd(), '.canvas-trash');
/* How long a trashed asset is kept before it's really gone. */
const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/* Private-page slugs name a file under PRIVATE_DIR — same filename-safe alphabet
   as board keys so a slug can never escape the directory. */
const SLUG_RE = /^[a-zA-Z0-9_-]+$/;

/* Board keys mirror the <Canvas storageKey> they came from — keep them to a
   filename-safe alphabet so the key can never escape BOARD_DIR. */
const KEY_RE = /^[a-zA-Z0-9_-]+$/;

/* data:image/png;base64,… → { ext, buffer }. Returns null if not a data URL.
   Audio recorded via MediaRecorder carries codec params (audio/webm;codecs=opus),
   so we match the base MIME type and ignore any trailing parameters. Audio webm/mp4/ogg
   get their own extensions (weba/m4a/oga) so they never collide with the video variants. */
const EXT = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/avif': 'avif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogv', 'video/quicktime': 'mov',
  'audio/webm': 'weba', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/ogg': 'oga', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/aac': 'aac',
  'text/html': 'html',
};
function decodeDataUrl(dataUrl) {
  const m = /^data:([\w.+-]+\/[\w.+-]+)(?:;[^,]*?)?;base64,(.+)$/s.exec(dataUrl || '');
  if (!m) return null;
  const ext = EXT[m[1]];
  if (!ext) return null;
  return { ext, buffer: Buffer.from(m[2], 'base64') };
}

/* Only our content-hash-named files are eligible for pruning — anything else in
   the folder (manually added images) is left untouched. */
const ASSET_RE = /^[0-9a-f]{16}\.(?:png|jpg|gif|webp|svg|avif|mp4|webm|ogv|mov|weba|m4a|mp3|oga|wav|aac|html)$/;

/* Content types for assets we serve directly (see the /canvas-assets handler). */
const MIME = {
  png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif',
  mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime',
  weba: 'audio/webm', m4a: 'audio/mp4', mp3: 'audio/mpeg', oga: 'audio/ogg', wav: 'audio/wav', aac: 'audio/aac',
  html: 'text/html',
};

/* Every node across a snapshot, whether it's the legacy single-board shape
   ({nodes}) or the multi-page shape ({pages:[{nodes}]}). */
function allNodes(data) {
  if (Array.isArray(data.pages)) return data.pages.flatMap((p) => (Array.isArray(p.nodes) ? p.nodes : []));
  return Array.isArray(data.nodes) ? data.nodes : [];
}

/* Asset filenames a snapshot's media nodes reference. */
function assetRefs(data) {
  const refs = new Set();
  const add = (src) => {
    if (typeof src === 'string' && src.startsWith('/canvas-assets/')) refs.add(src.slice('/canvas-assets/'.length));
  };
  for (const n of allNodes(data)) {
    if (n && (n.type === 'image' || n.type === 'video')) {
      add(n.src); // legacy single-src nodes
      // Current nodes hold an assets array; each asset may also carry a
      // dark-mode variant (srcDark) — both are live references.
      for (const a of Array.isArray(n.assets) ? n.assets : []) {
        if (a) { add(a.src); add(a.srcDark); }
      }
    }
    // HTML nodes reference their document as a committed asset.
    if (n && n.type === 'html') add(n.src);
    // Link cards bake their unfurled OG image in as a committed asset.
    if (n && n.type === 'link' && typeof n.image === 'string' && n.image.startsWith('/canvas-assets/')) {
      refs.add(n.image.slice('/canvas-assets/'.length));
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

/* Bring back the bytes for anything this snapshot references that isn't on
   disk but is still in the trash. This is the half that makes pruning safe:
   the moment a node comes back — pasted onto another page, restored by undo,
   saved from a second tab that still had it — its asset is un-trashed before
   anything tries to load it. Runs on every save, before the prune, so a save
   that both resurrects one asset and orphans another does the right thing with
   each. Returns the names it restored. */
function restoreAssets(refs) {
  if (!refs.size || !fs.existsSync(TRASH_DIR)) return [];
  const restored = [];
  for (const name of refs) {
    if (!ASSET_RE.test(name)) continue;
    const live = path.join(ASSET_DIR, name);
    const trashed = path.join(TRASH_DIR, name);
    if (fs.existsSync(live) || !fs.existsSync(trashed)) continue;
    fs.mkdirSync(ASSET_DIR, { recursive: true });
    fs.renameSync(trashed, live);
    restored.push(name);
  }
  return restored;
}

/* Drop trashed assets nothing has asked for in TRASH_TTL_MS. By then the board
   that referenced them has been saved (and committed) many times over. */
function sweepTrash() {
  if (!fs.existsSync(TRASH_DIR)) return;
  const cutoff = Date.now() - TRASH_TTL_MS;
  for (const name of fs.readdirSync(TRASH_DIR)) {
    const file = path.join(TRASH_DIR, name);
    try { if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file); }
    catch { /* raced with another sweep — fine */ }
  }
}

/* Retire generated assets orphaned by this save. Only files the PREVIOUS
   committed version of the saved board referenced are candidates — a sweep of
   everything unreferenced would also delete media just dropped onto a
   different board, which lives only in that board's localStorage autosave
   until its own Save. A candidate survives if any committed board (including
   the one just written) still references it.

   Retired, not deleted: the file moves to TRASH_DIR, because the boards on
   disk don't know what the live editor is still holding. Cutting a node to
   paste it onto another page publishes a snapshot without it — for the second
   or two before the paste lands — and a delete followed by undo does the same.
   Unlinking there took the bytes with it: the node came back pointing at a URL
   the dev server answers with the SPA's index.html, so the image renders
   broken and the iframe loads the portfolio inside itself. (Neither shows up
   until something re-fetches the URL — already-decoded images and loaded
   iframes keep painting — so the damage surfaces later, on a paste or a
   reload, far from the save that caused it.) restoreAssets puts them back. */
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
      fs.mkdirSync(TRASH_DIR, { recursive: true });
      fs.renameSync(path.join(ASSET_DIR, name), path.join(TRASH_DIR, name));
      removed.push(name);
    }
  }
  sweepTrash();
  return removed;
}

/* Assets a just-saved board points at that aren't on disk (and weren't in the
   trash either). Nothing can fix these automatically — the file is gone — so
   they're reported rather than swallowed: the node renders broken, and this is
   the only place that can say which one and why. */
function danglingRefs(refs) {
  const missing = [];
  for (const name of refs) {
    if (!fs.existsSync(path.join(ASSET_DIR, name))) missing.push(name);
  }
  return missing;
}

/* ── Link unfurling (dev only) ──────────────────────────────────────────
   Fetch a pasted URL server-side (no browser CORS), parse its Open Graph
   metadata, and download the OG image into public/canvas-assets so the link
   card's picture is a committed file — the saved board then renders offline
   and never re-fetches. */
const UNFURL_UA =
  'Mozilla/5.0 (compatible; PortfolioCanvasBot/1.0; +https://limitlessloop.com)';

function decodeEntities(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => { try { return String.fromCodePoint(+d); } catch { return ''; } })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return ''; } })
    .trim();
}

/* First <meta property|name="<key>"> content for any of `keys`, in order. */
function metaContent(html, keys) {
  for (const key of keys) {
    const re = new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${key}["'][^>]*>`, 'i');
    const tag = re.exec(html);
    if (tag) {
      const c = /content\s*=\s*["']([^"']*)["']/i.exec(tag[0]);
      if (c && c[1].trim()) return decodeEntities(c[1]);
    }
  }
  return '';
}

function pageTitle(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? decodeEntities(m[1]) : '';
}

function faviconUrl(html, baseUrl) {
  const re = /<link[^>]+>/gi;
  let m, href = '';
  while ((m = re.exec(html))) {
    if (!/rel\s*=\s*["'][^"']*icon[^"']*["']/i.test(m[0])) continue;
    const h = /href\s*=\s*["']([^"']+)["']/i.exec(m[0]);
    // Sites suppress the default favicon with `href="data:,"`; ignore those and
    // fall back to /favicon.ico rather than rendering an empty image.
    if (h && h[1] && !/^data:/i.test(h[1].trim())) { href = h[1]; break; }
  }
  try { return new URL(href || '/favicon.ico', baseUrl).href; } catch { return ''; }
}

/* Download a remote image into the committed asset dir, return its public URL
   (null on any failure — the caller falls back to hotlinking the remote URL). */
async function downloadImageAsset(imageUrl) {
  try {
    const res = await fetch(imageUrl, { redirect: 'follow', headers: { 'user-agent': UNFURL_UA }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const ext = EXT[ct];
    if (!ext || !ct.startsWith('image/')) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length || buffer.length > 8 * 1024 * 1024) return null;
    const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 16);
    const name = `${hash}.${ext}`;
    const file = path.join(ASSET_DIR, name);
    if (!fs.existsSync(file)) {
      fs.mkdirSync(ASSET_DIR, { recursive: true });
      fs.writeFileSync(file, buffer);
    }
    return `/canvas-assets/${name}`;
  } catch {
    return null;
  }
}

async function unfurl(rawUrl) {
  let target;
  try { target = new URL(rawUrl); } catch { throw new Error('invalid URL'); }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') throw new Error('unsupported protocol');
  const res = await fetch(target.href, {
    redirect: 'follow',
    headers: { 'user-agent': UNFURL_UA, accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(10000),
  });
  const finalUrl = res.url || target.href;
  const html = (await res.text()).slice(0, 500000); // meta tags live in <head>
  const title = metaContent(html, ['og:title', 'twitter:title']) || pageTitle(html) || target.hostname;
  const description = metaContent(html, ['og:description', 'twitter:description', 'description']);
  const siteName = metaContent(html, ['og:site_name']);
  let image = metaContent(html, ['og:image:secure_url', 'og:image:url', 'og:image', 'twitter:image', 'twitter:image:src']);
  if (image) { try { image = new URL(image, finalUrl).href; } catch { image = ''; } }
  const localImage = image ? await downloadImageAsset(image) : null;
  return {
    url: finalUrl,
    title,
    description,
    siteName,
    image: localImage || image || '',
    favicon: faviconUrl(html, finalUrl),
  };
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
      /* Also ignore public/private so re-saving an encrypted private board
         doesn't trigger an HMR reload (which would re-lock the page mid-edit).
         Like canvas-assets, we serve these files from disk in a middleware
         below, since Vite won't serve a watch-ignored path. */
      return { server: { watch: { ignored: ['**/src/data/canvas/**', '**/public/private/**'] } } };
    },
    configureServer(server) {
      /* Serve committed assets straight from disk. Vite's public-dir serving
         only picks up files its file-watcher already knows about, so an asset
         requested in the same tick it was just written (a freshly dropped
         image/svg/video) races the watcher and falls through to the SPA HTML
         fallback — the <img>/<video> then loads that HTML, shows broken, and
         the browser caches the failure until a reload recreates the element.
         Reading from disk here removes the race; on a miss we fall through to
         Vite's normal serving (which also handles Range requests once warm). */
      server.middlewares.use('/canvas-assets', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        let name;
        try { name = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\/+/, ''); }
        catch { return next(); }
        if (!ASSET_RE.test(name)) return next();
        const file = path.join(ASSET_DIR, name);
        let stat;
        try { stat = fs.statSync(file); }
        catch {
          /* A miss can mean the file was retired by a prune while the live
             board still had the node — pasted onto another page, restored by
             undo. The request itself is the proof it's still wanted, and it
             arrives before the save that would restore it: put the file back
             now, so the <img>/<iframe> gets the bytes on its FIRST try. A
             browser caches a failed image load until the element is recreated,
             so healing this a second late is not healing it at all. */
          try {
            const trashed = path.join(TRASH_DIR, name);
            stat = fs.statSync(trashed);
            fs.mkdirSync(ASSET_DIR, { recursive: true });
            fs.renameSync(trashed, file);
            stat = fs.statSync(file);
          } catch { return next(); }
        }
        const ext = name.slice(name.lastIndexOf('.') + 1);
        res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Accept-Ranges', 'bytes');
        /* Honour a single Range so <video> seeking works before Vite is warm. */
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
        if (range) {
          const start = range[1] ? parseInt(range[1], 10) : 0;
          const end = range[2] ? parseInt(range[2], 10) : stat.size - 1;
          if (start > end || end >= stat.size) {
            res.statusCode = 416;
            res.setHeader('Content-Range', `bytes */${stat.size}`);
            return res.end();
          }
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
          res.setHeader('Content-Length', end - start + 1);
          if (req.method === 'HEAD') return res.end();
          return fs.createReadStream(file, { start, end }).pipe(res);
        }
        res.statusCode = 200;
        res.setHeader('Content-Length', stat.size);
        if (req.method === 'HEAD') return res.end();
        return fs.createReadStream(file).pipe(res);
      });

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
              /* This is the moment a dropped document becomes committed content,
                 so it is the moment to say what it won't do. The board audits on
                 drop too, but only into the browser console — which nobody has
                 open while dragging a file in, which is how a health-app export
                 that reads the theme once and never listens again shipped twice.
                 Same audit, in the terminal you are already watching. Advisory:
                 the file is written either way (see auditHtml in
                 packages/canvas/src/html-bridge.js). */
              if (decoded.ext === 'html') {
                const log = server.config.logger;
                for (const { level, message } of auditHtml(decoded.buffer.toString('utf8'))) {
                  const line = `  canvas html ${name} ${message}`;
                  if (level === 'warn') log.warn(line); else log.info(line);
                }
              }
            }
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, url: `/canvas-assets/${name}` }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
          }
        });
      });

      /* Unfurl a pasted URL: fetch its page, parse OG metadata, bake the image
         into a committed asset, and return the card's data. */
      server.middlewares.use('/__canvas/unfurl', (req, res, next) => {
        if (req.method !== 'POST') return next();
        res.setHeader('content-type', 'application/json');
        readBody(req).then(async (body) => {
          try {
            const { url } = JSON.parse(body);
            const data = await unfurl(url);
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, data }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
          }
        });
      });

      /* Serve encrypted private-page records straight from disk, for the same
         watcher-race reason as /canvas-assets: the file is written and fetched
         in quick succession, and the dir is watch-ignored so Vite won't serve
         it. Only `.json` under a safe slug is handled; the extensionless route
         (/private/<slug>) falls through to the SPA. */
      server.middlewares.use('/private', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        let name;
        try { name = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\/+/, ''); }
        catch { return next(); }
        const m = /^([a-zA-Z0-9_-]+)\.json$/.exec(name);
        if (!m) return next();
        const file = path.join(PRIVATE_DIR, `${m[1]}.json`);
        let data;
        try { data = fs.readFileSync(file); } catch { return next(); }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        if (req.method === 'HEAD') return res.end();
        return res.end(data);
      });

      /* Persist an already-encrypted private board back to its static file. The
         client encrypts with the owner's in-memory password (see PrivatePage),
         so only ciphertext reaches here — no password is ever written. */
      server.middlewares.use('/__private/save', (req, res, next) => {
        if (req.method !== 'POST') return next();
        readBody(req).then((body) => {
          res.setHeader('content-type', 'application/json');
          try {
            const { slug, record } = JSON.parse(body);
            if (!SLUG_RE.test(slug || '')) throw new Error('missing or unsafe slug');
            if (!record || typeof record.salt !== 'string' || typeof record.iv !== 'string' || typeof record.ct !== 'string') {
              throw new Error('expected an encrypted record with { salt, iv, ct }');
            }
            fs.mkdirSync(PRIVATE_DIR, { recursive: true });
            const target = path.join(PRIVATE_DIR, `${slug}.json`);
            fs.writeFileSync(target, JSON.stringify(record) + '\n');
            server.config.logger.info(`  private board saved → ${path.relative(process.cwd(), target)}`);
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true }));
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
            /* Restore before pruning: this snapshot's own references decide
               what comes back, and they also protect it from the prune. */
            const refs = assetRefs(snapshot);
            const restored = restoreAssets(refs);
            if (restored.length) server.config.logger.info(`  restored ${restored.length} asset(s) from .canvas-trash`);
            const removed = pruneAssets(prev ? assetRefs(prev) : new Set());
            if (removed.length) server.config.logger.info(`  retired ${removed.length} orphaned asset(s) → .canvas-trash`);
            const dangling = danglingRefs(refs);
            if (dangling.length) {
              server.config.logger.warn(`  ⚠ ${key}: ${dangling.length} missing asset(s) — these nodes will render broken:`);
              for (const name of dangling) server.config.logger.warn(`      /canvas-assets/${name}`);
            }
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
