#!/usr/bin/env node
/*
 * Generate core.css (structural) + theme.css (skin) from the authored
 * canvas.css. Every declaration is routed by its property: geometry /
 * layout / interaction -> core (everything the engine needs to FUNCTION);
 * colour / border / shadow / font / spacing / motion -> theme (the default
 * SKIN). Loading core.css alone gives a working, unstyled board to theme from
 * scratch; core.css + theme.css == canvas.css.
 *
 * canvas.css stays the source of truth (edit it, then re-run this script):
 *   node scripts/split-css.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'src');
const css = readFileSync(join(SRC, 'canvas.css'), 'utf8');

/* ── property classification ─────────────────────────────────────────── */
const CORE_EXACT = new Set([
  'position', 'top', 'right', 'bottom', 'left', 'inset', 'display', 'box-sizing',
  'float', 'clear', 'width', 'height', 'aspect-ratio', 'object-fit', 'object-position',
  'transform', 'transform-origin', 'translate', 'rotate', 'scale', 'perspective',
  'perspective-origin', 'gap', 'row-gap', 'column-gap', 'z-index', 'pointer-events',
  'touch-action', 'user-select', '-webkit-user-select', 'cursor', 'resize', 'white-space',
  'word-break', 'overflow-wrap', 'writing-mode', 'direction', 'vertical-align',
  'visibility', 'contain', 'will-change', 'isolation', 'order', 'table-layout',
]);
const CORE_PREFIX = ['inset-', 'min-', 'max-', 'flex', 'align-', 'justify-', 'place-', 'grid', 'overflow', 'scroll-', 'overscroll-'];
const THEME_EXACT = new Set([
  'color', 'background', 'opacity', 'box-shadow', 'filter', 'backdrop-filter',
  '-webkit-backdrop-filter', 'mix-blend-mode', 'background-blend-mode', 'fill', 'stroke',
  'font', 'line-height', 'letter-spacing', 'word-spacing', '-webkit-font-smoothing',
  '-moz-osx-font-smoothing', 'text-shadow', 'caret-color', 'accent-color',
  '-webkit-tap-highlight-color', 'list-style', 'content', 'quotes', 'appearance', '-webkit-appearance',
]);
const THEME_PREFIX = ['background-', 'border', 'outline', 'font-', 'text-', 'margin', 'padding', 'transition', 'animation', 'stroke-', 'fill-', 'list-style-', '-webkit-text-', 'mask', '-webkit-mask'];
// layout-affecting custom properties live with the geometry that consumes them
const CORE_TOKENS = new Set(['--cv-df-bar', '--cv-df-u', '--cv-gx', '--cv-gy', '--cv-rz-corner-half']);
const unknown = new Set();

function bucket(prop) {
  const p = prop.toLowerCase();
  if (p.startsWith('--')) return CORE_TOKENS.has(p) ? 'core' : 'theme';
  if (CORE_EXACT.has(p)) return 'core';
  if (THEME_EXACT.has(p)) return 'theme';
  for (const pre of THEME_PREFIX) if (p.startsWith(pre)) return 'theme';
  for (const pre of CORE_PREFIX) if (p.startsWith(pre)) return 'core';
  unknown.add(p);
  return 'core'; // conservative: unknown props stay functional
}

/* ── tokenizer / parser ──────────────────────────────────────────────── */
let i = 0;
const n = css.length;

function readComment() { // assumes css[i..]=='/*'
  const end = css.indexOf('*/', i + 2);
  const j = end === -1 ? n : end + 2;
  const t = css.slice(i, j); i = j; return t;
}
// read up to (not including) one of the stop chars, respecting strings/comments/parens
function readUntil(stops) {
  let s = ''; let depth = 0;
  while (i < n) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') { s += readComment(); continue; }
    if (c === '"' || c === "'") { const q = c; s += c; i++; while (i < n && css[i] !== q) { if (css[i] === '\\') { s += css[i++]; } s += css[i++]; } if (i < n) s += css[i++]; continue; }
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (depth === 0 && stops.includes(c)) return s;
    s += c; i++;
  }
  return s;
}

writeFiles(splitTop(parseTop()));

/* Two-level parser: top-level items, then declaration bodies inside rules. */
function parseTop() {
  i = 0; const items = [];
  while (i < n) {
    const c = css[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && css[i + 1] === '*') { items.push({ type: 'comment', text: readComment() }); continue; }
    const prelude = readUntil(['{', ';']).trim();
    if (css[i] === '{') {
      i++;
      if (prelude.startsWith('@')) {
        const kw = prelude.split(/[\s(]/)[0].toLowerCase();
        if (kw === '@media' || kw === '@supports') items.push({ type: 'atblock', prelude, kw, children: parseTopNested() });
        else items.push({ type: 'atraw', prelude, body: readRawBody() }); // @keyframes / @font-face -> whole thing is skin
      } else {
        items.push({ type: 'rule', selector: prelude, decls: readDecls() });
      }
    } else if (css[i] === ';') { i++; items.push({ type: 'stmt', text: prelude + ';' }); }
    else break;
  }
  return items;
}
function parseTopNested() { // inside @media/@supports: rules until matching }
  const items = [];
  while (i < n) {
    const c = css[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '}') { i++; return items; }
    if (c === '/' && css[i + 1] === '*') { items.push({ type: 'comment', text: readComment() }); continue; }
    const prelude = readUntil(['{', ';']).trim();
    if (css[i] === '{') {
      i++;
      if (prelude.startsWith('@')) { const kw = prelude.split(/[\s(]/)[0].toLowerCase(); items.push({ type: 'atraw', prelude, body: readRawBody() }); void kw; }
      else items.push({ type: 'rule', selector: prelude, decls: readDecls() });
    } else if (css[i] === ';') { i++; items.push({ type: 'stmt', text: prelude + ';' }); }
    else return items;
  }
  return items;
}
function readRawBody() { // capture until matching } (depth aware), return inner text
  let depth = 1; let s = '';
  while (i < n && depth > 0) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') { s += readComment(); continue; }
    if (c === '"' || c === "'") { const q = c; s += css[i++]; while (i < n && css[i] !== q) { if (css[i] === '\\') s += css[i++]; s += css[i++]; } if (i < n) s += css[i++]; continue; }
    if (c === '{') depth++;
    if (c === '}') { depth--; if (depth === 0) { i++; break; } }
    s += css[i++];
  }
  return s;
}
function readDecls() { // inside a rule: list of {comment} | {prop,value} until }
  const decls = [];
  while (i < n) {
    const c = css[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '}') { i++; return decls; }
    if (c === '/' && css[i + 1] === '*') { decls.push({ type: 'comment', text: readComment() }); continue; }
    const chunk = readUntil([';', '}']);
    if (css[i] === ';') i++;
    const t = chunk.trim();
    if (!t) continue;
    const ci = t.indexOf(':');
    if (ci === -1) { decls.push({ type: 'raw', text: t }); continue; }
    decls.push({ type: 'decl', prop: t.slice(0, ci).trim(), value: t.slice(ci + 1).trim() });
  }
  return decls;
}

/* ── splitting ───────────────────────────────────────────────────────── */
function splitDecls(decls, target) {
  // keep comments that immediately precede a kept declaration
  const out = [];
  let pendingComments = [];
  for (const d of decls) {
    if (d.type === 'comment' || d.type === 'raw') { pendingComments.push(d); continue; }
    if (bucket(d.prop) === target) { out.push(...pendingComments, d); pendingComments = []; }
    else pendingComments = []; // drop comments tied to the other file's decl
  }
  return out;
}
function splitItems(items, target) {
  const out = [];
  for (const it of items) {
    if (it.type === 'comment' || it.type === 'stmt') { out.push(it); continue; }
    if (it.type === 'atraw') { if (target === 'theme') out.push(it); continue; }
    if (it.type === 'atblock') {
      const kids = splitItems(it.children, target);
      if (kids.some((k) => k.type === 'rule' || k.type === 'atblock' || k.type === 'atraw')) out.push({ ...it, children: kids });
      continue;
    }
    if (it.type === 'rule') {
      const kept = splitDecls(it.decls, target);
      if (kept.some((d) => d.type === 'decl')) out.push({ ...it, decls: kept });
    }
  }
  return out;
}
function splitTop(items) { return { core: splitItems(items, 'core'), theme: splitItems(items, 'theme') }; }

/* ── printing ────────────────────────────────────────────────────────── */
function printDecls(decls, ind) {
  return decls.map((d) => {
    if (d.type === 'comment') return ind + d.text;
    if (d.type === 'raw') return ind + d.text + ';';
    return `${ind}${d.prop}: ${d.value};`;
  }).join('\n');
}
function printItems(items, ind = '') {
  const out = [];
  for (const it of items) {
    if (it.type === 'comment') out.push(ind + it.text);
    else if (it.type === 'stmt') out.push(ind + it.text);
    else if (it.type === 'atraw') out.push(`${ind}${it.prelude} {${it.body}}`);
    else if (it.type === 'atblock') out.push(`${ind}${it.prelude} {\n${printItems(it.children, ind + '  ')}\n${ind}}`);
    else if (it.type === 'rule') out.push(`${ind}${it.selector} {\n${printDecls(it.decls, ind + '  ')}\n${ind}}`);
  }
  return out.join('\n');
}

function writeFiles({ core, theme }) {
  const banner = (kind, note) =>
    `/* @gavinmcfarland/canvas — ${kind}. GENERATED from canvas.css by\n   scripts/split-css.mjs — do not edit by hand; edit canvas.css and re-run.\n   ${note} */\n\n`;
  writeFileSync(join(SRC, 'core.css'),
    banner('structural styles (headless core)',
      'Everything the engine needs to function: geometry, layout, camera transforms,\n   interaction (pointer-events / touch-action / cursors), overlay geometry. No skin.\n   Import this alone to build a completely bespoke look from scratch.') +
    printItems(core) + '\n');
  writeFileSync(join(SRC, 'theme.css'),
    banner('default skin (optional)',
      'Colour, border, radius, shadow, font, spacing and motion — all --cv-* token\n   driven. Layer over core.css for the default look, or omit it to go headless.') +
    printItems(theme) + '\n');
  if (unknown.size) console.log('unknown props (routed to core):', [...unknown].sort().join(', '));
  console.log('wrote src/core.css and src/theme.css');
}
