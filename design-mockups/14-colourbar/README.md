# 14 · Colourbar

A cross of **09 · Imposition** and **13 · Dither**, printed in **05 · Console**'s ink.

| Taken from | What |
| --- | --- |
| 13 · Dither | The `man(7)` skeleton — one mono face, bold capital section names, indented bodies, a `$` prompt, and a set that names its pages `gavin(1)`, `work(1)`, `colour(7)` |
| 09 · Imposition | Many page types imposed on one form: the numbered rail, the ruled table, the ledger, the bento, the asymmetric spread — all drawn from one array |
| 05 · Console | The colour. The Windows 95 sixteen, near-black ink on white stock, navy as the single interactive colour |

| File | What it is |
| --- | --- |
| `system.css` | §1 tokens · §2 primitives · §3 **colour bar** · §4 manual · §5 imposed · §6 board |
| `system.js` | The rail, surface toggle, construction grid, and the renderers |
| `data.js` | `window.DATA` — the single content source every sheet renders from |
| `board.js` | The pan/zoom canvas engine, and the static figure printed inside `plugma(1)` |
| `index.html` | **gavin(1)** — masthead, NAME, SYNOPSIS, DESCRIPTION, OPTIONS, EXAMPLES ×2, ENVIRONMENT, BUGS, SEE ALSO, AUTHOR |
| `work.html` | **work(1)** — six entries at full size, then the same six as a register |
| `project.html` | **plugma(1)** — synopsis, one large plate, spec table, build-log folds, the board figure |
| `journal.html` | **journal(1)** — the latest note as a spread, then everything by year |
| `note.html` | **note(1)** — a manual entry that happens to contain prose |
| `article.html` | **article(7)** — the long-form template: standfirst, measure-breaking figures, one pull-quote, numbered notes |
| `colour.html` | **colour(7)** — the sixteen, the six geometries, the four marks, the four treatments switched in place |
| `contact.html` | **contact(1)** — address, channels, clients, and the form |
| `board.html` | **board(1)** — full-bleed canvas; notes are flat colour cards |

Open any file directly. No build step, and **no webfont** — the faces are the system's own, which is 05's position and the reason these sheets render before they are styled.

## The colour bar

13 made its illustrations out of screened fields: three dot grids at mismatched pitches,
clumping into something that behaved like a photograph. This set is not allowed to do that.
The replacement is not a weaker version of it — it is the other half of the same press.

A **control strip** is the ladder of solid patches a printer runs down the trim edge of a sheet
to prove the ink is laying at density. It is a picture that is entirely about its colour, which
makes it the right illustration for a set whose one inheritance from 05 *is* the colour.

> There is not a dot, a hatch, a stipple, a screen or a gradient in §3. Every mark is a solid
> `background-color` and every edge is a 1px rule. It is the first illustration engine in this
> folder with **zero `background-image` declarations** — verified mechanically.

Strips are written in markup as a container of `<i>` cells, one per patch, each carrying
`data-c="<tone>"`. The container's variant decides the geometry; the cells decide the colour.
So a strip's palette is a list of attributes you can read in a diff, rather than something
buried in a mask:

```html
<span class="strip" data-strip="b">
  <i data-c="silver"></i><i data-c="navy"></i><i data-c="teal"></i>
  <i data-c="aqua"></i><i data-c="white"></i><i data-c="navy"></i>
</span>
```

### Six geometries

`a · step` (equal patches in a row — the control strip proper, and the only one that reads at
any width *and* any height, which is why it is the default) · `b · wedge` (patches growing
1:1:2:3:5:8, so the last ink named is the one the picture is about) · `c · quad` (four unequal
blocks; the quietest, for when the words are carrying the entry) · `d · rail` (one field with
its own small strip down the edge, which is how a proof actually arrives) · `e · slug` (a
single flat carrying a knocked-out folio numeral) · `f · key` (all sixteen at once — one per
page, and `colour(7)` spends its one on the page about colour).

### Scale behaves the opposite way to 13

13's dot pitch was fixed, so a small plate showed a *fragment* of the clumping — the fields
behaved like a photograph being cropped. These cells are proportional, so a small strip shows
the **same picture smaller**. That is why these read as diagrams where those read as
photographs, and it is why the same wedge works at 240px, at 40px, and at 14px — where it stops
being a picture and becomes the `.bleed` rule you have been reading past all set.

### Four marks

Each is meant to sit **half off the edge** of something; a mark that is not overlapping
anything is just a shape. `crop` (register marks — the one mark 13 also left undithered,
because a register mark that is approximate is not a register mark) · `stamp` (a square ring;
13 cut its seal as a true circle with a mask, and a set that has banned curves has to say the
same thing with a rectangle) · `tab` (a flat flag, two words at most) · `bleed` (a band of
solid colour used as a rule with weight).

## Colour

The Windows 95 palette, unaltered, each ink paired in §1 with the ink it may carry type in.
**Every pairing clears 4.4:1**; eight are sanctioned to set words on and the other eight appear
as fills only, which `colour(7)` tabulates rather than asserting.

The sixteen **do not change between surfaces.** Stock and ink invert when you press `surface`;
the palette does not. A control strip that shifted with the theme would not be a control strip.

Navy is the one interactive colour — links, hover, focus, current page. Win95 used a single
colour for selection and it made state unambiguous, which is a good idea independent of 1995.
Maroon is the one error colour, because the palette already had a colour for *this went wrong*
and navy is spoken for.

## Type

Two faces, neither fetched: the system UI face carries prose and the system mono carries
structure. Five steps — **11 / 12 / 13 / 15 / 20** — all at 400 or 700, on a 20px baseline.
Rank comes from bold capitals, indent, two-digit numbering and inversion instead of from size.
The 15px step is spent only on command lines, and 20px only once per sheet.

`article(7)` is the one page type not shaped like a manual page, and it is the only place the
ramp bends: it spends 15px on a standfirst and its single 20px allowance on a pull-quote rather
than a heading. An article that also wanted a display heading would have to give one of them
up — that is the intended trade, not an oversight.

## The doctrine

Unchanged across 09–14:

1. **No curves** — `border-radius: 0` globally, never overridden.
2. **No shadows** — not one `box-shadow` declaration.
3. **No gradients** — every stop is hard. §3 goes further and has no patterns at all; the
   file's only two gradient calls are in §6, drawing the board canvas as a grid of 1px rules.
4. **Flat type** — five steps, 400 or 700.
5. **Few buttons** — one `.btn`, appearing twice in the set (contact submit, board reset).

## Honest by construction

`renderProjects(el, mode)` draws the same six projects as a ruled **table**, a **ledger**, a
**bento** and an **asymmetric spread**; `renderEntries()` adds the illustrated **entry**.
`colour(7)` tab-switches four of them in place. If two treatments ever disagreed about the
content, that page would show it.

Counts are computed, never typed: the footer reads `6 projects — 2 tools, 1 library, 3 plug-ins`
from `DATA.projects`, and `colour(7)` reports its own geometry and mark counts from the arrays
that define them.

The contact form validates for real — marks fields, counts the problems, moves focus to the
first — and then says **"Validated — but not sent."** There is no mail server behind a mockup,
and a form that silently swallowed a message would be worse than one that admits it.

## Verified

Driven in Chromium across all nine pages at 1440 and 390, light and dark. Console clean
throughout; `scrollWidth` never exceeds the viewport on any page at either width. The form was
driven through both states (3 problems → validated) and all four treatments were tab-switched.

Four things were found and fixed rather than assumed:

- **`.strip` carried a `min-height: 8rem`.** It silently beat every explicit height in the set —
  the 14px masthead bleed, the 10px rail strip and the whole scale test were all being floored
  at 128px. A strip is now sized only by whatever prints it.
- **The slug's folio numeral was a sibling of its patch, not a child,** so it could not inherit
  the ink §1 had paired with that colour and would have needed telling twice. It is now emitted
  inside the cell.
- **`article(7)`'s measure-breaking figure overhung the sheet** by 4px each side, because it was
  sized from viewport arithmetic that did not know about the sheet's `max-width`. Rewritten as a
  negative margin with an 11rem ceiling — exactly half the difference between the 46rem measure
  and the 68rem inside the sheet's padding — and checked at six widths, where it now lands on
  the sheet edge to the pixel.
- **A `<figcaption>` sat outside its `<figure>`** on `plugma(1)`, and the board figure clipped
  its top row of notes (they sit at `y: -40`).
