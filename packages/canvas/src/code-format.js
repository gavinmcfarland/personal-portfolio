/* Zero-dependency, whitespace-only reindenter — the built-in default formatter
   for the code object. It ONLY ever rewrites each line's leading indentation to
   match its nesting depth; it never touches non-whitespace characters, so it
   cannot corrupt code. Lines inside constructs whose whitespace is significant
   (multi-line strings/templates, block comments, and — for HTML — <pre>,
   <textarea>, <script>, <style> and comments) are left exactly as-is.

   Returns { formatted, cursorOffset } — the cursorOffset is mapped through the
   reindent so callers can restore the caret (the shape matches Prettier's
   `formatWithCursor`, so a host can drop Prettier in via the `formatCode` prop
   with no other changes).

   It is intentionally lightweight: it aligns block/tag structure, not
   expressions — it won't align call arguments to an open paren, hug object
   arguments, reflow long lines, or indent switch cases. For that, inject a real
   formatter. */
import { normalizeLang } from './code';

/* Brace-delimited languages, where indentation is cosmetic. Indentation-
   significant languages (Python, YAML) and JSX (tag-nested, not brace-nested)
   are deliberately excluded. HTML is handled separately (tag-nested). */
const BRACE_LANGS = new Set(['js', 'ts', 'json', 'css', 'go', 'rust', 'java', 'c', 'cpp', 'cs', 'php', 'swift', 'kotlin', 'scala']);

const OPEN = { '{': 1, '(': 1, '[': 1 };
const CLOSE = { '}': 1, ')': 1, ']': 1 };
const UNIT = '  '; // two spaces, matching the editor's tab-size / Tab handling

/* HTML elements that never nest (no depth change) and those whose content must
   be preserved verbatim (whitespace-significant or non-HTML). */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['pre', 'textarea', 'script', 'style']);

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* Shared driver: walk lines, ask `plan(line, content)` whether to preserve the
   line or reindent it to a level, rebuild the text, and map the caret through. */
function reindent(src, cursorOffset, plan) {
  const lines = src.split('\n');
  const out = [];
  let oldOffset = 0, newOffset = 0, newCursor = cursorOffset;
  for (const line of lines) {
    const oldIndentLen = line.match(/^[ \t]*/)[0].length;
    const content = line.slice(oldIndentLen);
    const p = plan(line, content);
    const hasCaret = cursorOffset != null && cursorOffset >= oldOffset && cursorOffset <= oldOffset + line.length;
    let newLine, newIndentLen;
    if (p.preserve) {
      newLine = line; newIndentLen = oldIndentLen;
    } else if (content === '') {
      // Blank lines are normalised to empty — but if the caret sits on this
      // (e.g. freshly opened via Enter) line, indent it to its structural level
      // so typing starts in the right place.
      if (hasCaret && p.level > 0) { newIndentLen = p.level * UNIT.length; newLine = UNIT.repeat(p.level); }
      else { newLine = ''; newIndentLen = 0; }
    } else {
      newIndentLen = p.level * UNIT.length; newLine = UNIT.repeat(p.level) + content;
    }

    if (hasCaret) {
      const col = cursorOffset - oldOffset;
      // A caret inside the (old) leading whitespace snaps to the new indent's end
      // — i.e. to the start of the line's content.
      newCursor = col <= oldIndentLen
        ? newOffset + newIndentLen
        : newOffset + newIndentLen + (col - oldIndentLen);
    }
    out.push(newLine);
    oldOffset += line.length + 1;
    newOffset += newLine.length + 1;
  }
  const formatted = out.join('\n');
  return { formatted, cursorOffset: cursorOffset == null ? undefined : clamp(newCursor, 0, formatted.length) };
}

/* ── Brace languages ─────────────────────────────────────────────── */
function scanBrace(line, state, slashLine) {
  let { depth, inBlock, inTpl } = state;
  const n = line.length;
  let i = 0;
  while (i < n) {
    const ch = line[i];
    if (inBlock) {
      if (ch === '*' && line[i + 1] === '/') { inBlock = false; i += 2; continue; }
      i++; continue;
    }
    if (inTpl) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === '`') { inTpl = false; i++; continue; }
      i++; continue; // ${…} code inside templates is ignored for depth (safe, lightweight)
    }
    if (ch === '/' && line[i + 1] === '*') { inBlock = true; i += 2; continue; }
    if (slashLine && ch === '/' && line[i + 1] === '/') break; // line comment → ignore rest
    if (ch === '`') { inTpl = true; i++; continue; }
    if (ch === '"' || ch === "'") {
      const q = ch; i++;
      while (i < n) {
        if (line[i] === '\\') { i += 2; continue; }
        if (line[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    if (OPEN[ch]) depth++;
    else if (CLOSE[ch]) depth--;
    i++;
  }
  return { depth: depth < 0 ? 0 : depth, inBlock, inTpl };
}

function bracePlanner(slashLine) {
  let state = { depth: 0, inBlock: false, inTpl: false };
  return (line, content) => {
    if (state.inBlock || state.inTpl) { state = scanBrace(line, state, slashLine); return { preserve: true }; }
    let closers = 0;
    while (closers < content.length && CLOSE[content[closers]]) closers++;
    const level = Math.max(0, state.depth - closers);
    state = scanBrace(line, state, slashLine);
    return { preserve: false, level };
  };
}

/* ── Markup (HTML / XML / SVG) ────────────────────────────────────── */
function scanMarkup(line, state) {
  let { depth, inComment, raw } = state;
  let leadingClosers = 0;
  let atStart = true; // only whitespace / leading close-tags seen so far
  const n = line.length;
  let i = 0;
  while (i < n) {
    if (inComment) {
      const idx = line.indexOf('-->', i);
      if (idx === -1) { i = n; } else { inComment = false; i = idx + 3; }
      atStart = false; continue;
    }
    if (raw) {
      const idx = line.toLowerCase().indexOf('</' + raw, i);
      if (idx === -1) { i = n; }
      else { const gt = line.indexOf('>', idx); raw = null; depth = Math.max(0, depth - 1); i = gt === -1 ? n : gt + 1; }
      atStart = false; continue;
    }
    const ch = line[i];
    if (ch === ' ' || ch === '\t') { i++; continue; }
    if (ch === '<') {
      if (line.startsWith('<!--', i)) {
        const idx = line.indexOf('-->', i + 4);
        if (idx === -1) { inComment = true; i = n; } else { i = idx + 3; }
        atStart = false; continue;
      }
      if (line[i + 1] === '!' || line[i + 1] === '?') { // doctype / declaration / PI
        const gt = line.indexOf('>', i); i = gt === -1 ? n : gt + 1; atStart = false; continue;
      }
      if (line[i + 1] === '/') { // closing tag
        const gt = line.indexOf('>', i);
        depth = Math.max(0, depth - 1);
        if (atStart) leadingClosers++;
        i = gt === -1 ? n : gt + 1;
        continue; // stay atStart so consecutive leading closers keep counting
      }
      const gt = line.indexOf('>', i); // opening tag
      const inner = line.slice(i + 1, gt === -1 ? n : gt);
      const name = (inner.match(/^[\w:-]+/) || [''])[0].toLowerCase();
      const selfClose = /\/\s*$/.test(inner);
      if (!selfClose && name && !VOID.has(name)) { depth++; if (RAW.has(name)) raw = name; }
      i = gt === -1 ? n : gt + 1;
      atStart = false; continue;
    }
    atStart = false; i++; // text
  }
  return { depth: Math.max(0, depth), inComment, raw, leadingClosers };
}

function markupPlanner() {
  let state = { depth: 0, inComment: false, raw: null };
  return (line) => {
    const preserve = state.inComment || !!state.raw;
    const r = scanMarkup(line, state);
    const level = Math.max(0, state.depth - r.leadingClosers);
    state = { depth: r.depth, inComment: r.inComment, raw: r.raw };
    return preserve ? { preserve: true } : { preserve: false, level };
  };
}

export function formatCode(src, lang, opts = {}) {
  const cursorOffset = opts.cursorOffset;
  const l = normalizeLang(lang);
  if (!src) return { formatted: src, cursorOffset };
  if (l === 'html') return reindent(src, cursorOffset, markupPlanner());
  if (BRACE_LANGS.has(l)) return reindent(src, cursorOffset, bracePlanner(l !== 'css')); // `//` isn't a comment in CSS
  return { formatted: src, cursorOffset };
}
