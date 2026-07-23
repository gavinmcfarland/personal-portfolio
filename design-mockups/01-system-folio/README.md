# 01 · System Folio

A three-page variation built so the pages are **one system arranged three ways**, not three
designs that share a palette.

| File | What it is |
| --- | --- |
| `index.html` | Landing — summary, work index, capabilities, environment, contact |
| `project.html` | Project page — plugma, with a static miniature of the board |
| `project-canvas.html` | Project page with the board full-bleed and interactive |

Open any file directly in a browser. No build step, no dependencies beyond the Tailwind CDN
and Google Fonts.

## The system

Each page carries the same `<style>` block verbatim, in three sections.

**§1 Tokens.** Colour, space, type, radius, shadow and motion as custom properties, with a
`.dark` override set on `<html>`. `tailwind.config` maps its palette onto the *same*
properties — so a utility class (`text-muted`) and a component class (`.row__val`) read from
one source and cannot drift apart.

**§2 Primitives.** Eight of them, and every layout on every page is made of these:

- `.bar` — the three-part document row. Head and foot of all three pages.
- `.spread` — rail + main. The one page grid.
- `.rail` — margin label and table of contents fused into a single element.
- `.module` — a labelled section.
- `.row` — key · leader dots · value. Carries the work index, the facts table, the
  environment list and the prev/next nav. The leader is what makes them read as one family.
- `.pair` — term beside description (hanging indent).
- `.card` — one surface definition.
- `.lnk`, `.tag`, `.iconbtn` — the small stuff.

**§3 Board.** The canvas nodes. `.n-doc`, `.n-code` and `.n-link` all sit on `.card`, so a
node on the board has the same border, radius and shadow as anything on the page.

## Notes on the adaptation

Three deliberate changes from the source mockups:

1. **The board joined the design system.** Canvas body copy dropped Tinos serif for the
   site's DM Sans, and node headings use JetBrains Mono to match the site's `plugma` h1 —
   the same rule as the pages, *mono carries structure, sans carries argument*. Caveat stays,
   but only on sticky notes and handwritten labels, where the artefact really is handwritten.

2. **Sticky tints were retuned.** The originals were office-supply bright and read as
   imported from a different tool. They are now desaturated toward the warm paper, with
   proper dark-mode values.

3. **A `shape` module was added to `project.html`** — an inert miniature of the real board,
   built from the same node markup at a fixed scale rather than an image, so it can never
   fall out of step with the page it links to. It is the hinge between the written project
   page and the canvas one.

Connector arrows read `--accent` at runtime and repaint on theme change, rather than being
pinned to a hex.

## Type

Five sizes total (`--t-micro` `.72rem` → `--t-display` `clamp(1.5rem, 3.4vw, 2rem)`), with
weight, colour and italics doing the work size usually does. Two faces, one rule: **mono for
structure, sans for argument** — and that rule holds on the board as well as the page.

## Layout behaviour

The rail is hidden below `lg`, where each module shows its own heading instead (above `lg`
the rail carries it, so the visible copy is suppressed rather than duplicated).

`project-canvas.html` substitutes a fixed shell for `.spread`: the document column scrolls
on its own and the board takes every remaining pixel. Two consequences —

- The rail goes. A contents index needs a scrolling document to index; here the column is
  short enough to read whole. The modules stay, just stacked.
- Gestures stop being cooperative. The page has no scroll to protect, so a plain wheel pans,
  pinch zooms, and one finger drags. Below `lg` the split turns horizontal (document above,
  board below at a fixed height) because a 20rem column and a usable canvas cannot both fit
  across a phone.

When the whole board would fit below 35% — a phone — the fit routine frames the opening card
at a legible size instead and lets the reader pan out.

## Accessibility

Skip link, visible focus rings on the accent token, `aria-current` on the rail, and the board
is keyboard-driven: arrows pan, `+`/`-` zoom, `0` fits. `prefers-reduced-motion` disables the
entry animation and pins the hover markers on.
