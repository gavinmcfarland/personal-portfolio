import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useEditMode } from "@gavinmcfarland/canvas/edit-surface";
import Seo from "../components/Seo";
import DocShell from "../components/DocShell";
import ArticleView from "../components/ArticleView";
import { renderMarkdown } from "../lib/markdown";
import { loadPost, neighbours } from "../data/writing";

/* The in-page editor — dev only. `import.meta.env.DEV` is a build-time
   constant, so in a build this is null and the import is dead code: neither the
   editor nor the canvas engine its Edit button comes from reaches the bundle.
   See src/components/ArticleEditor.jsx. */
const loadEditor = import.meta.env.DEV ? () => import("../components/ArticleEditor") : null;

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
  const [loaded, setLoaded] = useState(null); // { raw, data, text, resolveAsset }
  const [missing, setMissing] = useState(false);
  const [editor, setEditor] = useState(null); // the editor module, dev only
  const articleRef = useRef(null);

  /* The one Edit button switches this page and every canvas together. Only a
     dev server has an editor to switch to. */
  const [readOnly] = useEditMode();
  const editing = editor != null && !readOnly;

  // The title and summary as the post's own source has them, which the editor
  // may have changed since the manifest was built.
  const title = loaded?.data.title || post.title;
  const summary = loaded ? loaded.data.summary || "" : post.summary;

  /* No reset of the two states above when `post` changes: the route mounts this
     with `key={post.slug}`, so moving between posts is a remount and they start
     fresh on their own. */
  useEffect(() => {
    let live = true;
    /* On a dev server the editor arrives with the post, not after it, so the
       body's first paint is already the editor's tree (in view mode). Were it
       swapped in later — or on Edit — every block would remount: a flash, the
       reveal fade again, images fetched again. */
    Promise.all([loadPost(post), loadEditor?.()]).then(
      ([result, mod]) => {
        if (!live) return;
        if (result == null) setMissing(true);
        else {
          if (mod) setEditor(mod);
          setLoaded(result);
        }
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

  /* The body arrives after this mounts, so the shell's reveal observer has to
     scan again once it does — hence `revealKey`; see useReveal. */
  const revealKey = loaded;

  return (
    <DocShell revealKey={revealKey}>
      <Seo title={title} description={summary} type="article" />

      {/* The article's own root: a pointerdown inside it makes this page — not
          a canvas still mounted behind the overlay — the surface the Edit
          button belongs to. */}
      <div ref={articleRef}>
        {editor && loaded ? (
          <>
            <editor.ArticleDock rootRef={articleRef} />
            <editor.default
              post={post}
              loaded={loaded}
              editing={editing}
              onChange={(patch) => setLoaded((l) => ({ ...l, ...patch }))}
            />
          </>
        ) : (
          <ArticleView post={post} title={title} summary={summary} headings={headings} missing={missing}>
            {nodes}
          </ArticleView>
        )}
      </div>

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
