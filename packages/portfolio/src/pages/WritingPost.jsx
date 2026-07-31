import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import DocShell from "../components/DocShell";
import { renderMarkdown } from "../lib/markdown";
import { formatDate, loadPost, neighbours } from "../data/writing";

/* A post, set as a man page.
 *
 * The furniture is the site's: NAME and the wordmark open it, the body's own
 * `##` headings are section heads at the same rank as the ones on the home
 * page, everything hangs at the same indent stop, and SEE ALSO closes it. What
 * the markdown renderer emits (src/lib/markdown.jsx) is that furniture — this
 * page is the frame around it.
 *
 * The body arrives in two steps: the route chunk first, then the post's own
 * markdown. Nothing is drawn in between. The panel is already sliding when this
 * mounts, and a spinner inside it would announce a wait that is normally over
 * before it could finish appearing — the same reasoning as the empty Suspense
 * fallback in App.jsx. */
export default function WritingPost({ post }) {
  const [loaded, setLoaded] = useState(null); // { text, resolveAsset }
  const [missing, setMissing] = useState(false);

  /* No reset of the two states above when `post` changes: the route mounts this
     with `key={post.slug}`, so moving between posts is a remount and they start
     fresh on their own. */
  useEffect(() => {
    let live = true;
    loadPost(post).then(
      (result) => {
        if (!live) return;
        if (result == null) setMissing(true);
        else setLoaded(result);
      },
      () => live && setMissing(true),
    );
    return () => {
      live = false;
    };
  }, [post]);

  /* Moving between posts keeps the route panel mounted, so its scroll offset
     would carry over and drop the reader into the middle of the next post.
     (Project pages never needed this — they lock to the viewport and don't
     scroll.) The panel is the scroller; below `lg` it is the whole overlay. */
  useEffect(() => {
    document.querySelector(".route-panel")?.scrollTo({ top: 0 });
  }, [post.slug]);

  const { nodes, headings } = useMemo(
    () =>
      loaded == null
        ? { nodes: null, headings: [] }
        : renderMarkdown(loaded.text, { resolveAsset: loaded.resolveAsset }),
    [loaded],
  );

  const { previous, next } = neighbours(post.slug);
  // A contents list earns its place once a post has enough sections to need
  // one; below that it is a list of the two headings already on screen.
  const contents = headings.length >= 3 ? headings : [];

  /* The body arrives after this mounts, so the shell's reveal observer has to
     scan again once it does — hence `revealKey`; see useReveal. */
  return (
    <DocShell revealKey={loaded}>
      <Seo title={post.title} description={post.summary} type="article" />

      {/* The masthead, not a section body: flush to the content column, with no
          NAME label over it. The label would be announcing what the next line
          already says, and hanging a title at the indent stop makes the page
          open as though it were the body of a section that isn't there — the
          same reasoning as the home page's own opening block (Intro.jsx). */}
      <header className="pt-(--sp-8)">
        <h1 className="wordmark text-pretty">{post.title}</h1>
        {post.summary && (
          <p className="max-w-measure text-pretty text-muted">{post.summary}</p>
        )}
        {/* The one meta line: when it was written, how long it is, and what it
            is about. Set in the page-footer register — the quietest on the site
            — because it is apparatus, not the document. */}
        <p className="post-meta mt-(--sp-2)">
          <span>{formatDate(post.date)}</span>
          {post.updated && (
            <>
              <Dot />
              <span>updated {formatDate(post.updated)}</span>
            </>
          )}
          {post.words > 0 && (
            <>
              <Dot />
              <span>{post.words.toLocaleString("en-GB")} words</span>
            </>
          )}
          {post.tags.length > 0 && (
            <>
              <Dot />
              <span>{post.tags.join(", ")}</span>
            </>
          )}
          {post.draft && (
            <>
              <Dot />
              <span className="text-accent">draft</span>
            </>
          )}
        </p>
      </header>

      {contents.length > 0 && (
        <>
          <h2 className="section-label reveal">Contents</h2>
          {/* The prose measure, not the narrow one. A contents list is a column
              of the same headings that appear in the body below it, so setting
              it narrower puts its right margin — and the leaders running out to
              it — on an edge nothing else in the document shares. */}
          <ul className="indent reveal leaders max-w-measure">
            {contents.map((h, n) => (
              <li key={h.id} className="leader">
                <a href={`#${h.id}`} className="xref">
                  {h.text}
                </a>
                <span className="leader__dots" aria-hidden="true" />
                <span className="leader__pg">
                  <span className="sec">§</span>
                  {n + 1}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {missing ? (
        <>
          <h2 className="section-label">Description</h2>
          <p className="indent max-w-measure text-muted">
            This entry&rsquo;s source could not be loaded.
          </p>
        </>
      ) : (
        <div className="writing-body">{nodes}</div>
      )}

      <h2 className="section-label reveal">See also</h2>
      <p className="indent reveal">
        <Link to="/writing" className="xref">
          writing
        </Link>
        {previous && (
          <>
            <span className="text-faint">, </span>
            <Link to={`/writing/${previous.slug}`} className="xref">
              {previous.title.toLowerCase()}
            </Link>
            <span className="xref__sec"> (previous)</span>
          </>
        )}
        {next && (
          <>
            <span className="text-faint">, </span>
            <Link to={`/writing/${next.slug}`} className="xref">
              {next.title.toLowerCase()}
            </Link>
            <span className="xref__sec"> (next)</span>
          </>
        )}
      </p>

      <p className="colophon reveal">© {new Date().getFullYear()} Gavin McFarland</p>
    </DocShell>
  );
}

const Dot = () => (
  <span className="px-[0.45em] text-faint" aria-hidden="true">
    ·
  </span>
);
