# 02 · Plate (drafting)

A three-page variation in a drafting-sheet register: **square corners, no shadows, strict
grid**. Same content and same three-page structure as `01-system-folio`, a deliberately
different design language.

| File | |
| --- | --- |
| `index.html` | Landing — sheet 01/03 |
| `project.html` | Project — sheet 02/03, with a figure of the board |
| `project-canvas.html` | Project with the board full-bleed — sheet 03/03 |

Open any file directly. No build step.

## The three rules

Stated at the top of every stylesheet, and the whole variation obeys them:

1. **No curves.** `border-radius: 0` is set globally on `*, *::before, *::after` and never
   overridden — not on plates, buttons, swatches, tags or board nodes.
2. **No shadows.** Depth comes from hairline rules and flat fills. A plate sits on the sheet
   because it is *ruled*, not because it floats above it.
3. **Everything snaps.** A 12-column grid across, a 24px baseline down. Line heights are
   stated in whole baselines, spacing in multiples of 8px.

**Press `G`** (or the grid button in the header) to overlay the construction grid and check
the third claim yourself.

## The system

`§1 tokens` and `§2 primitives` are byte-identical across all three pages; `§3 board` is
carried by the two pages that draw one. Token blocks are verified identical.

Primitives: `.strip` (ruled band), `.sheet` (the framed drawing area), `.grid12`, `.rail`,
`.module` + `.module__head` (numbered caption strip), `.tbl` (the ruled schedule), `.plate` +
`.plate__bar`, `.titleblock`.

The connective tissue is `.tbl` — one ruled schedule primitive carrying the work index, the
spec table, capabilities, environment, contact and the prev/next nav. Column classes
(`.c-num` `.c-key` `.c-desc` `.c-year`, and the wide `.c-term`/`.c-body` pairing) are spans of
the master grid, so a description on the landing page and a description on the project page
start at exactly the same x.

Modules use a 10-column inner grid inside a container exactly as wide as master columns
3–12, with the same gutter — so the tracks land on the master tracks without needing
`subgrid`. `.tbl` rows *do* use `subgrid`, with a `@supports` fallback.

## How this differs from 01

| | 01 folio | 02 plate |
| --- | --- | --- |
| Corners | 10px radius | square, globally |
| Depth | soft drop shadows | hairline rules only |
| Palette | warm paper, teal | cool stock, vermilion |
| Type | DM Sans + JetBrains Mono | IBM Plex Sans + IBM Plex Mono |
| Row device | leader dots | ruled schedule columns |
| Section labels | rail carries them | numbered `01–06` caption strips |
| Board grid | dots | squared paper, 20px minor / 100px major |
| Board notes | sticky notes, Caveat handwriting | flat numbered swatches, mono |
| Footer | terminal block | drawing title block |

## The board

Board nodes are `§2` plates with a position — same hairline border, same square corners, same
`.plate__bar` caption strip that a figure on the page uses.

Handwriting is gone. Annotations are set in mono caps in the accent (the `FEATURES` callout),
because a handwritten note would be the one thing on the sheet that was not drafted. Sticky
notes became **flat numbered swatches** with a ruled caption — the same information, redrawn
as something that belongs on a drawing.

Every node coordinate and width is a multiple of 20, and the board grid is 20px minor / 100px
major, scaling with zoom. The board is squared paper; the page is a ruled sheet — same
discipline, different substrate.

## Type

Five steps, 11px → 28px, deliberately compressed: `--t-micro` `.6875rem`, `--t-label` `.75rem`,
`--t-mono` `.8125rem`, `--t-body` `.9375rem`, `--t-display` `clamp(1.375rem, 2.8vw, 1.75rem)`.
The display size is barely larger than body — hierarchy is carried by mono/sans, uppercase
tracking, colour and rules instead.

## Verified

Rendered in Chromium at 1440 and 390; console clean on every page. Two bugs were found this
way and fixed:

- **The grid overlay was lying.** It used a different box model from `.sheet` (padding on the
  outer element vs. `.sheet`'s padding + 1px side borders), putting the bands ~33px off the
  real columns. It now mirrors `.sheet` exactly — measured: overlay column 1 and the rail both
  land at x=153, overlay column 3 and `.main` both at x=346, at two viewport widths.
- **Mobile rows stranded the year on its own line.** `.c-desc` precedes `.c-year` in the DOM,
  so grid auto-placement took the full-width description as row 2 and pushed the year to row
  3. Rows are now stated explicitly.
