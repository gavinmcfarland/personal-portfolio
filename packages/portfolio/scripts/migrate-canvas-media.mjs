/* Migrate per-browser IndexedDB canvas recordings into committed assets.

   Input: canvas-media-export.json produced by scripts/export-canvas-media.js
   (run in the browser that holds the recordings). This script bakes each
   referenced blob into public/canvas-assets/<hash>.<ext> and rewrites the
   matching `idb:<db>/<key>` refs across src/data/canvas/*.json — so published
   boards point at real files instead of a browser-only IndexedDB.

   Usage (from packages/portfolio):
     node scripts/migrate-canvas-media.mjs ~/Downloads/canvas-media-export.json
*/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSET_DIR = path.join(ROOT, 'public/canvas-assets');
const CANVAS_DIR = path.join(ROOT, 'src/data/canvas');

/* Same base-MIME → extension table as vite-plugin-canvas-save.js. Audio
   webm/mp4/ogg get distinct extensions so they never collide with the video
   variants. */
const EXT = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/avif': 'avif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogv', 'video/quicktime': 'mov',
  'audio/webm': 'weba', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/ogg': 'oga', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/aac': 'aac',
  'text/html': 'html',
};

const extFor = (mime) => EXT[String(mime).split(';')[0].trim().toLowerCase()];

const exportPath = process.argv[2];
if (!exportPath) {
  console.error('Usage: node scripts/migrate-canvas-media.mjs <canvas-media-export.json>');
  process.exit(1);
}

const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
/* `db/key` -> { buffer, mime } */
const blobs = new Map();
for (const it of exported.items || []) {
  blobs.set(`${it.db}/${it.key}`, { buffer: Buffer.from(it.base64, 'base64'), mime: it.mime });
}
console.log(`Loaded ${blobs.size} blob(s) from ${path.basename(exportPath)}`);

const IDB_RE = /idb:([^"\\]+)/g;
fs.mkdirSync(ASSET_DIR, { recursive: true });

let rewrites = 0;
const missing = new Set();

for (const file of fs.readdirSync(CANVAS_DIR).filter((f) => f.endsWith('.json'))) {
  const full = path.join(CANVAS_DIR, file);
  const before = fs.readFileSync(full, 'utf8');
  const refs = new Set(before.match(IDB_RE) || []);
  if (!refs.size) continue;

  let after = before;
  for (const ref of refs) {
    const dbKey = ref.slice(4); // drop "idb:"
    const entry = blobs.get(dbKey);
    if (!entry) { missing.add(ref); continue; }
    const ext = extFor(entry.mime);
    if (!ext) { console.warn(`  ! unsupported mime "${entry.mime}" for ${ref} — skipped`); continue; }

    const hash = crypto.createHash('sha1').update(entry.buffer).digest('hex').slice(0, 16);
    const name = `${hash}.${ext}`;
    const dest = path.join(ASSET_DIR, name);
    if (!fs.existsSync(dest)) fs.writeFileSync(dest, entry.buffer);

    const url = `/canvas-assets/${name}`;
    after = after.split(ref).join(url);
    rewrites++;
    console.log(`  ${file}: ${ref} → ${url}  (${entry.buffer.length} bytes)`);
  }

  if (after !== before) fs.writeFileSync(full, after);
}

console.log(`\nDone — ${rewrites} ref(s) rewritten.`);
if (missing.size) {
  console.warn('\nNo exported blob for these refs (re-run the export in the right browser, or re-record):');
  for (const m of missing) console.warn(`  ${m}`);
}
