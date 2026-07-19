# 06 · Plate · Console

The **drafting sheet of `02-plate-drafting`** carrying the **palette of `05-console`**. IBM Plex
Sans and Mono, hairline rules, numbered caption strips, ruled schedules and a drawing title
block — all of it printed in the 16-colour VGA palette.

The join is tidier than it sounds, because both parents already agreed on the important
things: square corners, a 12-column grid, a 24px baseline, and a five-step type ramp.

## Templates — six sheets, four of them new to the series

| File | Sheet | Type |
| --- | --- | --- |
| `index.html` | 01 | Index — work schedule with a **live filter** |
| `project.html` | 02 | Detail, with a figure of the board |
| `changelog.html` | 03 | **Release notes** ← new |
| `specimen.html` | 04 | **Icon specimen sheet** ← new |
| `cv.html` | 05 | **CV, with a real print stylesheet** ← new |
| `project-canvas.html` | 06 | Board full-bleed |

Open any file directly. No build step.

### New template notes

**Specimen sheet** — every icon at both sizes, a magnifier that renders the bitmap as its own
grid of cells (which is what the source literally looks like), the palette table read from the
same object the icons index into, and the authoring rules. Where a size has not been drawn, the
cell shows a dotted `32` placeholder rather than silently substituting the other size.

**Changelog** — versions newest-first, with `chg` sorted *before* `new` and `fix`, because
breaking changes are what you need first when deciding whether to upgrade. Counts are computed:
*4 releases · 11 changes*.

**CV** — the one template meant to leave the screen, so `@media print` is real: chrome off,
rules kept, `.print-url` resolves links to their URLs in the margin, ink to pure black,
`break-inside: avoid` on rows, 14mm page margins. Verified by generating a PDF.

**Live filter** on the index — search plus category radios, an explicit empty state rather than
an empty table, and progressive: without JS the full schedule still renders and the panel
simply does nothing.

## Larger icons

The set is now **two sizes, drawn separately**: 8 names at 16×16, 6 of them redrawn at 32×32
with real detail — the floppy has a shutter, a body and a ruled write-label; the monitor has a
console running on it; the doc has a navy header band over grey text lines.

They are **not scaled copies**. A 32×32 reduced to 16px puts every source pixel on a half-pixel
and turns to mud, so the small set is drawn again with fewer details and heavier forms. That is
how bitmap icon sets worked, and it is why they stayed legible.

`icon(name, {size})` picks the right grid and falls back to whichever size exists. All 14 grids
are validated as square, correctly sized, and palette-only.

## One deliberate departure from 02

`02` set body prose in a mid grey (`#4A4E55`). This palette has nothing between black and
`#808080`, and `#808080` on white is **3.9:1 — under AA for body text**. So prose is set in
`--ink`, and `#808080` is reserved for labels, column heads and secondary values where it is
either large enough or non-essential.

The palette constrains the colour. It does not get to constrain the contrast.

## Verified

All six sheets rendered in Chromium at 1440 and 390, light and dark; console clean throughout.
Checked rather than assumed:

- **Filter** — 6 → 3 (plug-ins) → 1 (search "table") → 0 with the empty state shown.
- **Specimen** — 8 cells; magnifier renders 1,024 cells for a 32×32 and switches on click.
- **Computed figures** — `4 releases · 11 changes`, latest `1.4.0`, `5` roles, `6` items. The
  project page reads the latest version from the changelog data, so the two cannot disagree.
- **Print** — under `media: print` the strip and rail compute to `display:none`, `.print-url`
  resolves to the real href, body colour is `rgb(0,0,0)`, and a 106KB A4 PDF generates.
- **Mobile** — `scrollWidth` exactly 390 on every sheet, no element outside the viewport.
- **Discipline** — one `border-radius` declaration (`0`); **zero** `box-shadow` declarations.

One bug found and fixed: the specimen grid used the `gap`-over-coloured-background trick to
draw its rules, which showed the container's silver as a **large empty block** where the last
auto-fill row was short. Rules are now drawn on the cells themselves.
