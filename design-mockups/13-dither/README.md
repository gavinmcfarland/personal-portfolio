# 13 · Dither

A manual page. Everything is set in one monospaced family at one size, sections
are named in bold capitals and their bodies are indented, and there is no colour
beyond a single green for the prompt. Deliberately understated — nothing on these
pages announces itself.

The interest goes somewhere else: **§3 of `system.css`, the dither engine.**

| File | What it is |
| --- | --- |
| `system.css` | §1 tokens · §2 primitives · §3 **dither** · §4 manual · §5 board |
| `system.js` | Bar, surface toggle, grid overlay, renderers, copy-to-clipboard |
| `data.js` | `window.DATA` — content, plus the six fields and five decals |
| `board.js` | The pan/zoom canvas engine |
| `index.html` | **gavin(1)** — NAME, SYNOPSIS, DESCRIPTION, OPTIONS, EXAMPLES, ENVIRONMENT, BUGS, SEE ALSO, AUTHOR |
| `textures.html` | **dither(7)** — the fields, the scale test, the decals in use, the grounds |
| `work.html` | **work(1)** — six entries, each illustrated with its own field |
| `project.html` | **plugma(1)** — synopsis, one large plate, history, the board figure |
| `journal.html` | **journal(1)** — latest entry, then everything by year |
| `note.html` | **note(1)** — a single field note |
| `contact.html` | **contact(1)** — address, environment, an interactive alternative |
| `board.html` | **board(1)** — notes made of dither plates rather than coloured card |

Open any file directly. No build step.

## The dither engine

Earlier sets in this folder used texture as a flat pattern poured into a bordered
box — an abstract stand-in for a picture that was never going to exist. Here the
texture **is** the picture.

A field is built from three dot grids at deliberately mismatched pitches — 5, 9
and 14, say — with the coarser two masked into hard-edged patches so the field
clumps and opens instead of repeating. The mismatch is the whole trick: grids at 4
and 8 beat in step and read as a screen door, while 5-9-14 never come back into
phase and the eye reads drift. The masks are unions of hard-stop circles and
ellipses, which is what gives each plate its own blotchy shape rather than an even
wash.

**Nothing fades.** Every colour stop in the file is hard — which is not a
restriction the technique had to work around, it is the definition of dithering,
and the reason this engine sits comfortably inside a system that has banned
gradients since 09.

Because the dot pitch is fixed rather than scaled, a small plate shows a *fragment*
of the clumping rather than a shrunken copy of it. The fields behave like a
photograph being cropped, not like artwork being resized — see the scale test on
`dither(7)`.

### Six fields

`drift` (open clumping, the default) · `shoal` (banded, wants a wide crop) ·
`static` (fine and quiet) · `bloom` (large clumps, one per page) · `weave` (two
grids at close pitch, reads as cloth) · `burr` (coarse and damaged, the mezzotint
of the set).

### Five decals

Where the set is allowed to enjoy itself. Each is meant to be placed **half off the
edge** of something rather than tidily inside it — a decal that is not overlapping
anything is just a shape. `seal` (a stamped ring) · `crop` (register marks, the one
decal not dithered, because a register mark has to be exact) · `tab` (a hatched
flag hanging off an edge) · `blot` (an irregular blob that breaks its box) ·
`stripe` (a band with weight, for when a hairline is too quiet).

### Three grounds

The same engine at about a third the ink, poured behind whole sections so the sheet
reads as printed matter rather than as a background colour. Grounds get their own
much weaker value (`--tx-ground`) because they sit behind running text — a field
you can read a paragraph through is the entire point. `ground--patch` is cut off by
a hard-stop ellipse anchored right, so it never lands under the first line of an
indented block.

The board takes this furthest: its notes are dither plates with type set on them,
so the canvas is made of the same material the sheets are illustrated with. Notes
re-declare the dither ink at roughly a third strength — the material stays the
same, there is just less of it.

## Type and colour

One family, **Spline Sans Mono**, at two sizes (12px captions, 14px everything
including section headers) plus a single step to 17px for command lines — the only
place the set raises its voice. Section rank comes from bold capitals and indent,
as it does in `man(7)`.

Two surfaces: near-black by default, because a terminal is dark and bone is opt-in
rather than inferred. One accent, a green, marking the prompt and the current page
and nothing else.

## The doctrine

Unchanged across 09–13:

1. **No curves** — `border-radius: 0` globally. The circles in §3 are mask
   geometry, not painted corners.
2. **No shadows** — not one `box-shadow` declaration.
3. **No gradients** — every stop is hard.
4. **Flat type** — two sizes, plus one step for command lines.
5. **Few buttons** — one `.btn`, appearing twice in the set.
