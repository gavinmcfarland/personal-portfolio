/* Rich text for text blocks (`tblock`).
 *
 * The editable surface is a plain contentEditable, so anything the browser or a
 * paste can put in it is HTML. We keep the model honest by allowing exactly one
 * tiny subset — bold / italic / underline / strikethrough plus bulleted and
 * numbered lists — and running every string through `sanitizeRich` on the way
 * in (load, paste) and on the way out (commit). Everything outside the subset is
 * unwrapped (its text survives, its markup doesn't); the handful of tags that
 * carry no text worth keeping are dropped whole. No attributes are ever kept, so
 * there is nothing for a `style`, `href`, `on*` or `src` to ride in on.
 *
 * A node keeps `text` (plain, still the canonical content for page labels,
 * clipboard, search, the empty-block check) and, only when it actually carries
 * formatting, `html`. Blocks authored before rich text — and blocks the user
 * never formats — save exactly as they did before.
 */

/* Tags we keep, normalised to one spelling each (execCommand and the browsers'
   own ⌘B handling emit b/i/strike; markdown-ish pastes bring p). */
const KEEP = {
  B: 'strong', STRONG: 'strong',
  I: 'em', EM: 'em',
  U: 'u',
  S: 's', STRIKE: 's', DEL: 's',
  UL: 'ul', OL: 'ol', LI: 'li',
  BR: 'br', DIV: 'div', P: 'div',
};

/* Dropped whole rather than unwrapped — their text content is markup, script
   source or metadata, never something the user meant to paste. */
const DROP = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'FRAME', 'FRAMESET', 'OBJECT', 'EMBED', 'APPLET',
  'LINK', 'META', 'BASE', 'TITLE', 'HEAD', 'NOSCRIPT', 'TEMPLATE',
  'SVG', 'MATH', 'CANVAS', 'IMG', 'PICTURE', 'AUDIO', 'VIDEO', 'SOURCE',
  'FORM', 'INPUT', 'BUTTON', 'SELECT', 'OPTION', 'TEXTAREA',
]);

/* The inline marks the properties panel can toggle, keyed by the panel's own
   name for them; the values are execCommand command names. */
export const RICH_COMMANDS = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strikeThrough',
  ul: 'insertUnorderedList',
  ol: 'insertOrderedList',
};

/* Tag that marks each inline format, for reading state back off saved HTML. */
const MARK_TAGS = { bold: 'strong', italic: 'em', underline: 'u', strike: 's' };

const parse = (html) =>
  new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;

const unwrap = (el) => { el.replaceWith(...[...el.childNodes]); };

function scrub(parent, doc) {
  for (const node of [...parent.childNodes]) {
    if (node.nodeType === 3) continue;                              // text
    if (node.nodeType !== 1) { node.remove(); continue; }           // comment, CDATA…
    if (DROP.has(node.tagName)) { node.remove(); continue; }
    scrub(node, doc);                                               // depth-first: children are clean before the parent moves them
    const keep = KEEP[node.tagName];
    if (!keep) { unwrap(node); continue; }
    if (keep !== node.tagName.toLowerCase()) {
      const el = doc.createElement(keep);
      while (node.firstChild) el.appendChild(node.firstChild);
      node.replaceWith(el);
      continue;
    }
    for (const attr of [...node.attributes]) node.removeAttribute(attr.name);
  }
}

/* Reduce an HTML string to the allowed subset. Parsed with DOMParser, which
   builds an inert document — nothing loads, nothing runs, not even for the
   markup we're about to throw away. */
export function sanitizeRich(html) {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return ''; // no DOM (SSR): drop rather than trust
  const body = parse(html);
  scrub(body, body.ownerDocument);
  return body.innerHTML;
}

/* Does this HTML carry formatting worth persisting? Plain typing produces a
   bare text run (plus, in some browsers, the odd <div>/<br> line break), and
   storing that as `html` would bloat every snapshot for nothing. */
export function isRichHtml(html) {
  return !!html && /<(strong|em|u|s|ul|ol|li)\b/i.test(html);
}

/* Markdown-style list shortcuts: turn a line that the user opened with "- ",
 * "* ", "+ ", "1. " or "1) " into a real list item. Called from the editable's
 * `input` handler for the space that closes the marker, so it fires on the
 * keystroke itself rather than waiting for a commit.
 *
 * `root` is the contentEditable. Both steps — dropping the marker and building
 * the list — go through execCommand so they join the browser's own undo stack
 * and a single ⌘Z puts the typed characters back.
 *
 * Returns true when a list was started, false when the line wasn't a marker.
 */
export function applyListShortcut(root) {
  const sel = typeof getSelection === 'function' ? getSelection() : null;
  if (!root || !sel || !sel.rangeCount || !sel.isCollapsed) return false;
  const t = sel.focusNode;
  if (!t || t.nodeType !== 3 || !root.contains(t)) return false;
  // The marker has to sit in the caret's own text node: freshly typed characters
  // land there together, whereas a marker split across nodes is formatted text
  // that happens to start with a dash.
  const off = sel.focusOffset;
  const seg = t.data.slice(0, off);
  const nl = seg.lastIndexOf('\n');
  const marker = seg.slice(nl + 1).match(/^([-*+]|\d+[.)]) $/);
  if (!marker) return false;
  // The line box the caret sits in. Chrome keeps later lines as bare "\n" inside
  // one element (the check above covers those); other browsers split them into
  // <div>s, hence this one. Never climbs out of the editable.
  let block = t.parentElement;
  while (block && block !== root && !/^(LI|DIV|P)$/.test(block.tagName)) block = block.parentElement;
  if (!block || !root.contains(block)) block = root;
  if (block.tagName === 'LI' || (block !== root && block.closest('ul, ol'))) return false; // already a list
  if (nl < 0) {
    // Nothing typed before the marker on this line, or it isn't a line start.
    const before = document.createRange();
    before.setStart(block, 0);
    before.setEnd(t, 0);
    const prefix = before.toString();
    if (prefix && !prefix.endsWith('\n')) return false;
  }
  const del = document.createRange();
  del.setStart(t, off - marker[0].length);
  del.setEnd(t, off);
  sel.removeAllRanges();
  sel.addRange(del);
  document.execCommand('delete');
  document.execCommand(/\d/.test(marker[1]) ? 'insertOrderedList' : 'insertUnorderedList');
  return true;
}

/* Which formats cover *all* of a block's text — what the properties panel shows
   as active for a selected-but-not-being-edited block. Whole-block only: a
   partially bold block reads as not bold, which is what clicking B would then
   do to it. */
export function richState(html) {
  const state = { bold: false, italic: false, underline: false, strike: false, ul: false, ol: false };
  if (!html || typeof DOMParser === 'undefined') return state;
  const body = parse(html);
  state.ul = !!body.querySelector('ul');
  state.ol = !!body.querySelector('ol');
  const walker = body.ownerDocument.createTreeWalker(body, 4 /* SHOW_TEXT */);
  const hit = { bold: 0, italic: 0, underline: 0, strike: 0 };
  let total = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    // Whitespace is formatting-agnostic — a trailing space outside the <strong>
    // shouldn't make a fully bold line read as partly plain.
    const len = n.data.replace(/\s+/g, '').length;
    if (!len || !n.parentElement) continue;
    total += len;
    for (const key in MARK_TAGS) if (n.parentElement.closest(MARK_TAGS[key])) hit[key] += len;
  }
  if (!total) return state;
  for (const key in hit) state[key] = hit[key] === total;
  return state;
}
