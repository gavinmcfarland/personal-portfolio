---
name: verify
description: Build, launch, and drive this repo's apps to verify changes end-to-end.
---

# Verifying changes in this repo

Monorepo: `packages/canvas` (embeddable React canvas component) and
`packages/portfolio` (the site that consumes it).

## Canvas package changes

The portfolio imports the canvas's **built** `dist/index.js` (see
`packages/canvas/package.json` exports), but CSS comes straight from
`src/canvas.css`. So after editing canvas JS/JSX, rebuild first:

```bash
cd packages/canvas && npm run build     # ~1s, also catches syntax errors
```

## Launch

```bash
cd packages/portfolio && npm run dev -- --port 5199 --strictPort
```

## Drive

An **editable** canvas instance lives in the Home page footer
(`packages/portfolio/src/components/Footer.jsx`), storageKey
`footer-canvas-demo`, seeded with a markdown card (`d-md`), two stickies
(`d-note-1`, `d-note-2`) and an arrow shape (`d-arrow`). It boots in edit
mode with a fresh browser profile.

No Playwright in the repo — install `playwright-core` in the scratchpad and
launch with `channel: 'chrome'` (Google Chrome is installed; Playwright
browser caches also exist under `~/Library/Caches/ms-playwright`).

Useful selectors (scope to `footer .canvas-root` — other canvases exist on
other routes):

- Nodes: `.node` with `data-id`; stickies are `.node.sticky`
- Camera: `.cv-world` — read `el.style.transform` to assert pan/zoom
- Selection box / hover / marquee: `.cv-sel`, `.cv-hov`, `.cv-marquee`
  (screen-space chrome; assert `display` block/none)
- Context menu: `#ctxmenu`

Gotchas:

- Wait ~600ms after load for the initial fitAll camera glide before
  measuring element positions.
- Keyboard shortcuts (Backspace, Space-pan, Escape, tool keys) are gated on
  the pointer being over the canvas — `mouse.move` onto it first.
- State autosaves to localStorage (`footer-canvas-demo`); clear it (or use a
  fresh context) to reset the board between runs.
- The seed arrow's bbox overlaps sticky `d-note-1`'s area — marquee
  rectangles around the stickies usually catch the arrow too; make
  assertions accordingly.
