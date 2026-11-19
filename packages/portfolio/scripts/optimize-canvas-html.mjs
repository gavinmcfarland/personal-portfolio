/* Shrink the stylesheets of already-committed HTML assets.

   The documents on the boards are computed-style exports: the generator gives
   every element an id (`data-h="12"`) and writes its styles out as a rule of
   its own. A dark theme, a hover state or a recorded screen is then one rule
   PER ELEMENT, each a few dozen colour longhands — and almost all of them say
   the same thing, because most elements on a page share a handful of colours.
   One export measured 962 dark-mode rules holding 30 distinct declaration
   blocks: over a megabyte of stylesheet, 97% of it repeats.

   So this merges rules that carry a byte-identical declaration block into one
   rule with a selector list:

     [data-h="1"]{color:#fff}  [data-h="2"]{color:#fff}
       →  [data-h="1"],[data-h="2"]{color:#fff}

   Nothing else is touched — no declaration is rewritten, reordered or dropped,
   inline styles are left alone (hoisting them would change what they outrank),
   and every byte outside a merged rule is written back as it was read.

   WHY THAT IS SAFE. Merging moves a rule to where its twin is, and moving a
   rule only matters if it crosses another rule that could apply to the same
   element — source order decides nothing between rules that never meet. So a
   rule is moved only across rules it provably never meets:

   - a twin (same declarations: their order cannot matter), or
   - a rule whose every selector targets a different element — a different
     value of the same id attribute — or a different pseudo-element of it.

   Anything this cannot read (an unfamiliar selector, a nested at-rule, a
   declaration block that isn't plain) is a wall: nothing moves across it, and
   it is never merged itself. A selector list is also only ever built from
   selectors every browser parses, since one unparseable entry would void the
   whole merged rule where it used to void a single one.

   Each <style> element and each at-rule inside it is its own scope — rules
   never move between them, because they can be switched on and off
   independently (a `prefers-color-scheme` block, a recorded state's sheet).

   Like inject-canvas-bridge.mjs this rewrites in place and keeps the file
   name: these are the published boards' content, and a new content hash would
   orphan every node pointing at the old one. Idempotent — a second run finds
   nothing left to merge.

   This is a repair for exports that already exist. The generator is the right
   place for it (see packages/canvas/EMBEDDED-HTML.md): an export that arrives
   after this was run arrives unmerged.

   Usage (from packages/portfolio):
     node scripts/optimize-canvas-html.mjs            # rewrite
     node scripts/optimize-canvas-html.mjs --dry-run  # report only
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = path.join(path.resolve(__dirname, '..'), 'public/canvas-assets');

/* ── CSS, read just far enough to find rules ─────────────────────────────── */

/* The index just past the string, comment or escape starting at `i`, or `i`
   itself when none starts there. Everything that walks CSS text goes through
   this, so a brace or semicolon inside a string is never taken for structure. */
function skipOpaque(css, i) {
  const c = css[i];
  if (c === '\\') return Math.min(i + 2, css.length);
  if (c === '/' && css[i + 1] === '*') {
    const end = css.indexOf('*/', i + 2);
    return end < 0 ? css.length : end + 2;
  }
  if (c === '"' || c === "'") {
    let j = i + 1;
    while (j < css.length && css[j] !== c) j += css[j] === '\\' ? 2 : 1;
    return Math.min(j + 1, css.length);
  }
  return i;
}

/* Split one scope (a sheet, or the inside of an at-rule) into its top-level
   nodes: { raw } for anything passed through untouched, plus { prelude, body }
   for a `prelude { body }` block. Returns null if the text doesn't balance —
   the caller then leaves the whole sheet alone. */
function parseScope(css) {
  const nodes = [];
  let i = 0, start = 0;
  while (i < css.length) {
    const j = skipOpaque(css, i);
    if (j !== i) { i = j; continue; }
    const c = css[i];
    if (c === ';') { nodes.push({ raw: css.slice(start, i + 1) }); i += 1; start = i; continue; }
    if (c === '}') return null;
    if (c === '{') {
      let depth = 1, k = i + 1;
      while (k < css.length && depth) {
        const j2 = skipOpaque(css, k);
        if (j2 !== k) { k = j2; continue; }
        if (css[k] === '{') depth += 1;
        else if (css[k] === '}') depth -= 1;
        k += 1;
      }
      if (depth) return null;
      nodes.push({ raw: css.slice(start, k), prelude: css.slice(start, i), body: css.slice(i + 1, k - 1) });
      i = k; start = i;
      continue;
    }
    i += 1;
  }
  if (css.slice(start).trim()) nodes.push({ raw: css.slice(start) });
  else if (start < css.length) nodes.push({ raw: css.slice(start) });
  return nodes;
}

/* A declaration block this script will treat as an opaque value to compare:
   no nested blocks, no comments (a comment could differ where the declarations
   don't, and that isn't worth reasoning about). */
const plainBody = (body) => !/[{}]/.test(body) && !body.includes('/*');

/* ── Selectors ───────────────────────────────────────────────────────────── */

/* The only selectors that are merged or moved across. One compound is an id
   attribute with a value, optionally followed by more attribute, class and
   state selectors; a complex selector is compounds joined by descendant or
   child combinators, with an optional ::before / ::after on the last. All of
   it is syntax every browser has parsed for a decade, which is what makes a
   selector list built from it safe. */
const ID_ATTR = String.raw`\[(data-[a-z-]+)="([^"\\\]]*)"\]`;
const EXTRA = String.raw`(?:\[data-[a-z-]+(?:="[^"\\\]]*")?\]|\.[A-Za-z_][\w-]*|:(?:hover|focus|active|focus-visible|focus-within))`;
const COMPOUND = `${ID_ATTR}${EXTRA}*`;
const COMPLEX = new RegExp(`^(?:${COMPOUND}(?:\\s*>\\s*|\\s+))*${COMPOUND}(::(?:before|after))?$`);
const LAST_COMPOUND = new RegExp(`${COMPOUND}(::(?:before|after))?$`);

/* What each selector in a rule's list ends up styling: which id attribute,
   which value, which pseudo-element. Null if any of them is outside the
   grammar above — such a rule is a wall. */
function targetsOf(prelude) {
  const out = [];
  for (const part of prelude.split(',')) {
    const sel = part.trim();
    if (!COMPLEX.test(sel)) return null;
    const m = LAST_COMPOUND.exec(sel);
    out.push({ attr: m[1], value: m[2], pseudo: m[3] || '' });
  }
  return out;
}

/* Can no element (or pseudo-element) be styled by both rules? */
function neverMeet(a, b) {
  for (const x of a) {
    for (const y of b) {
      if (x.pseudo !== y.pseudo) continue;
      if (x.attr === y.attr && x.value !== y.value) continue;
      return false;
    }
  }
  return true;
}

/* ── The merge ───────────────────────────────────────────────────────────── */

const SCOPED_AT = /^\s*@(media|supports|layer|container|scope|starting-style)\b/i;

function mergeScope(css, stats) {
  const nodes = parseScope(css);
  if (!nodes) return css;

  // Recurse first: an at-rule's inside is a scope of its own.
  for (const n of nodes) {
    if (n.prelude == null) continue;
    if (n.prelude.trim().startsWith('@')) {
      if (SCOPED_AT.test(n.prelude)) {
        const inner = mergeScope(n.body, stats);
        if (inner !== n.body) { n.body = inner; n.raw = `${n.prelude}{${inner}}`; }
      }
      continue;
    }
    if (!plainBody(n.body)) continue;
    n.targets = targetsOf(n.prelude);
  }

  /* Walk backwards, folding each rule into the nearest later twin it can
     reach. `open` holds, per declaration block, the twin currently accepting
     selectors and every node standing between it and the walk. A rule that
     cannot reach its twin becomes the new one for rules earlier still. */
  const open = new Map();
  const removed = new Set();
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const n = nodes[i];
    if (!n.targets) {
      // Whitespace and comments between rules are not walls; anything else is.
      if (n.prelude != null || n.raw.replace(/\/\*[\s\S]*?\*\//g, '').trim()) open.clear();
      continue;
    }
    const twin = open.get(n.body);
    if (twin && twin.between.every((t) => neverMeet(n.targets, t))) {
      twin.node.selectors.push(n.prelude.trim());
      twin.node.targets = twin.node.targets.concat(n.targets);
      removed.add(i);
      stats.merged += 1;
    } else {
      n.selectors = [n.prelude.trim()];
      open.set(n.body, { node: n, between: [] });
    }
    // This rule now stands between every OTHER open twin and whatever the walk
    // reaches next. (Its own group is exempt: twins may cross each other.)
    for (const [body, entry] of open) if (body !== n.body) entry.between.push(n.targets);
  }
  if (!removed.size) return nodes.map((n) => n.raw).join('');

  return nodes.map((n, i) => {
    if (removed.has(i)) return '';
    if (n.selectors && n.selectors.length > 1) {
      // Keep whatever whitespace led the rule; the selectors go back in source order.
      const lead = /^\s*/.exec(n.prelude)[0];
      return `${lead}${n.selectors.reverse().join(',')}{${n.body}}`;
    }
    return n.raw;
  }).join('');
}

/* ── HTML: find the <style> elements ─────────────────────────────────────── */

/* Scanned rather than matched with one regex, because the text `<style` also
   appears where it is not an element: inside the scripts these documents carry
   (the canvas bridge among them) and inside comments. */
function optimizeHtml(html, stats) {
  const open = /<!--|<(script|style)\b[^>]*>/gi;
  let out = '', pos = 0, m;
  while ((m = open.exec(html))) {
    if (m[0] === '<!--') {
      const end = html.indexOf('-->', m.index + 4);
      open.lastIndex = end < 0 ? html.length : end + 3;
      continue;
    }
    const tag = m[1].toLowerCase();
    const close = new RegExp(`</${tag}\\s*>`, 'gi');
    close.lastIndex = open.lastIndex;
    const c = close.exec(html);
    if (!c) break;
    if (tag === 'style') {
      const css = html.slice(open.lastIndex, c.index);
      stats.sheets += 1;
      /* To a fixed point. A rule that was blocked on the first pass can be free
         on the next, once the rule that stood in its way has itself been folded
         into a twin further on — the walk only knows where rules started. */
      let next = css, prev;
      do { prev = next; next = mergeScope(prev, stats); } while (next !== prev);
      out += html.slice(pos, open.lastIndex) + next;
      pos = c.index;
    }
    open.lastIndex = close.lastIndex;
  }
  return out + html.slice(pos);
}

export { optimizeHtml };

/* ── Run ─────────────────────────────────────────────────────────────────── */

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dry = process.argv.includes('--dry-run');
  if (!fs.existsSync(ASSET_DIR)) {
    console.error(`no asset directory at ${ASSET_DIR}`);
    process.exit(1);
  }
  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  let before = 0, after = 0, written = 0;
  for (const name of fs.readdirSync(ASSET_DIR).filter((f) => f.endsWith('.html')).sort()) {
    const file = path.join(ASSET_DIR, name);
    const html = fs.readFileSync(file, 'utf8');
    const stats = { sheets: 0, merged: 0 };
    const next = optimizeHtml(html, stats);
    before += html.length; after += next.length;
    if (next === html) continue;
    if (!dry) fs.writeFileSync(file, next);
    written += 1;
    console.log(`${name}: ${kb(html.length)} → ${kb(next.length)}  (${stats.merged} rules merged)`);
  }
  console.log(`\n${written} ${dry ? 'would be rewritten' : 'rewritten'}: ${kb(before)} → ${kb(after)} across all html assets`);
}
