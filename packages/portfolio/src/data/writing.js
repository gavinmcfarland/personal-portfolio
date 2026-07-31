/* The writing section's data layer — the archive, a post's body, and the assets
   a post keeps beside it.
 *
 * Posts are markdown files under src/content/writing/. Nothing here is written
 * by hand, and nothing here reads the filesystem: all three imports below come
 * from vite-plugin-writing-index.js, which resolves the content directory at
 * dev-server start and at build time. Adding a post means adding a file.
 *
 *   default  — frontmatter only, in the first chunk (Home lists recent entries)
 *   bodies   — one lazy chunk per post: its markdown and its images together,
 *              fetched when that post is opened
 *
 * A draft is in both while developing — that is the point of writing one — and
 * in neither in a build: no manifest entry, no chunk, no asset. Its URL falls
 * through to Not Found the same way a draft project's does.
 *
 * See the plugin's header for why the content boundary lives there rather than
 * in an import.meta.glob here. */
import posts, { bodies } from "virtual:writing-index";
import { parseFrontmatter } from "../lib/frontmatter";

/* Every post the site is currently showing, newest first. */
export const visiblePosts = posts;

export function findPost(slug) {
  return visiblePosts.find((p) => p.slug === slug);
}

/* The neighbours of a post in the published order, for the See also foot of a
   post page. Newest first, so `previous` is the older entry — the one a reader
   moving backwards through the archive wants next. No wrap-around. */
export function neighbours(slug) {
  const i = visiblePosts.findIndex((p) => p.slug === slug);
  if (i === -1) return { previous: null, next: null };
  return {
    previous: visiblePosts[i + 1] || null,
    next: i > 0 ? visiblePosts[i - 1] : null,
  };
}

/* Fetch a post: its markdown source, and a resolver for the images beside it.
   Resolves to null for a post with no body, which can only happen if the
   manifest and the directory disagree — the page says so rather than throwing. */
export function loadPost(post) {
  const load = bodies[post.slug];
  if (!load) return Promise.resolve(null);
  return load().then(({ default: { text, assets } }) => ({
    // The raw file still carries its frontmatter, which the manifest already
    // holds — strip it here rather than leaving the renderer to meet a `---`
    // rule and a run of `key: value` paragraphs it would set as prose.
    text: parseFrontmatter(text).body,
    resolveAsset: assetResolver(assets),
  }));
}

/* Resolve a relative image path written in a post — `./diagram.svg` — to the
   hashed URL Vite emitted for it. Anything else (a root-relative path into
   public/, or an absolute URL) is passed straight through, so both styles work
   and a missing file shows as a broken image rather than vanishing. */
function assetResolver(assets) {
  return (src) => (src.startsWith("./") ? assets[src.slice(2)] || src : src);
}

/* ── Formatting ───────────────────────────────────────────────────
   Dates are ISO strings in frontmatter and stay strings everywhere else; these
   are the only two places they are read for display. Both are locale-fixed
   (en-GB) rather than following the visitor's, so the archive's column of dates
   is one shape rather than whatever each reader's machine prefers. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* "12 Jul 2026" — the long form, used at the head of a post. */
export function formatDate(iso) {
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return String(iso || "");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

/* "12 Jul" — the short form for the archive, where the year already heads the
   group the entry sits in. */
export function formatDayMonth(iso) {
  const [, m, d] = String(iso).split("-");
  if (!m || !d) return String(iso || "");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}

export function yearOf(iso) {
  return String(iso).slice(0, 4);
}
