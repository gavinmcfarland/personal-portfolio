/* Check the committed HTML assets for embedding faults the board can't fix.

   The canvas audits every document dropped on it (see `auditHtml` in
   packages/canvas/src/html-bridge.js) and warns in the console. That only
   reaches documents that arrive by drop — the assets under public/canvas-assets
   are the published boards' content, committed as files, and the health app
   shipped with a theme bug that no drop ever announced.

   So this runs the same audit — imported, not copied — over the committed set.
   Exits non-zero on a 'warn': a document that means to theme and gets it wrong.
   Notes ('this one doesn't theme at all') are printed and don't fail, since a
   deliberately single-appearance document is a legitimate thing to publish.

   Usage (from packages/portfolio):
     node scripts/audit-canvas-html.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditHtml } from '../../canvas/src/html-bridge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = path.join(path.resolve(__dirname, '..'), 'public/canvas-assets');

if (!fs.existsSync(ASSET_DIR)) {
  console.error(`no asset directory at ${ASSET_DIR}`);
  process.exit(1);
}

let warned = 0, noted = 0, clean = 0;
for (const name of fs.readdirSync(ASSET_DIR).filter((f) => f.endsWith('.html')).sort()) {
  const findings = auditHtml(fs.readFileSync(path.join(ASSET_DIR, name), 'utf8'));
  if (!findings.length) { clean += 1; continue; }
  for (const { level, message } of findings) {
    if (level === 'warn') warned += 1; else noted += 1;
    console.log(`${level === 'warn' ? 'warn' : 'note'}  ${name}\n      ${message}\n`);
  }
}
console.log(`${clean} clean, ${noted} noted, ${warned} to fix`);
process.exit(warned ? 1 : 0);
