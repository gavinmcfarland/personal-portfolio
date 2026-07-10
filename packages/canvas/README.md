# @gavinmcfarland/canvas

An embeddable pan / zoom / annotate canvas as a single React component. Drop it
fullscreen, into a section of a page, or anywhere a component can go. Users can
pan, zoom, drop sticky notes / text / markdown / images, draw, and organise the
board across multiple pages.

> Extracted from the canvas portfolio. The reusable engine lives here; anything
> portfolio-specific (the `card` node, the profile data, the dev publish endpoint)
> is supplied by the consumer as props.

## Usage

```jsx
import { Canvas } from '@gavinmcfarland/canvas'
import '@gavinmcfarland/canvas/styles.css'

export default function App() {
  return (
    <div style={{ height: 480 }}>       {/* the canvas fills this box */}
      <Canvas editable />               {/* fit="contain" is the default */}
    </div>
  )
}
```

Three embed modes, one component:

- **Section** — `<div style={{height:480}}><Canvas fit="contain" /></div>` (default). The board measures the container, so its fit/zoom/UI stay inside the box.
- **Fullscreen** — `<Canvas fit="fullscreen" />` covers the browser viewport.
- **Component** — it *is* a component; drop it anywhere, render several on one page (scoped classes, no shared globals).

A live section-embed example lives at `packages/portfolio/embed-demo.html` (served at `/embed-demo.html` during `pnpm dev`).

`<Canvas>` wraps `<CanvasProvider>` around the canvas surface. For custom layouts
you can compose them yourself:

```jsx
import { CanvasProvider, useCanvas, CanvasSurface } from '@gavinmcfarland/canvas'
```

## Props

All are optional.

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `base` | `{ nodes, shapes, brand }` | empty | Data-derived starting content. `brand` shows in the top bar. |
| `managedTypes` | `string[]` | `[]` | Node types whose **content** is regenerated from `base` each load; only their position is persisted. |
| `nodeTypes` | `{ [type]: Component }` | `{}` | Custom node renderers, merged over the built-ins. |
| `initialState` | serialized snapshot | `null` | Committed board to load (the shape produced by `serialize()`). |
| `editable` | `boolean` | `false` | Enables the toolbar, editing, and localStorage autosave. |
| `storageKey` | `string` | `embed-canvas-v1` | localStorage key for the editable autosave. Unique per instance. |
| `homeId` | `string` | `home` | Id of the first (permanent) page. |
| `fit` | `'contain' \| 'fullscreen'` | `'contain'` | `contain` fills the parent box; `fullscreen` covers the browser viewport. |
| `theme` | `{ mode, toggle }` | `null` | Renders a theme-cycle button in the top bar when provided. Dark mode also activates from a `.dark` ancestor. |
| `onPublish` | `(snapshot) => Promise` | `null` | Persist the board somewhere durable. Shows the "Publish" button when set. |
| `onUploadImage` | `(file, dataUrl) => Promise<url>` | inline data URL | Resolve a `src` for dropped images. |
| `onChange` | `(snapshot) => void` | `null` | Fires after every autosave. |

Built-in node types: `sticky`, `tblock` (text), `md` (markdown), `frame`, `image`,
plus freehand `shape`s.

In edit mode, images can be dragged onto the board either as local files or
straight from another browser tab (the drop arrives as a URL). Animated formats
(GIF/WebP/AVIF) are stored untouched and play automatically — image nodes render
a plain `<img>`, so no player wiring is needed.

## Build

```bash
pnpm --filter @gavinmcfarland/canvas build   # → dist/index.js (ESM, React external)
```

`vite build` (lib mode) bundles the engine to `dist/index.js` with React marked as
a peer/external. `prepublishOnly` runs it automatically on `npm publish`. The
stylesheet is plain CSS shipped as-is via the `./styles.css` export.

Inside this monorepo the portfolio consumes the package **as source** through a
Vite alias (see `packages/portfolio/vite.config.js`) for instant HMR across
packages; set `CANVAS_FROM_DIST=1` to build against the compiled `dist` instead
(the path external npm consumers take).

## Status

Complete and verified in both modes (fullscreen + section embed) and consumed
both as source and as the built `dist`. Engine is fully prop-driven and decoupled
from window/`document.body` globals: container-relative measurement (fit/zoom/pan
observe the viewport, not the window), scoped wheel + pointer-gated keyboard so an
embed never steals the host page's scroll or keystrokes, all state/styles scoped
under `.canvas-root` (multiple independent instances per page), a `fit` prop for
contain/fullscreen, and a bundled library build for publishing.
