import CodeBlock from "../components/CodeBlock";

/* Markdown → React, for the writing section.
 *
 * Not a general-purpose markdown library, and not trying to be one. It is the
 * translation layer between how a post is written and how this site sets a
 * document, so its whole job is to emit the man-page furniture that already
 * exists in app.css rather than the generic tags a library would give:
 *
 *   ##  heading      → .section-label   flush to the column, uppercase, tracked
 *   ### heading      → .sub-label       the rank below it
 *   paragraph        → .indent          hung at the three-character stop
 *   > quote          → .aside           hairline rule at the stop
 *   ```code```       → <CodeBlock>      hairline panel, canvas tokeniser
 *   ![alt](src "c")  → <figure>         numbered "Fig. n — c" caption
 *   [^1] / [^1]:     → .fn-ref/.footnotes  the site's existing footnote set
 *   [text](url)      → .xref            the cross-reference link
 *
 * The consequence is the point: a post is a man page. Its `##` headings are the
 * same rank as EXAMPLES and BACKGROUND on the home page, and its body hangs off
 * them at the same stop, so a post and the front page are visibly the same
 * document set rather than a site with a blog bolted to it.
 *
 * The supported subset is documented in src/content/writing/README.md. Anything
 * outside it renders as the literal text it is — there is no HTML passthrough,
 * by design: nothing an author writes reaches the DOM as markup. (The one
 * `dangerouslySetInnerHTML` in the pipeline is in <CodeBlock>, on source the
 * tokeniser has already escaped.) */

/* ── Inline ───────────────────────────────────────────────────────
   A left-to-right scanner rather than a chain of .replace() calls, because a
   chain can't stop itself reaching inside a code span — `**` in `` `a ** b` ``
   would come out bold. Here a code span is consumed whole, and only the text
   between markers is scanned again. */

const RULES = [
  // Backslash escape — one character, taken literally.
  { re: /^\\([\\`*_[\]()#!>-])/, node: (m) => m[1] },
  // Inline code. Escaping is React's, not ours: this is a text child.
  { re: /^`([^`]+)`/, node: (m, ctx, key) => <code key={key} className="icode">{m[1]}</code> },
  // Image, inline (a paragraph that is only an image becomes a figure instead —
  // see the block walker).
  {
    re: /^!\[([^\]]*)\]\(\s*(\S+?)(?:\s+"([^"]*)")?\s*\)/,
    node: (m, ctx, key) => (
      <img key={key} className="icon-img" src={ctx.resolveAsset(m[2])} alt={m[1]} loading="lazy" />
    ),
  },
  // Footnote reference. Numbered by order of first appearance (see numberNotes).
  {
    re: /^\[\^([^\]]+)\]/,
    node: (m, ctx, key) => {
      const n = ctx.notes[m[1]];
      if (!n) return m[0]; // a reference with no definition stays as written
      return (
        <a key={key} href={`#fn-${n}`} className="fn-ref" aria-label={`Footnote ${n}`}>
          {n}
        </a>
      );
    },
  },
  // Link. External ones open in a new tab; a root-relative one is an in-site
  // link and is left to the router-less anchor it is (posts link to /writing
  // and to project pages, both of which the SPA rewrite serves).
  {
    re: /^\[([^\]]+)\]\(\s*(\S+?)(?:\s+"([^"]*)")?\s*\)/,
    node: (m, ctx, key) => {
      const external = /^[a-z]+:/i.test(m[2]);
      return (
        <a
          key={key}
          href={m[2]}
          title={m[3] || undefined}
          className="xref"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : null)}
        >
          {inline(m[1], ctx, `${key}-`)}
        </a>
      );
    },
  },
  {
    re: /^(\*\*|__)(?=\S)([\s\S]+?)\1/,
    guard: underscoreNotInsideWord,
    node: (m, ctx, key) => (
      <strong key={key} className="font-bold text-ink">
        {inline(m[2], ctx, `${key}-`)}
      </strong>
    ),
  },
  {
    re: /^(\*|_)(?=\S)([^*_]+?)\1/,
    guard: underscoreNotInsideWord,
    node: (m, ctx, key) => <em key={key}>{inline(m[2], ctx, `${key}-`)}</em>,
  },
];

/* Underscore emphasis only counts at a word boundary, so `snake_case_names` and
   `--flag_name` in running prose stay as they were typed instead of coming out
   half-italic. Asterisks carry no such risk and are left alone. */
function underscoreNotInsideWord(m, prev) {
  return m[1][0] !== "_" || !/\w/.test(prev);
}

/* Characters that can open a rule above — everything else is plain text and is
   swallowed in one run, so the scanner walks the string roughly once. */
const MARKERS = /[\\`![*_]/;

function inline(text, ctx, keyPrefix = "i") {
  const out = [];
  let rest = text;
  let key = 0;
  let prev = ""; // the character before the scan position, for the guards above

  const advance = (n) => {
    prev = rest[n - 1] || prev;
    rest = rest.slice(n);
  };

  while (rest) {
    let matched = false;
    for (const rule of RULES) {
      const m = rule.re.exec(rest);
      if (!m || (rule.guard && !rule.guard(m, prev))) continue;
      out.push(rule.node(m, ctx, `${keyPrefix}${key++}`));
      advance(m[0].length);
      matched = true;
      break;
    }
    if (matched) continue;

    // No rule fired at this position: take the run of text up to the next
    // character that could start one (always at least one character, so a
    // marker that didn't match — a lone `*` — can't spin the loop).
    const next = rest.slice(1).search(MARKERS);
    const len = next === -1 ? rest.length : next + 1;
    out.push(rest.slice(0, len));
    advance(len);
  }

  return out;
}

/* ── Blocks ───────────────────────────────────────────────────────── */

const FENCE = /^(?:```|~~~)\s*([\w+#-]*)\s*(.*)$/;
const HEADING = /^(#{1,6})\s+(.+?)\s*#*$/;
const RULE = /^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
const QUOTE = /^ {0,3}> ?/;
const BULLET = /^ {0,3}[-*+]\s+/;
const NUMBER = /^ {0,3}\d+[.)]\s+/;
const NOTE_DEF = /^\[\^([^\]]+)\]:\s*([\s\S]*)$/;
const ONLY_IMAGE = /^!\[([^\]]*)\]\(\s*(\S+?)(?:\s+"([^"]*)")?\s*\)$/;

/* A heading reduced to plain text — markup delimiters removed rather than
   rendered. The contents list is a locator, not a passage: it should read the
   heading's words, and it can't carry the heading's own inline markup because
   it is set as a link. Without this, a heading like "The trap in a `ch` token"
   arrives in the contents with its backticks showing. */
function plainText(md) {
  return md
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(\*|_)(.+?)\1/g, "$2")
    .replace(/\\([\\`*_[\]()#!>-])/g, "$1");
}

/* An id for a heading, so the contents list at the top of a post has something
   to link to. Suffixed on collision, since two sections can share a name. */
function headingId(text, seen) {
  const base =
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-") || "section";
  const n = (seen[base] = (seen[base] || 0) + 1);
  return n === 1 ? base : `${base}-${n}`;
}

/* Number the footnotes by order of first *reference*, which is the order a
   reader meets them, and drop any that are defined but never cited. Done in a
   pass before rendering because a reference has to know its own number at the
   moment it is rendered, and the definition may come pages later. */
function numberNotes(lines) {
  const notes = {};
  let n = 0;
  let fenced = false;
  for (const line of lines) {
    // A code sample is source, not prose — `[^0-9]` in a regex is not a citation.
    if (/^(?:```|~~~)/.test(line)) fenced = !fenced;
    if (fenced || NOTE_DEF.test(line)) continue;
    for (const m of line.matchAll(/\[\^([^\]]+)\]/g)) {
      if (!notes[m[1]]) notes[m[1]] = ++n;
    }
  }
  return notes;
}

/* `title="…"` on a fence line, for a sample that names its file. */
function fenceTitle(attrs) {
  const m = /title\s*=\s*"([^"]*)"|title\s*=\s*'([^']*)'|title\s*=\s*(\S+)/.exec(attrs || "");
  return m ? m[1] ?? m[2] ?? m[3] : "";
}

/* Render a post body. Returns the elements and the `##` headings, which the post
   page turns into its contents list. */
export function renderMarkdown(source, { resolveAsset = (s) => s } = {}) {
  const lines = String(source).replace(/\r\n?/g, "\n").split("\n");
  const ctx = { resolveAsset, notes: numberNotes(lines) };
  const seenIds = {};
  const headings = [];
  const definitions = {}; // footnote id → its text
  const nodes = [];
  let i = 0;
  let key = 0;

  const push = (node) => nodes.push(node);

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // ── Fenced code ──
    const fence = FENCE.exec(line);
    if (fence) {
      const closer = line.startsWith("~~~") ? /^~~~/ : /^```/;
      const body = [];
      i++;
      while (i < lines.length && !closer.test(lines[i])) body.push(lines[i++]);
      i++; // the closing fence (or the end of the file, if it was left open)
      push(
        <CodeBlock
          key={key++}
          className="indent reveal max-w-measure-wide"
          code={body.join("\n").replace(/\n+$/, "")}
          lang={fence[1] || "text"}
          title={fenceTitle(fence[2])}
        />,
      );
      continue;
    }

    // ── Headings ──
    const heading = HEADING.exec(line);
    if (heading) {
      const depth = heading[1].length;
      const text = heading[2];
      // Two ranks, not six. `#`/`##` are the section head — the same rank the
      // home page's own headings take — and everything deeper is the sub-head
      // beneath it. A document set in one size at one weight has exactly two
      // ranks available before rank stops being legible as rank; inventing a
      // third here would only be a fourth near-identical bold line.
      if (depth <= 2) {
        const plain = plainText(text);
        const id = headingId(plain, seenIds);
        headings.push({ id, text: plain });
        push(
          <h2 key={key++} id={id} className="section-label reveal">
            {inline(text, ctx, `h${key}-`)}
          </h2>,
        );
      } else {
        push(
          <h3 key={key++} className="sub-label indent">
            {inline(text, ctx, `h${key}-`)}
          </h3>,
        );
      }
      i++;
      continue;
    }

    // ── Thematic break ──
    if (RULE.test(line)) {
      push(<hr key={key++} className="prose-rule indent max-w-measure" />);
      i++;
      continue;
    }

    // ── Footnote definition ──
    const note = NOTE_DEF.exec(line);
    if (note) {
      const body = [note[2]];
      i++;
      // A definition continues while the following lines are indented under it.
      while (i < lines.length && /^\s{2,}\S/.test(lines[i])) body.push(lines[i++].trim());
      definitions[note[1]] = body.join(" ").trim();
      continue;
    }

    // ── Blockquote ──
    if (QUOTE.test(line)) {
      const body = [];
      while (i < lines.length && QUOTE.test(lines[i])) body.push(lines[i++].replace(QUOTE, ""));
      push(
        <blockquote key={key++} className="aside indent reveal max-w-measure">
          {body
            .join("\n")
            .split(/\n{2,}/)
            .map((para, n) => (
              <p key={n}>{inline(para.replace(/\n/g, " "), ctx, `q${key}-${n}-`)}</p>
            ))}
        </blockquote>,
      );
      continue;
    }

    // ── Lists ──
    // One level, no nesting: a nested list in a document set at one size reads
    // as an outline, and this site already has a primitive for outlines
    // (.man-outline). A post that wants one can use a table of its own.
    const ordered = NUMBER.test(line);
    if (ordered || BULLET.test(line)) {
      const marker = ordered ? NUMBER : BULLET;
      const items = [];
      while (i < lines.length && marker.test(lines[i])) {
        const item = [lines[i++].replace(marker, "")];
        // Wrapped and indented continuation lines belong to the item above.
        while (i < lines.length && lines[i].trim() && !marker.test(lines[i]) && !FENCE.test(lines[i])) {
          item.push(lines[i++].trim());
        }
        items.push(item.join(" "));
      }
      const List = ordered ? "ol" : "ul";
      push(
        <List
          key={key++}
          /* The markers are drawn by CSS (see .prose-list), which means
             `list-style: none` — and WebKit drops list semantics from a list
             styled that way. `role="list"` puts them back. */
          role="list"
          className={`prose-list${ordered ? " prose-list--ol" : ""} indent max-w-measure`}
        >
          {items.map((item, n) => (
            <li key={n}>{inline(item, ctx, `l${key}-${n}-`)}</li>
          ))}
        </List>,
      );
      continue;
    }

    // ── Paragraph, or a figure ──
    const para = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !HEADING.test(lines[i]) &&
      !FENCE.test(lines[i]) &&
      !RULE.test(lines[i]) &&
      !QUOTE.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !NUMBER.test(lines[i]) &&
      !NOTE_DEF.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    const text = para.join("\n").trim();

    // An image on a line of its own is a plate, not a word in a sentence: it
    // gets a figure, and its title text (if any) becomes the caption, numbered
    // by the CSS counter in app.css.
    const image = ONLY_IMAGE.exec(text);
    if (image) {
      push(
        <figure key={key++} className="fig indent reveal max-w-measure-wide">
          <img src={resolveAsset(image[2])} alt={image[1]} loading="lazy" decoding="async" />
          {image[3] && <figcaption>{inline(image[3], ctx, `f${key}-`)}</figcaption>}
        </figure>,
      );
      continue;
    }

    push(
      <p key={key++} className="indent max-w-measure text-pretty text-muted">
        {inline(text.replace(/\n/g, " "), ctx, `p${key}-`)}
      </p>,
    );
  }

  // ── Footnotes, at the foot of the document ──
  const cited = Object.entries(ctx.notes).sort((a, b) => a[1] - b[1]);
  if (cited.length) {
    push(
      <div key="footnotes" className="footnotes indent reveal max-w-measure">
        <div className="footnotes__rule" aria-hidden="true" />
        {cited.map(([id, n]) => (
          <p key={id} id={`fn-${n}`} className="footnote">
            <sup>{n}</sup>
            {inline(definitions[id] || "", ctx, `fn${n}-`)}
          </p>
        ))}
      </div>,
    );
  }

  return { nodes, headings };
}
