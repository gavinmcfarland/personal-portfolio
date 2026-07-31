import { Fragment } from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import DocShell from "../components/DocShell";
import { blurOnPointerClick } from "../components/ui";
import { visiblePosts, formatDayMonth, yearOf } from "../data/writing";

/* The archive — every post, newest first, grouped by year.
 *
 * The row is the printed manual's contents entry, which the site already sets
 * (.leaders, from CONTENTS on /backup): the title, a run of dotted leaders, and
 * the date where the page locator would sit. The year is the sub-head over each
 * run, so an entry's own date only has to carry the day and month.
 *
 * The hover wash and the -mx-4 bleed are the project list's, deliberately: an
 * entry here and a project there are the same kind of target and should react
 * the same way. */

/* Group the flat, already-sorted list into [year, posts] pairs without
   re-sorting — the manifest's order is the published order. */
function byYear(posts) {
  const groups = [];
  for (const post of posts) {
    const year = yearOf(post.date) || "Undated";
    const last = groups[groups.length - 1];
    if (last && last[0] === year) last[1].push(post);
    else groups.push([year, [post]]);
  }
  return groups;
}

export default function WritingIndex() {
  const groups = byYear(visiblePosts);
  const count = visiblePosts.length;

  return (
    <DocShell>
      <Seo
        title="Writing"
        description="Notes on the tools I build and the systems behind them — working notes, kept in public."
      />

      {/* Flush, and with no NAME label — the masthead treatment a post takes,
          so the two pages of this section open the same way. */}
      <header className="pt-(--sp-8)">
        <h1 className="wordmark">writing</h1>
        <p className="max-w-measure text-pretty text-muted">
          Notes on the tools I build and the systems behind them &mdash; how
          something was made, what it cost, and what I&rsquo;d do differently.
          Working notes, kept in public.
        </p>
      </header>

      {count === 0 ? (
        <>
          <h2 className="section-label reveal">Entries</h2>
          <p className="indent reveal max-w-measure text-muted">
            Nothing published yet.
          </p>
        </>
      ) : (
        groups.map(([year, entries]) => (
          /* A fragment, not a wrapper element: a <div> around each group would
             make every year heading a `:first-child`, and `.section-label`
             zeroes its top margin there (that rule is for a heading opening its
             own block, like NAME above). The groups have to be siblings in the
             page's own flow for the section rhythm to reach them — the same
             flat structure the home page uses. */
          <Fragment key={year}>
            {/* The year heads its run at section rank — it is the only division
                the archive has, and a sub-label under no section head would be
                a rank hanging off nothing. */}
            <h2 className="section-label reveal tnum">{year}</h2>
            <div className="indent reveal">
              {entries.map((post) => (
                <Link
                  key={post.slug}
                  to={`/writing/${post.slug}`}
                  onClick={blurOnPointerClick}
                  className="group -mx-4 block px-4 py-(--sp-2) transition-colors duration-150 hover:bg-surface"
                >
                  <span className="leader max-w-measure">
                    <span className="text-ink transition-colors duration-150 group-hover:text-accent">
                      {post.title}
                    </span>
                    {post.draft && <span className="draft-tag">Draft</span>}
                    <span className="leader__dots" aria-hidden="true" />
                    <span className="leader__pg">{formatDayMonth(post.date)}</span>
                  </span>
                  {post.summary && (
                    <span className="mt-(--sp-1) block max-w-measure pl-(--stop) text-3 text-pretty text-muted">
                      {post.summary}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </Fragment>
        ))
      )}

      {count > 0 && (
        <p className="note indent reveal">
          {count} {count === 1 ? "entry" : "entries"}.
        </p>
      )}

      <p className="colophon reveal">© {new Date().getFullYear()} Gavin McFarland</p>
    </DocShell>
  );
}
