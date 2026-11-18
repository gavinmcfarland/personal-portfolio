/* Everything the writing section knows about its own content, resolved from the
   content directory and served as the virtual module `virtual:writing-index`:
   the archive manifest, a lazy loader per post body, and the assets each post
   keeps beside it.
 *
 * Why a plugin rather than the `import.meta.glob` this obviously wants to be —
 * two reasons, and the second is the one that settled it.
 *
 * The manifest is imported by Home, and Home is the one page that ships with
 * the app (see the comment at the top of src/App.jsx). A glob that eagerly read
 * every post's markdown to get at its frontmatter would inline the full text of
 * every post I ever write into that first chunk, so a visitor who never opened
 * a post would still download all of them — a cost that grows with the archive
 * rather than with the page. Only frontmatter goes into the manifest: title,
 * date, summary, tags, a word count.
 *
 * And a glob matches files, not posts. It has no idea which of them are drafts,
 * so it emits a chunk for every one — which is how an unfinished post ends up
 * on the deployed site at a guessable URL, listed nowhere and readable by
 * anyone who looks. Because the import list is generated here instead, a draft
 * is simply not written into it: in a build it has no chunk, no asset and no
 * manifest entry, and there is nothing to find. `pnpm dev` gets the whole
 * directory, drafts included, which is the point of writing one.
 *
 * Two layouts are accepted under the content directory, and they mean the same
 * thing — the second is for a post with assets to keep beside it:
 *
 *   src/content/writing/a-post.md
 *   src/content/writing/a-post/index.md   (+ a-post/diagram.svg, …)
 *
 * The slug is the file name (or the directory name) either way, and it is what
 * the URL uses: /writing/a-post. A `_`-prefixed name is not a post at all — the
 * authoring guide in that directory is one.
 *
 * Fails loud but not fatal: a post missing a title or a date is reported as a
 * build warning and still listed, because a content mistake should not take the
 * site down. */
import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter, countWords } from "./src/lib/frontmatter.js";

/* Two virtual modules. The index is the archive — frontmatter for every post,
   and a lazy loader per post. Each loader points at that post's own module,
   which holds the one thing the archive must not: the text.

   The split is load-bearing rather than tidy. The index is imported by Home, so
   anything reachable from it statically is in the first chunk — and an image
   small enough for Vite to inline arrives there as a data URI, which is how a
   post's diagram ends up being downloaded by a visitor who never opened the
   post. Body and assets therefore sit behind the same dynamic import, and a
   post costs exactly one chunk, fetched when it is opened. */
const VIRTUAL_ID = "virtual:writing-index";
const RESOLVED_ID = "\0" + VIRTUAL_ID;
const POST_ID = "virtual:writing-post/";
const RESOLVED_POST_ID = "\0" + POST_ID;

/* Media a post can keep beside it and reference as `./diagram.svg`. */
const ASSET_TYPES = /\.(png|jpe?g|gif|svg|webp|avif|mp4|webm)$/i;

/* One entry per post. Everything here is serialisable — it ends up inside a
   `export default <JSON>`. */
function readPost(dir, file) {
  const raw = fs.readFileSync(path.join(dir, file), "utf8");
  const { data, body } = parseFrontmatter(raw);

  // `a-post/index.md` is the post `a-post`; `a-post.md` is too.
  const isIndex = path.basename(file) === "index.md";
  const slug = (isIndex ? path.dirname(file) : file.replace(/\.md$/, "")).replace(/\\/g, "/");

  const warnings = [];
  if (!data.title) warnings.push("no `title` in frontmatter");
  if (!data.date) warnings.push("no `date` in frontmatter");

  return {
    file,
    draft: data.draft === true,
    warnings: warnings.map((w) => `writing: ${file}: ${w}`),
    entry: {
      slug,
      title: data.title || slug,
      date: data.date || "",
      updated: data.updated || "",
      summary: data.summary || "",
      tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
      draft: data.draft === true,
      words: countWords(body),
    },
  };
}

/* Every post under the content root, one level of nesting deep — enough for the
   directory-per-post layout, and a floor on how lost a post can get. Returns
   paths relative to that root. */
function findPosts(root) {
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const item of fs.readdirSync(root, { withFileTypes: true })) {
    if (item.name.startsWith(".") || item.name.startsWith("_")) continue;
    if (item.isFile() && item.name.endsWith(".md")) out.push(item.name);
    else if (item.isDirectory() && fs.existsSync(path.join(root, item.name, "index.md"))) {
      out.push(`${item.name}/index.md`);
    }
  }
  return out;
}

/* The media sitting in a post's own directory, keyed the way a post references
   it: `./diagram.svg` → `<slug>/diagram.svg`. A flat post has no directory of
   its own and therefore no co-located assets — it uses public/ instead. */
function findAssets(root, file) {
  if (!file.includes("/")) return [];
  const dir = path.dirname(file);
  return fs
    .readdirSync(path.join(root, dir), { withFileTypes: true })
    .filter((item) => item.isFile() && ASSET_TYPES.test(item.name))
    .map((item) => `${dir}/${item.name}`);
}

/* ── Saving from the in-page editor (dev only) ─────────────────────────
   The post page's editor POSTs the whole post back — title, summary, body —
   with the source it was editing (`base`). The file is rewritten only if it is
   still exactly that source, so an edit made in a text editor meanwhile is
   reported as a conflict instead of being overwritten. */

/* A frontmatter value in the form parseFrontmatter reads back unchanged. It has
   no escapes, so a value is quoted with whichever mark it doesn't contain. */
function yamlScalar(value) {
  const v = String(value).replace(/\s*\n\s*/g, " ").trim();
  if (!v) return '""';
  const risky = /^[\s'"[\]{}>|*&!%@`#,?-]|: | #|^(?:true|false|null|~)$/.test(v);
  if (!risky) return v;
  if (!v.includes('"')) return `"${v}"`;
  if (!v.includes("'")) return `'${v}'`;
  return `"${v.replace(/"/g, "\u201D")}"`;
}

/* Set `key` in a frontmatter block's lines, in place if it's there, otherwise
   after `after` (or at the end). */
function setField(lines, key, value, after) {
  const line = `${key}: ${yamlScalar(value)}`;
  const at = lines.findIndex((l) => new RegExp(`^${key}\\s*:`).test(l));
  if (at !== -1) lines[at] = line;
  else {
    const anchor = lines.findIndex((l) => new RegExp(`^${after}\\s*:`).test(l));
    lines.splice(anchor === -1 ? lines.length : anchor + 1, 0, line);
  }
}

/* The post's new source: its frontmatter with title/summary updated (and every
   other line left exactly as written), then the new body. A field whose value
   didn't change keeps its original line, quoting and all. */
export function rewritePost(raw, { title, summary, body }) {
  const text = String(raw).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  const { data } = parseFrontmatter(text);
  const lines = match ? match[1].split("\n") : [];
  if (typeof title === "string" && title !== (data.title || "")) setField(lines, "title", title, "");
  if (typeof summary === "string" && summary !== (data.summary || "")) setField(lines, "summary", summary, "date");
  const head = lines.length ? `---\n${lines.join("\n")}\n---\n` : "";
  const tail = String(body).replace(/\s*$/, "\n");
  return head + tail;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

export function writingIndex({ dir = "src/content/writing" } = {}) {
  let root = process.cwd();
  let isBuild = false;
  const contentDir = () => path.resolve(root, dir);
  /* Files the editor just wrote, and what it wrote — see handleHotUpdate. */
  const selfWrites = new Map();

  /* Paths are written root-relative (`/src/content/…`) rather than as absolute
     filesystem paths: that is the one form Vite resolves the same way in the dev
     server and in a build, and a virtual module has no directory of its own for
     a relative path to resolve against. */
  const url = (file) => `/${path.posix.join(dir, file.replace(/\\/g, "/"))}`;

  /* One post's own module: its markdown, and the URLs of the media beside it,
     keyed as the post writes them (`./grid.svg` → `grid.svg`). */
  const loadPostModule = function (id) {
    const slug = id.slice(RESOLVED_POST_ID.length);
    const base = contentDir();
    const file = findPosts(base).find(
      (f) => (path.basename(f) === "index.md" ? path.dirname(f) : f.replace(/\.md$/, "")) === slug,
    );
    if (!file) return null;
    // Nothing in a build imports a draft's module — the index leaves it out —
    // but state the invariant here too, so it holds wherever the id came from.
    if (isBuild && readPost(base, file).draft) return null;

    this.addWatchFile(path.join(base, file));
    const media = findAssets(base, file);
    return [
      "/* Generated by vite-plugin-writing-index.js — do not edit. */",
      `import text from ${JSON.stringify(url(file) + "?raw")};`,
      ...media.map((f, i) => `import a${i} from ${JSON.stringify(url(f) + "?url")};`),
      "",
      "export default {",
      "  text,",
      `  assets: {\n${media
        .map((f, i) => `    ${JSON.stringify(path.posix.basename(f))}: a${i},`)
        .join("\n")}\n  },`,
      "};",
      "",
    ].join("\n");
  };

  return {
    name: "writing-index",

    configResolved(config) {
      root = config.root;
      isBuild = config.command === "build";
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      if (id.startsWith(POST_ID)) return "\0" + id;
      return null;
    },

    load(id) {
      if (id.startsWith(RESOLVED_POST_ID)) return loadPostModule.call(this, id);
      if (id !== RESOLVED_ID) return null;

      const base = contentDir();
      const posts = [];
      for (const file of findPosts(base)) {
        const post = readPost(base, file);
        post.warnings.forEach((w) => this.warn(w));
        // The one line that keeps unpublished work off the deployed site.
        if (post.draft && isBuild) continue;
        posts.push(post);
        this.addWatchFile(path.join(base, file));
      }

      // Newest first, and stable: two posts published on one day fall back to
      // the title, so the order never depends on the filesystem's.
      posts.sort((a, b) =>
        a.entry.date === b.entry.date
          ? a.entry.title.localeCompare(b.entry.title)
          : a.entry.date < b.entry.date
            ? 1
            : -1,
      );

      // Each loader is a static `import()` of that post's own virtual module, so
      // Rollup can see it and give the post a chunk of its own.
      const bodies = posts
        .map((p) => `  ${JSON.stringify(p.entry.slug)}: () => import(${JSON.stringify(POST_ID + p.entry.slug)}),`)
        .join("\n");

      return [
        "/* Generated by vite-plugin-writing-index.js — do not edit. */",
        `export default ${JSON.stringify(posts.map((p) => p.entry), null, 2)};`,
        "",
        `export const bodies = {\n${bodies}\n};`,
        "",
      ].join("\n");
    },

    /* A save from the in-page editor must not reload the page it was made
       on — the reload would throw away the cursor, and the page already shows
       the text. Vite would hot-update the post's `?raw` import on its own, so
       that is stopped here; the full reload below is stopped in `touched`. */
    handleHotUpdate({ file, read }) {
      if (!selfWrites.has(file)) return undefined;
      return read().then((text) => (text === selfWrites.get(file) ? [] : undefined));
    },

    /* Editing a post's frontmatter has to rebuild the manifest, and the manifest
       is a virtual module with no file of its own for the watcher to notice.
       Invalidate it by hand when anything in the content directory moves, then
       reload — the archive list, Home's recent entries and a post's own meta all
       read from it, so a partial update would leave them disagreeing.

       The exception is a file the editor just wrote: the manifest is still
       invalidated (the next load picks the new title up), but the page isn't
       reloaded. Home's list stays as it was until the next reload. */
    configureServer(server) {
      const base = contentDir();
      const touched = (file) => {
        if (!file.startsWith(base)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        if (selfWrites.has(file)) {
          let current = null;
          try { current = fs.readFileSync(file, "utf8"); } catch { /* unlinked */ }
          if (current === selfWrites.get(file)) return;
          selfWrites.delete(file);
        }
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.add(base);
      server.watcher.on("add", touched);
      server.watcher.on("unlink", touched);
      server.watcher.on("change", touched);

      /* POST { slug, base, title, summary, body, force? } → { ok, raw } or
         409 { ok: false, conflict: true } when the file is no longer `base`. */
      server.middlewares.use("/__writing/save", (req, res, next) => {
        if (req.method !== "POST") return next();
        res.setHeader("content-type", "application/json");
        const reply = (status, payload) => {
          res.statusCode = status;
          res.end(JSON.stringify(payload));
        };
        readBody(req).then((text) => {
          try {
            const { slug, base: expected, title, summary, body, force } = JSON.parse(text);
            if (typeof body !== "string") throw new Error("expected a `body` string");
            // The slug is looked up among the posts that exist, never joined
            // onto a path, so it can only ever name a post.
            const file = findPosts(base).find(
              (f) => (path.basename(f) === "index.md" ? path.dirname(f) : f.replace(/\.md$/, "")) === slug,
            );
            if (!file) return reply(404, { ok: false, error: `no post "${slug}"` });
            const target = path.join(base, file);
            const current = fs.readFileSync(target, "utf8");
            if (!force && current !== expected) return reply(409, { ok: false, conflict: true });
            const next = rewritePost(current, { title, summary, body });
            if (next !== current) {
              selfWrites.set(target, next);
              fs.writeFileSync(target, next);
              server.config.logger.info(`  writing saved → ${path.relative(root, target)}`);
            }
            reply(200, { ok: true, raw: next });
          } catch (err) {
            reply(400, { ok: false, error: String((err && err.message) || err) });
          }
        });
      });
    },
  };
}
