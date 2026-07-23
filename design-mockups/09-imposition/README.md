# 09 · Imposition

Many page types imposed on one form. Imposition is the press-room craft of
arranging different pages onto one sheet so they all print together — which is
the brief here: nine templates (landing, journal, article, project, gallery,
specimen, archive, contact, canvas board) that share one flat type size, one
rail, five bold flats on muted cream stock, and nothing else.

| File | What it is |
| --- | --- |
| `system.css` | The whole design system — §1 tokens · §2 primitives · §3 components · §4 board |
| `system.js` | Theme, construction grid (press **G**), the rail, and `renderProjects()` — one array, four treatments |
| `data.js` | `window.DATA` — the single content source every sheet renders from |
| `board.js` | The pan/zoom canvas engine, drawn from the same classes as the document pages |
| `index.html` | 01 · Landing — inverted masthead, ruled work table, editorial rows, fact bento |
| `journal.html` | 02 · Blog list — year-grouped ledger, one pinned note in board vocabulary |
| `post.html` | 03 · Article — asymmetric 8+4 spread, marginalia, the system's only pull-quote |
| `project.html` | 04 · Project — 7/5 offset hero, spec table, build-log folds, static board figure |
| `gallery.html` | 05 · Gallery — bento plates with kind-filter tabs and hatched reserved cells |
| `specimen.html` | 06 · Specimen — palette, type, texture, and the four treatments tab-switched in place |
| `archive.html` | 07 · Everything — pages + projects + posts in one table, maximum density, zero air |
| `contact.html` | 08 · Contact — channel rows, availability table, folds, the form (one of two buttons) |
| `board.html` | 09 · Canvas — full-bleed, always dark, flat notes on a dot grid |

Open any file directly. No build step.

## The doctrine

1. **No curves** — `border-radius: 0` globally, never overridden.
2. **No shadows** — not one `box-shadow` in the file; borders and fills hold
   surfaces to the page.
3. **No gradients** — the `.tx-*` utilities are hard-stop patterns (dots,
   hatch, scanline, checker, ruling). A gradient that does not grade is a
   pattern.
4. **Flat type** — everything is 13px mono or 15px sans at 400. Rank comes
   from micro-labels, two-digit numbering, inversion and rules. Three
   sanctioned exceptions: one 29px display line per page; decorative folio
   numerals; one 21px pull-quote, article only.
5. **Few buttons** — one `.btn` style, appearing exactly twice in the set
   (contact submit, board reset). Everything else is an underlined link.

Icons never appear: where one would go, a transparent 1px-bordered square
(`.ph`) goes instead. Bold colour (orange, yellow, cyan, navy, pink) is spent
only as filled blocks or chips, each with its own paired ink.

## The argument

`renderProjects(el, mode)` draws the same six projects as a ruled **table**
(index), a **ledger** (journal's register), a **bento** (gallery) and an
**asymmetric spread** (article/hero register). `specimen.html` tab-switches
all four in place. If two treatments ever disagree about the content, the
system has failed, visibly — every count on every sheet is derived from
`data.js`, never typed.

Light cream is the default; `.dark` inverts everything except the board,
which is always dark. Theme is the only preference persisted
(`localStorage['gm-theme']`).
