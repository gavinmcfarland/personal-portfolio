/* Upgrade the canvas bridge in already-committed HTML assets.

   The canvas injects a three-part bridge into every HTML document at ingest — a
   theme-sync half, a zoom paint-mode half and an input half (see
   packages/canvas/src/html-bridge.js). Re-ingesting an asset to pick up a newer
   bridge isn't an
   option: these files are the published boards' content, and a re-drop would
   mint a new content hash and orphan every node that points at the old one.

   So this rewrites them in place, using the very same BRIDGE definition the
   runtime injector uses — imported, not copied. The previous version of this
   script carried its own duplicate of the script text and its own VERSION
   constant, and the two drifted: it shipped v4 of the zoom half while the
   runtime's version table still said v3.

   Idempotent — a document already carrying the current version of both halves
   is left alone — so it is safe to re-run after any asset import.

   Usage (from packages/portfolio):
     node scripts/inject-canvas-bridge.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRIDGE, injectBridge } from '../../canvas/src/html-bridge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = path.join(path.resolve(__dirname, '..'), 'public/canvas-assets');

const current = (html) => BRIDGE.every(({ marker, version }) => html.includes(`${marker}="${version}"`));

if (!fs.existsSync(ASSET_DIR)) {
  console.error(`no asset directory at ${ASSET_DIR}`);
  process.exit(1);
}

let done = 0, skipped = 0;
for (const name of fs.readdirSync(ASSET_DIR).filter((f) => f.endsWith('.html')).sort()) {
  const file = path.join(ASSET_DIR, name);
  const html = fs.readFileSync(file, 'utf8');
  if (current(html)) { skipped += 1; continue; }
  /* Report which halves moved, so a run that touches 30 files still says what
     it did to each — the halves version independently. */
  const moved = BRIDGE
    .filter(({ marker, version }) => !html.includes(`${marker}="${version}"`))
    .map(({ marker }) => `${marker.replace('data-cv-', '')}${new RegExp(`${marker}="(\\d+)"`).exec(html) ? ' upgraded' : ' injected'}`);
  fs.writeFileSync(file, injectBridge(html));
  console.log(`${name}: ${moved.join(', ')}`);
  done += 1;
}
console.log(`\n${done} written, ${skipped} already current`);
