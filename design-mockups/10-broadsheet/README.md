# 10 · Broadsheet

A newsprint register, built to answer the question `09-imposition` left open.
09 asked what happens when many page *types* print from one form. This one asks
the next question: **how many structures can one voice hold before it stops
being one voice?**

So the investment goes into layout. §3 of `system.css` is a library of twelve
structures, and `layouts.html` runs the same six items through all of them with
the content held still — the only thing that changes between one frame and the
next is the shape.

| File | What it is |
| --- | --- |
| `system.css` | The system — §1 tokens · §2 primitives · §3 **layouts** · §4 components · §5 board |
| `system.js` | Bar, theme, grid overlay, and `renderLayout()` — one array, twelve structures |
| `data.js` | `window.DATA` — the single content source, including the twelve layout definitions |
| `board.js` | The pan/zoom canvas engine |
| `index.html` | **Front** — masthead, asymmetric lead well, three-column capabilities, table, filmstrip |
| `layouts.html` | **Layouts** — the atlas: a comparator with tabs and a stepper, then all twelve in order |
| `journal.html` | **Journal** — three-column flow of recent notes, then year groups |
| `feature.html` | **Feature** — full-bleed split screen, the drop cap, an inverted pull band |
| `gallery.html` | **Gallery** — filmstrip, staggered grid, and the plain table underneath |
| `project.html` | **Plugma** — full-width plate, single measure, and the set's one overlap |
| `archive.html` | **Classifieds** — four blocks of small ads at maximum density |
| `contact.html` | **Contact** — split screen at full bleed, the form, availability in columns |
| `board.html` | **Board** — the working board, keeping the sheet's own theme |

Open any file directly. No build step.

## The twelve structures

| | Structure | What it is for |
| --- | --- | --- |
| L1 | Column flow | Newspaper columns with a rule between. Fast, wastes nothing, fails when a column runs short. |
| L2 | Split screen | One half fixed, one scrolling. The fixed half is the argument; the moving half is the evidence. |
| L3 | Filmstrip | Horizontal scroll-snap, for a sequence meant to be compared rather than searched. |
| L4 | Staggered | Alternate cells dropped half a row. Breaks the ledger feel without leaving the grid. |
| L5 | Overlap | Panels crossing into each other in z. Used **once** in the whole set, on the project sheet. |
| L6 | Full-bleed bands | Alternating edge-to-edge strips. Rank from inversion and width, never type size. |
| L7 | Asymmetric | Seven of argument, five of apparatus, an empty column between. |
| L8 | Classifieds | Three columns of small ads. Everything findable, nothing featured. |
| L9 | Bento | Uneven spans on one grid — honest only when items differ in weight. |
| L10 | Rungs | A rail with rows hung off it. The shape a chronology wants. |
| L11 | Single measure | One narrow column and a lot of nothing. The most expensive shape here. |
| L12 | Ruled table | The baseline every other structure argues against. |

## The doctrine

Carried over from 09 unchanged — it is what makes the two sets read as siblings
despite the change of register:

1. **No curves** — `border-radius: 0` globally, never overridden.
2. **No shadows** — not one `box-shadow`; panels sit on the stock because they
   are ruled or filled.
3. **No gradients** — the `repeating-gradient` calls in the `.tx-*` utilities are
   hard-stop press patterns (halftone, crosshatch, rules, stipple, weave). A
   gradient that does not grade is a pattern.
4. **Flat type** — 16px serif prose, 13px sans structure. Three sanctioned
   exceptions: one display line per page, decorative folio numerals, and one drop
   cap on the feature sheet only.
5. **Few buttons** — one `.btn`, appearing twice in the set (contact submit,
   board reset). Everything else is an underlined link.

Icons never appear; a transparent 1px-bordered square (`.ph`) stands where one
would go.

## What changed from 09, and why

Navigation runs **horizontally** across the top rather than down a fixed rail, so
every page gets the full sheet for its structure to work in — a rail would have
made half the twelve layouts impossible to show at their real width. Prose is a
**serif** (Newsreader), which frees the sans (Inter Tight) to be small, tight and
purely structural everywhere. The stock is cooler and darker, and the two spot
inks — red and blue — are *printed* rather than accented: they fill shapes far
more often than they tint text.
