/* Tiny zero-dependency syntax highlighter for the code object, in the spirit of
   markdown.js. `codeHighlight(src, lang)` returns tokenised HTML (spans wrapped
   in `c-*` classes) for both the read view and the live editor overlay.

   It is intentionally lightweight — a pragmatic tokeniser, not a full grammar —
   so the canvas package keeps its single (icon-only) dependency. Consumers who
   want richer highlighting can pass their own `highlightCode(src, lang)` to
   <Canvas> (e.g. wrapping Shiki / Prism / highlight.js); the built-in below is
   the default fallback, so that npm package stays entirely optional. */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const wrap = (cls, s) => `<span class="${cls}">${s}</span>`;

/* Values that read as literals across most languages. */
const LIT = new Set('true false null undefined None True False nil NaN Infinity'.split(' '));

const set = (s) => new Set(s.split(/\s+/).filter(Boolean));

const JS_KW = set(`abstract as async await break case catch class const continue debugger declare
  default delete do else enum export extends finally for from function get if implements import in
  instanceof interface let namespace new of package private protected public readonly return satisfies
  set static super switch this throw try type typeof var void while with yield`);
const PY_KW = set(`and as assert async await break class continue def del elif else except finally for
  from global if import in is lambda nonlocal not or pass raise return try while with yield match case self`);
const GO_KW = set(`break case chan const continue default defer else fallthrough for func go goto if import
  interface map package range return select struct switch type var`);
const RUST_KW = set(`as async await break const continue crate dyn else enum extern fn for if impl in let
  loop match mod move mut pub ref return self Self static struct super trait type unsafe use where while`);
const SQL_KW = set(`select from where insert into values update set delete create table drop alter add
  primary key foreign references join inner left right outer full on group by order having limit offset
  distinct as and or not null is in like between union all count sum avg min max case when then else end`);
const BASH_KW = set(`if then else elif fi for while until do done case esac in function return export local
  readonly echo cd source shift exit set unset`);

/* Per-language config: `kw` keyword set, `block` = C-style /* *​/ comments,
   `line` = line-comment leaders, `ci` = case-insensitive keywords (SQL). */
const JS = { kw: JS_KW, block: 1, line: ['//'] };
const CFG = {
  js: JS, ts: JS, jsx: JS, tsx: JS,
  json: { kw: set('true false null'), block: 0, line: [] },
  python: { kw: PY_KW, block: 0, line: ['#'] },
  bash: { kw: BASH_KW, block: 0, line: ['#'] },
  go: { kw: GO_KW, block: 1, line: ['//'] },
  rust: { kw: RUST_KW, block: 1, line: ['//'] },
  sql: { kw: SQL_KW, block: 1, line: ['--'], ci: 1 },
};

const ALIAS = {
  javascript: 'js', node: 'js', typescript: 'ts', py: 'python', sh: 'bash', shell: 'bash',
  zsh: 'bash', htm: 'html', xml: 'html', svg: 'html', scss: 'css', less: 'css', plaintext: 'text',
  plain: 'text', txt: 'text',
};

/* Languages offered in the node's picker. */
export const CODE_LANGS = [
  { id: 'js', label: 'JavaScript' },
  { id: 'ts', label: 'TypeScript' },
  { id: 'jsx', label: 'JSX' },
  { id: 'tsx', label: 'TSX' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'json', label: 'JSON' },
  { id: 'python', label: 'Python' },
  { id: 'bash', label: 'Shell' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'sql', label: 'SQL' },
  { id: 'text', label: 'Plain text' },
];

export function normalizeLang(lang) {
  const l = String(lang || 'text').toLowerCase();
  return ALIAS[l] || l;
}

export function codeLangLabel(lang) {
  const l = normalizeLang(lang);
  const found = CODE_LANGS.find((x) => x.id === l);
  return found ? found.label : (lang || 'Plain text');
}

/* Generic C-like tokeniser over already-escaped source. Comments, strings and
   numbers first; identifiers are then classed as keyword / literal / call. */
function hlCLike(escd, cfg) {
  const parts = [];
  if (cfg.block) parts.push('\\/\\*[\\s\\S]*?\\*\\/');
  for (const c of cfg.line) {
    if (c === '//') parts.push('\\/\\/[^\\n]*');
    else if (c === '#') parts.push('#[^\\n]*');
    else if (c === '--') parts.push('--[^\\n]*');
  }
  const comment = parts.length ? `(${parts.join('|')})` : '((?!))'; // group 1 (never matches when empty)
  const string = '("(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\.|[^`\\\\])*`)'; // group 2
  const number = '(\\b0[xXbBoO][0-9a-fA-F_]+\\b|\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b)'; // group 3
  const ident = '([A-Za-z_$][\\w$]*)'; // group 4
  const re = new RegExp(`${comment}|${string}|${number}|${ident}`, 'g');
  return escd.replace(re, (m, com, str, num, id, off, full) => {
    if (com) return wrap('c-com', com);
    if (str) return wrap('c-str', str);
    if (num) return wrap('c-num', num);
    if (id) {
      const key = cfg.ci ? id.toLowerCase() : id;
      if (cfg.kw.has(key)) return wrap('c-key', id);
      if (LIT.has(id)) return wrap('c-bool', id);
      if (/^\s*\(/.test(full.slice(off + m.length))) return wrap('c-fn', id); // call / definition
      return id;
    }
    return m;
  });
}

/* CSS: comments, strings, at-rules, hex colours, numeric values with units,
   !important, and property names (identifier immediately before a colon). */
function hlCss(escd) {
  const re = /(\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(@[\w-]+)|(#[0-9a-fA-F]{3,8}\b)|(!important)|(\b\d[\d.]*(?:px|em|rem|ex|ch|vw|vh|vmin|vmax|fr|pt|pc|cm|mm|in|deg|rad|turn|s|ms|%)?\b)|([A-Za-z-]+)(?=\s*:)/g;
  return escd.replace(re, (m, com, str, at, hex, imp, num, prop) => {
    if (com) return wrap('c-com', com);
    if (str) return wrap('c-str', str);
    if (at) return wrap('c-key', at);
    if (hex) return wrap('c-num', hex);
    if (imp) return wrap('c-key', imp);
    if (num) return wrap('c-num', num);
    if (prop) return wrap('c-prop', prop);
    return m;
  });
}

/* Markup (HTML/XML/SVG): comments, then tags with their attribute names and
   quoted values. Operates on escaped text, so tags read as `&lt;…&gt;`. */
function hlMarkup(escd) {
  const re = /(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([\w:-]+)((?:"[^"]*"|'[^']*'|[^&])*?)(\/?&gt;)/g;
  return escd.replace(re, (m, com, open, name, attrs, close) => {
    if (com) return wrap('c-com', com);
    const a = attrs.replace(
      /([\w:-]+)(\s*=\s*)("[^"]*"|'[^']*')/g,
      (mm, an, eq, val) => wrap('c-attr', an) + eq + wrap('c-str', val)
    );
    return wrap('c-punc', open) + wrap('c-tag', name) + a + wrap('c-punc', close);
  });
}

/* Highlight `src` for `lang`, returning an HTML string. Unknown languages fall
   through to escaped plain text. */
export function codeHighlight(src, lang) {
  const code = src || '';
  const l = normalizeLang(lang);
  if (l === 'html') return hlMarkup(esc(code));
  if (l === 'css') return hlCss(esc(code));
  const cfg = CFG[l];
  return cfg ? hlCLike(esc(code), cfg) : esc(code);
}
