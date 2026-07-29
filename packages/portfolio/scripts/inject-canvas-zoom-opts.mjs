/* Backfill the zoom paint-mode bridge into already-committed HTML assets.

   The canvas injects a two-part bridge into every HTML document at ingest
   (see injectBridge in packages/canvas/src/CanvasProvider.jsx): a theme-sync
   half, and a zoom half that puts the document into a cheap paint mode while
   the board is mid-gesture. Assets committed before the zoom half existed
   carry only the first, and re-ingesting them isn't an option — they're the
   published boards' content.

   This script adds the missing half in place, and upgrades an older one:
   any existing `data-cv-zoom-opts` block is stripped before the current
   version goes in. Idempotent — a document already carrying VERSION is left
   alone — so it is safe to re-run after any future asset import.

   Keep the injected script (and VERSION) in step with ZOOM_OPTS in
   CanvasProvider.jsx.

   Usage (from packages/portfolio):
     node scripts/inject-canvas-zoom-opts.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = path.join(path.resolve(__dirname, '..'), 'public/canvas-assets');

const MARKER = 'data-cv-zoom-opts';
const VERSION = '2';
const CURRENT = `${MARKER}="${VERSION}"`;
/* v2 dropped v1's `contain: layout paint` / `content-visibility: auto` rules:
   all of contain:layout, contain:paint and content-visibility:auto make the
   element a containing block for `position: fixed` descendants, so a document
   with a fixed header visibly reflowed for the duration of every zoom. What's
   left is per-pixel only and cannot move a box. */
const ZOOM_OPTS = `<script ${CURRENT}>(() => {
  let style = null;
  const ensure = () => {
    if (style) return;
    style = document.createElement('style');
    style.textContent =
      'html.cv-zooming *,html.cv-zooming *::before,html.cv-zooming *::after{' +
      'box-shadow:none!important;text-shadow:none!important;backdrop-filter:none!important}';
    (document.head || document.documentElement).appendChild(style);
  };
  addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.type !== 'canvas-zoom') return;
    ensure();
    document.documentElement.classList.toggle('cv-zooming', !!d.active);
  });
})()</` + 'script>';

/* The emitted script body contains no literal `</script>`, so a non-greedy
   match to the first one is exactly the block. */
const EXISTING = new RegExp(`<script ${MARKER}[^>]*>[\\s\\S]*?</script>`, 'i');

/* Same placement rule as the runtime injector: end of <head> (after the
   document's own styles, before the body renders), else just inside the
   head/html open tag, else prepended. */
function inject(html) {
  const stripped = html.replace(EXISTING, '');
  const close = /<\/head\s*>/i.exec(stripped);
  if (close) return stripped.slice(0, close.index) + ZOOM_OPTS + stripped.slice(close.index);
  const m = /<head[^>]*>/i.exec(stripped) || /<html[^>]*>/i.exec(stripped);
  if (m) return stripped.slice(0, m.index + m[0].length) + ZOOM_OPTS + stripped.slice(m.index + m[0].length);
  return ZOOM_OPTS + stripped;
}

if (!fs.existsSync(ASSET_DIR)) {
  console.error(`no asset directory at ${ASSET_DIR}`);
  process.exit(1);
}

let done = 0, skipped = 0;
for (const name of fs.readdirSync(ASSET_DIR).filter((f) => f.endsWith('.html')).sort()) {
  const file = path.join(ASSET_DIR, name);
  const html = fs.readFileSync(file, 'utf8');
  if (html.includes(CURRENT)) { skipped += 1; continue; }
  const had = EXISTING.test(html);
  fs.writeFileSync(file, inject(html));
  console.log(`${had ? 'upgraded' : 'injected'} ${name}`);
  done += 1;
}
console.log(`\n${done} written, ${skipped} already at v${VERSION}`);
