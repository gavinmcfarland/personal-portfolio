# 03 · Overprint

A **two-ink press**. Every colour on every page is one of four things: the stock, ink A, ink B,
or the multiply overlap of A and B. There is no fifth colour and no gradient anywhere.

That constraint is the whole design — **hierarchy is carried by which ink a thing is printed
in, not by how big it is**, which is what lets the type ramp stay as flat as it does.

## Templates

Six, covering six different jobs:

| File | Purpose |
| --- | --- |
| `index.html` | **Cover** — what I'm doing now, selected pieces, method |
| `piece.html` | **Detail** — a single piece, with a figure of its board |
| `piece-canvas.html` | **Immersive** — the board full-bleed and pannable |
| `note.html` | **Long-form** — an essay, reading column + sticky side panels |
| `archive.html` | **Dense index** — everything, grouped by year |
| `404.html` | **Utility** — short page, same parts |

Open any file directly. No build step.

## Shared files, not copy-paste

Unlike variations 01 and 02, the system is **not inlined per page**. Six templates × a 300-line
stylesheet is unmaintainable duplication — the exact problem I flagged after 01. Instead:

- `system.css` — tokens, primitives, board
- `system.js` — theme, grid overlay, rail tracking, row renderers
- `data.js` — pieces, notes, colophon
- `board.js` — the board's nodes, renderer and engine

Pages still open straight from disk; the links are relative. The trade is that a single HTML
file is no longer portable on its own.

`data.js` is what makes the multi-template set hold together: the cover shows four pieces, the
archive shows all of them grouped by year, and `piece.html` reads its own neighbours for
prev/next — all from one array. A year fixed once is fixed everywhere.

Similarly, `board.js` exposes `drawFigure()` and `drawBoard()` over **one node list**. The
figure on `piece.html` is not a picture of the board; it is the board, drawn at 52%.

## Kept from the earlier variations

- **Square corners** — `border-radius: 0` set once on `*`, never overridden. Verified: exactly
  one `border-radius` declaration in the stylesheet, value `0`.
- **Grid discipline** — 12 columns across, 24px baseline down. Press **`G`** to overlay it.
  The overlay mirrors `.sheet`'s box exactly, so it measures the real grid.
- **Flat type** — five steps, 11px → 30px, display barely above body.
- **Density** — the same 24px rhythm and row heights as `02-plate`.

## Changed on purpose

| | 02 plate | 03 overprint |
| --- | --- | --- |
| Rules | 1px hairlines | 2px ink |
| Emphasis | uppercase mono + rules | flat ink blocks, knockout text |
| Palette | cool stock + vermilion | warm stock + blue/fluoro pink + their overlap |
| Type | IBM Plex Sans/Mono | Space Grotesk / Space Mono |
| Section labels | hairline caption strip | filled ink-B square with the number |
| Board ground | squared paper 20/100px | halftone screen, 5px |
| Board notes | flat outlined swatches | solid ink blocks that **multiply where they overlap** |
| Footer | drawing title block | press colophon |

Depth is never a drop shadow. The two `box-shadow` declarations in the stylesheet are both
`inset` — a flat ink rule under a link, not a shadow.

## Copy and structure

Rewritten, not restyled. The voice is shorter and more direct, and the sections are different
things: **now / pieces / method / notes / index** on the cover, and **brief / facts /
constraints / build / board / outcome** on a piece — a build-log framing rather than the
case-study framing of 01 and 02.

## The board

The clearest statement of the two-ink rule. Notes are not paper squares with shadows; they are
flat ink, and the small square where two of them cross is `mix-blend-mode: multiply` doing what
it would do on press. On black stock the equivalent move is `screen`, handled in `.dark`.

## Verified

Every template rendered in Chromium at 1440 and 390, light and dark; console clean on all of
them. Measured rather than eyeballed:

- No horizontal overflow on any template at 390px (`scrollWidth === 390` on all six).
- All 17 key/meta row pairs share a line on mobile — rows are stated explicitly because
  `.c-desc` precedes `.c-meta` in the DOM and auto-placement would strand the meta.

One real bug was found this way and fixed: **the board callout was wrapping and colliding with
the notes below it.** Nodes are absolutely positioned inside a `.world` with no width, so
anything without an explicit width shrink-wraps to its *minimum* content width — wrapping at
every space. Every other node type escapes this by declaring a width; a callout is sized by its
text, so it now opts out of wrapping with `white-space: pre` instead.

> The same latent issue exists in `01` and `02`, where the callout text happens to be a single
> word (`Features`) and so cannot wrap. Worth fixing there if either variation is taken further.
