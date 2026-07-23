# 12 · Enamel

Vitreous enamel is powdered glass fused onto steel. It cannot gradate, it cannot
soften an edge, and it comes off the kiln in exactly the colour it went in.
Everything this set needs to be, the material already is.

Where 11 · Galley rationed colour almost to nothing and spent whole viewports on
emptiness, this one inverts both: the ground is graphite rather than paper,
colour is the primary carrier of rank, and the sheet is worked at a comfortable
density instead of a luxurious one.

| File | What it is |
| --- | --- |
| `system.css` | §1 tokens · §2 primitives · §3 **rank** · §4 components · §5 board |
| `system.js` | Bar, surface toggle, grid overlay, and `renderRank()` — one content set, eight devices |
| `data.js` | `window.DATA` — content, plus the eight rank definitions |
| `board.js` | The pan/zoom canvas engine |
| `index.html` | **Index** — enamel opening panel, the table, edge-marked capabilities, one isolated block |
| `signal.html` | **Signal** — the eight rank devices, side by side and one at a time |
| `work.html` | **Work** — six enamel plates with textures, then the same six listed |
| `project.html` | **Plugma** — plate hero, four enamel panels, build log against an inversion |
| `journal.html` | **Journal** — enamel lead, entries edge-marked by subject |
| `note.html` | **Note** — enamel title block, sections ranked by rule weight and numbering |
| `contact.html` | **Contact** — enamel invitation, form, expectations |
| `board.html` | **Board** — the four enamels as objects rather than panels |

Open any file directly. No build step.

## The constraint that shapes everything else

**There is no display size.** The largest type in this system that carries
meaning is **15px**. No headline, no lead, no pull-quote, no hero. Every sheet is
set in three sizes spanning four pixels — 11px marks, 12px mono, 15px text — and
a heading differs from a caption only in weight and colour. `h1` through `h6` are
all declared at `--t-text`, so the constraint is enforced rather than merely
intended. The one exception is ornamental numerals on plates, which are excluded
because they carry no meaning.

That is severe, and it has one consequence: rank has to be made some other way.

## The eight devices

`signal.html` runs all eight over the same three projects with the same words, so
the only variable is how the lead gets marked — the one comparison that actually
isolates a device.

| | Device | What it is for |
| --- | --- | --- |
| R1 | Enamel fill | A saturated flat panel with its paired ink. The loudest device, and the reason no display size is needed. |
| R2 | Inversion | Ink block, ground-coloured text. Loud without spending a colour. |
| R3 | Weight | The same 15px at 600. The quietest, and the only one that survives being used on every sheet. |
| R4 | Accent text | Vermilion on the ground — the one enamel allowed to be text rather than a fill. |
| R5 | Rule weight | 2px over 1px. Structural rank at no cost in colour or space. |
| R6 | Numbering | Two digits in the accent. Says "ordered set" and "item three" in four characters. |
| R7 | Edge marker | A 3px enamel bar down the left. Binds a run of content without boxing it in. |
| R8 | Space | Rank by isolation. The most expensive device, so it is used least. |

## Palette and type

**A graphite ground, not a paper one.** The default surface is mid-dark graphite;
the alternate is cool steel. Neither is white and neither is cream — this system
is not pretending to be printed, and the toggle is labelled *Surface* rather than
*Theme* for that reason. Four enamels sit on top as flat fills, each with its own
paired ink, never tinted and never overlaid: **vermilion** (the accent, and the
only one permitted as text), **blue**, **lime**, **teal**.

**Sans and mono, no serifs.** Chivo for prose, JetBrains Mono for every
structural mark — tables, navigation, labels, metadata, the board.

## The doctrine

Unchanged across 09–12, which is what keeps four very different registers reading
as one family:

1. **No curves** — `border-radius: 0` globally, never overridden.
2. **No shadows** — not one `box-shadow` declaration.
3. **No gradients** — the `.tx-*` utilities are hard-stop patterns. Enamel could
   not gradate if it tried.
4. **Flat type** — flatter here than in any earlier set; see above.
5. **Few buttons** — one `.btn`, appearing twice (contact submit, board reset).
   Everything else is an underlined link.

Icons never appear; a transparent 1px-bordered square (`.ph`) stands where one
would go.
