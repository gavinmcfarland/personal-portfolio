/* A frontmatter reader for the writing section — a deliberately small subset of
   YAML, and no dependency.
 *
 * It runs in two places and must agree with itself in both: in Node, where
 * vite-plugin-writing-index.js reads every post at build time to emit the
 * archive manifest, and in the browser, where a post's own body is parsed after
 * its markdown is fetched. One module, imported by both, so the two can't drift.
 *
 * What is supported, and nothing else:
 *
 *   title: Dithering video in the browser     — a bare scalar, trailing # kept
 *   title: "A colon: in the title"            — quoted, either quote mark
 *   date: 2026-07-12                          — left as the string it is
 *   draft: true                               — true/false become booleans
 *   tags: [tools, figma]                      — inline sequence
 *   tags:                                     — or a block sequence
 *     - tools
 *     - figma
 *
 * No nesting, no anchors, no multi-line scalars, no comments. A post that wants
 * any of those wants a different file format. */

/* Coerce one scalar. Everything the site actually branches on (`draft`) is a
   boolean; dates stay strings because they are only ever formatted or compared
   lexically, and turning them into Date objects here would make the manifest
   (which is serialised to JSON by the plugin) lossy. */
function scalar(raw) {
  const v = raw.trim();
  if (!v) return "";
  const quoted = /^(['"])([\s\S]*)\1$/.exec(v);
  if (quoted) return quoted[2];
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null" || v === "~") return null;
  return v;
}

/* An inline sequence: `[a, b, "c, d"]`. Split on commas that aren't inside
   quotes so a quoted item may contain one. */
function sequence(raw) {
  const inner = raw.trim().slice(1, -1);
  if (!inner.trim()) return [];
  return inner
    .match(/(?:"[^"]*"|'[^']*'|[^,])+/g)
    .map((item) => scalar(item))
    .filter((item) => item !== "");
}

/* Split a markdown source into its frontmatter block and the body beneath it.
   A file with no frontmatter is all body — the caller decides whether that is
   an error (the plugin warns; the renderer doesn't care). */
export function parseFrontmatter(source) {
  const text = String(source)
    .replace(/^\uFEFF/, "") // a byte-order mark, if an editor left one
    .replace(/\r\n?/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) return { data: {}, body: text };

  const data = {};
  const lines = match[1].split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith("#")) continue;

    const pair = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!pair) continue;
    const [, key, rest] = pair;

    // A key with nothing after the colon opens a block sequence — consume the
    // `- item` lines that follow it. An empty value with no list under it is
    // just an empty string, which is what `scalar("")` returns anyway.
    if (!rest.trim()) {
      const items = [];
      while (i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) {
        items.push(scalar(lines[++i].replace(/^\s*-\s+/, "")));
      }
      data[key] = items.length ? items : "";
      continue;
    }

    data[key] = rest.trim().startsWith("[") ? sequence(rest) : scalar(rest);
  }

  return { data, body: text.slice(match[0].length) };
}

/* A rough word count for the manifest — the "1,240 words" that closes a post's
   meta line. Fenced code, image/link targets and markup punctuation are dropped
   first so the number describes the prose rather than the source. Rough is the
   point: it is a sense of length, not a metric anybody should tune. */
export function countWords(body) {
  const prose = String(body)
    .replace(/```[\s\S]*?```/g, "") // fenced code
    .replace(/`[^`]*`/g, "") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → their text
    .replace(/[#>*_~`|-]/g, " ");
  const words = prose.match(/[\p{L}\p{N}'’-]+/gu);
  return words ? words.length : 0;
}
