import { formatDate } from "../data/writing";

/* A post's masthead, contents list and body — the page as it is read.
 *
 * One component for both modes. In a build it is all there is; on a dev server
 * the editor (ArticleEditor.jsx) renders this same component in view mode and
 * in edit mode alike, so pressing Edit changes props, not the tree: every
 * element that isn't being edited keeps its DOM node, its size and its place.
 * Nothing remounts, nothing re-fades, no image is fetched again.
 *
 * The editing hooks are all optional and inert when absent:
 *   editable        title and summary become contentEditable in place
 *   onTitle/onSummary  called with the new text when the field is left
 *   fieldKey        remounts the two fields after a commit or an undo, so React
 *                   never reconciles against a text node the browser replaced
 *   status          a word at the end of the meta line (saving…, saved)
 *   bodyProps       spread onto .writing-body (the editor's click handler)
 *   after           anything set after the body */
export default function ArticleView({
  post,
  title,
  summary,
  headings,
  missing,
  children,
  editable = false,
  onTitle,
  onSummary,
  fieldKey = 0,
  status = null,
  bodyProps,
  after = null,
  className = "",
}) {
  // A contents list earns its place once a post has enough sections to need
  // one; below that it is a list of the two headings already on screen.
  const contents = headings.length >= 3 ? headings : [];

  return (
    <div className={className}>
      {/* The masthead, not a section body: flush to the content column, with no
          NAME label over it. The label would be announcing what the next line
          already says, and hanging a title at the indent stop makes the page
          open as though it were the body of a section that isn't there — the
          same reasoning as the home page's own opening block (Intro.jsx). */}
      <header className="pt-(--sp-8)">
        <h1
          key={`t${fieldKey}`}
          className="wordmark text-pretty"
          {...(editable && inPlace(onTitle, "Title"))}
        >
          {title}
        </h1>
        {(summary || editable) && (
          <p
            key={`s${fieldKey}`}
            className="max-w-measure text-pretty text-muted"
            {...(editable && inPlace(onSummary, "Summary"))}
          >
            {summary}
          </p>
        )}
        <PostMeta post={post} status={status} />
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
        <div className="writing-body" {...bodyProps}>
          {children}
        </div>
      )}
      {after}
    </div>
  );
}

/* A masthead line made editable where it stands: the same element, the same
   type, only now it takes a caret. Plain text only — a title has no markup. The
   text is read back when the field is left, not on every keystroke, so React
   never re-renders it under the caret. */
function inPlace(onCommit, placeholder) {
  return {
    contentEditable: "plaintext-only",
    suppressContentEditableWarning: true,
    spellCheck: true,
    "data-placeholder": placeholder,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
    onBlur: (e) => onCommit?.(e.currentTarget.textContent.replace(/\s+/g, " ").trim()),
  };
}

/* The one meta line: when it was written, how long it is, and what it is
   about. Set in the page-footer register — the quietest on the site — because
   it is apparatus, not the document. */
export function PostMeta({ post, status }) {
  return (
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
      {status && (
        <>
          <Dot />
          {status}
        </>
      )}
    </p>
  );
}

export const Dot = () => (
  <span className="px-[0.45em] text-faint" aria-hidden="true">
    ·
  </span>
);
