# 05 · Console

The Windows 95 palette and type, built the way you would build an interface now. It shares its
colours and its font with `04-workstation`, and almost nothing else.

| File | Purpose |
| --- | --- |
| `index.html` | Home — icon tiles over a scannable list |
| `project.html` | Detail, with a figure of the board |
| `project-canvas.html` | Board full-bleed |
| `contact.html` | Contact form |

Open any file directly. No build step and **no webfont**.

## What was deliberately left behind

This is the whole brief, so it is worth being explicit. Gone:

- **Every bevel.** No raised, pressed, sunken or etched edges. Structure is 1px rules and flat
  fills. Verified mechanically: **zero `box-shadow` declarations** in the stylesheet — where 04
  had 40-odd inset bevel stacks.
- **The desktop metaphor.** No title bars, window controls, taskbar, Start menu or fake status
  panels. Pages are pages, navigation is a nav.
- **Costume details generally.** No `_ □ ✕` boxes, no "3½ Floppy (A:)" labels, no fake disk
  sizes, no `File Edit View Help` bar that does not menu.

## What was kept, and why each earns its place

- **The palette.** A genuinely good restricted set, and the 16 colours do real work here:
  each project category gets one, shown as an 8px swatch, so you can scan the list for one kind
  of thing.
- **The system UI face** (Tahoma/Verdana), for the same reason — and it means no webfont.
- **Navy as the single interactive colour.** Win95 used one colour for selection and it made
  state unambiguous. That is a good idea independent of 1995, so hover, focus and current-page
  are all one navy fill.
- **The dotted focus rectangle**, still a clearer focus indicator than most of what replaced
  it: it never blends into a border.
- **The 50% stipple**, as a divider texture. One honest reference rather than a set of props.

## The icons

The one thing taken wholesale, because it is genuinely better here rather than nostalgic.
Icons are **authored as bitmaps, not paths** — each is a 16×16 grid of characters in
`icons.js`, one character per pixel, mapped to the palette and rendered to `<rect>` runs:

```js
floppy: [
  '..kkkkkkkkkkkk..',
  '..kssssssssssk..',
  '..kskkkkkkkksk..',
  …
]
```

Why this and not an icon font or SVG paths:

- legible at 16px, which vector icon sets rarely are
- editable as text, and readable in a diff
- ~400 bytes each, no sprite sheet, no font file, no flash of missing icons
- `shape-rendering: crispEdges` keeps them aliased at any size, so 16 → 32 → 48px scales
  without going soft

Nine icons, validated as exactly 16 rows × 16 characters. Horizontal runs are merged, so an
icon is 30–60 rects rather than 256.

## Kept from the series

Square corners (one `border-radius` declaration, value `0`), a 12-column grid with a `G`
overlay that mirrors `.sheet`'s box exactly, a **20px baseline**, and a five-step type ramp at
**11 / 12 / 13 / 15 / 20px** — the same density as 04.

## Honest by construction

The contact form validates for real — marks fields, lists what is wrong, moves focus to the
first problem — and then says **"Validated — but not sent."** There is no mail server behind a
mockup, and a form that silently swallowed a message would be worse than one that admits it.

Counts are computed, never typed: the footer reads `6 projects — 2 tools, 1 library, 3
plug-ins` from `DATA.projects`, and the board reports its object count from the node list.

## Verified

Every page rendered in Chromium at 1280 and 390, light and dark; console clean throughout. The
form was driven through both states (3 problems → validated).

One real bug found and fixed: **the header overflowed the viewport on a phone.** The bar was a
single non-wrapping flex row, so the trailing Grid/Theme buttons were the items that gave —
collapsing to 18px and pushing ~20px past the edge (`scrollWidth` 409 against a 390 viewport).
The bar now wraps and the buttons do not shrink; `scrollWidth` is exactly 390 on every page.

> On `project.html` at 390px, 48 elements report bounds past the viewport. All 48 are board
> nodes inside `.board`, which is `overflow:hidden; contain:strict` — clipped, not overflowing.
> Checked rather than assumed.
