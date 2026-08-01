import { Link } from "react-router-dom";
import { visiblePosts, formatDate } from "../data/writing";
import { blurOnPointerClick } from "./ui";

/* WRITING on the home page — the three most recent entries and a way into the
   archive. The same contents-entry row the archive uses (.leaders: title, dotted
   leaders, date), so opening /writing shows more of what is already here rather
   than something new.
 *
 * Only the manifest is read — frontmatter, emitted at build time by
 * vite-plugin-writing-index.js. No post's text is in this chunk. */

const RECENT = 3;

const Writing = () => {
  const recent = visiblePosts.slice(0, RECENT);
  /* Nothing to list, no section — not an empty heading. This is also what
     keeps a site whose posts are all drafts from shipping a WRITING heading
     over nothing: the manifest drops drafts in a build and keeps them in dev
     (vite-plugin-writing-index.js), so `visiblePosts` is empty in production
     and the section disappears, while it stays on screen while you write. */
  if (recent.length === 0) return null;

  return (
    <>
      <h2 id="writing" className="section-label reveal">
        Writing
      </h2>
      <p className="lede indent reveal max-w-measure text-muted">
        Notes on the tools I build and the systems behind them &mdash; how
        something was made, what it cost, and what I&rsquo;d do differently.
      </p>

      <ul className="indent reveal leaders max-w-measure">
        {recent.map((post) => (
          <li key={post.slug} className="leader">
            <Link
              to={`/writing/${post.slug}`}
              onClick={blurOnPointerClick}
              className="xref"
            >
              {post.title}
            </Link>
            <span className="leader__dots" aria-hidden="true" />
            {/* At the locator end of the row, not against the title: the tag is
                a fact about the entry's status, which is what that end of a
                contents row is for. It also stops a title and its mark being
                read as one phrase. `.leader`'s own gap spaces it either side. */}
            {post.draft && <span className="draft-tag">Draft</span>}
            <span className="leader__pg">{formatDate(post.date)}</span>
          </li>
        ))}
      </ul>

      {visiblePosts.length > RECENT && (
        <p className="note indent reveal">
          <Link to="/writing" onClick={blurOnPointerClick} className="xref">
            All {visiblePosts.length} entries
          </Link>
        </p>
      )}
    </>
  );
};

export default Writing;
