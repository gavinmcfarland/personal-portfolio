# 04 · Workstation

Loosely **Windows 95**. The portfolio is a desktop: every page is a window, navigation is the
Start menu and the taskbar, and the working board is a canvas full of little windows.

## Templates

Five, including the two new layout types:

| File | Purpose |
| --- | --- |
| `index.html` | **Document home** — Explorer split: tree pane + document pane |
| `gallery.html` | **Visual home** ← *new* — projects as covers, in an icon view |
| `contact.html` | **Form** ← *new* — a property sheet with real validation |
| `project.html` | **Detail** — a properties window, with a figure of the board |
| `project-canvas.html` | **Immersive** — maximised window whose client area is the board |

Open any file directly. **No build step and no webfont** — the system UI face is the whole
point of the idiom, which makes this the fastest of the four variations.

## Research

The bevels are the canonical four-stop stacks from [98.css](https://unpkg.com/98.css), and the
palette is the VGA system palette Win95 shipped with:

```css
/* raised */  inset -1px -1px #0A0A0A, inset 1px 1px #FFF,
              inset -2px -2px #808080, inset 2px 2px #DFDFDF
/* pressed */ the same four, reversed
/* sunken */  inset -1px -1px #FFF, inset 1px 1px #808080,
              inset -2px -2px #DFDFDF, inset 2px 2px #0A0A0A
```

face `#C0C0C0` · shadow `#808080` · dark `#0A0A0A` · light `#DFDFDF` · desktop teal `#008080`
· active caption navy `#000080`.

Two deliberate accuracy calls:

- **Flat navy title bars, not gradients.** The gradient caption is a Windows 98 feature; 95
  used a solid fill.
- **Dark mode is High Contrast Black** — the accessibility scheme Windows actually shipped,
  including its yellow hyperlinks. Truer than inventing a dark mode the platform never had.

Sources: [98.css](https://unpkg.com/98.css) · [95.css](https://envs.net/~ljn/95.css/) ·
[Designing Windows 95's User Interface](https://socket3.wordpress.com/2018/02/03/designing-windows-95s-user-interface/)

## Kept from the earlier variations

- **Square corners** — verified: exactly one `border-radius` declaration, value `0`.
- **Grid** — 12 columns, `grid10` inside sections, `subgrid` rows with a `@supports` fallback.
  Press **`G`** for the overlay.
- **Flat type** — five steps, **11 / 11 / 13 / 15 / 20px**. The flattest ramp in the set; the
  display size is under 2× body.
- **No blurred shadows.** Verified mechanically: every `box-shadow` in the stylesheet is
  `inset` with zero blur. The bevels are *drawn edges*, not depth — nothing floats.
- **Density** — the baseline drops to 20px. 11–13px system type on a 24px rhythm reads airy
  and wrong for the idiom; proportionally this is the same density as 02 and 03.

## The visual home (`gallery.html`)

Every project cover is **generated, not drawn** — see `art.js`. Two rules keep it inside the
system:

1. Colour comes only from the 16-colour VGA palette the chrome is built from. No blends, no
   gradients, no alpha.
2. Shading is **dithering, not opacity** — a 2×2 checkerboard of two palette colours, the way
   a 256-colour display faked a third. `shape-rendering: crispEdges` keeps the diagonals
   aliased, because antialiasing is the one thing that would give it away as modern.

Compositions are seeded from the project slug (mulberry32), so a project always gets the same
cover and nothing is random at runtime. No stock imagery is standing in for the work.

Large/Small Icons is a real View menu setting, remembered in `localStorage`.

## The form (`contact.html`)

A Win95 property sheet: group boxes with etched borders, sunken fields, a right-aligned button
row. Validation is real, runs on submit, marks fields inline, updates the status bar, and
reports through the same modal dialog the rest of the system uses.

**Nothing is sent.** The success dialog says so explicitly — a mockup form that silently
swallowed a message would be worse than one that admits it has no mail server behind it.

## Shared files

As in `03`, the system is not inlined per page: `system.css`, `system.js`, `data.js`,
`art.js`, `board.js`. `DATA.pages` drives both the Start menu and the taskbar, so adding a page
adds it to the navigation everywhere at once. `board.js` exposes `drawFigure()` and
`drawBoard()` over one node list — the figure on `project.html` is the board at 52%, not a
picture of it.

## Verified

Every template rendered in Chromium at 1280 and 390, light and dark; console clean throughout.
No horizontal overflow on any page at 390px. The contact form was driven through all three
states (empty → 3 problems, bad e-mail → 1, valid → the honest dialog).

Three real bugs found this way and fixed:

- **Taskbar labels collapsed to "P…".** Icons were only sized inside the title bar and tree, so
  everywhere else the inline `<svg>` took its intrinsic 300×150 and ate the space the label
  needed. `.ico` is now sized once, globally.
- **The gallery's disk total was wrong** — hardcoded `2.35 MB` against data summing to
  `2.29 MB`. Now computed from `DATA.projects`.
- **The board's object count was wrong** — hardcoded `9` against a board with `10` nodes. Now
  counted from the node list. A hardcoded count in a status bar is one edit away from being a
  lie about the thing beside it.
