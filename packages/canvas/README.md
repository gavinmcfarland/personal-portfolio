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

A live, fully re-skinned embed example lives in [`demo/`](demo/) — run it with `npm run demo` (see [Styling](#worked-example--a-completely-bespoke-skin)).

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
| `classNames` | `{ [part]: string }` | `{}` | Extra classes merged onto the chrome parts, e.g. `{ root, canvas, toolbar, topbar, zoom, properties, pages, saveStatus }`. See [Styling](#styling). |
| `components` | `{ [slot]: Component \| null }` | `{}` | Replace or hide whole chrome pieces: `{ TopBar, Toolbar, ZoomControls, SaveStatus, Recorder, ContextMenu, Lightbox }`. A component swaps the built-in; `null` hides it. See [Styling](#styling). |
| `initialState` | serialized snapshot | `null` | Committed board to load (the shape produced by `serialize()`). |
| `editable` | `boolean` | `false` | Enables the toolbar, editing, and localStorage autosave. |
| `storageKey` | `string` | `embed-canvas-v1` | localStorage key for the editable autosave. Unique per instance. |
| `homeId` | `string` | `home` | Id of the first (permanent) page. |
| `fit` | `'contain' \| 'fullscreen'` | `'contain'` | `contain` fills the parent box; `fullscreen` covers the browser viewport. |
| `fullscreenButton` | `boolean \| 'native' \| 'document'` | `false` | Show a button next to the zoom controls that expands the canvas. `true` / `'native'` uses the browser Fullscreen API (covers the whole screen, escapes the page); `'document'` toggles a full-bleed overlay that covers the document's viewport but stays inside the page (Esc exits). |
| `theme` | `{ mode, toggle }` | `null` | Renders a theme-cycle button in the top bar when provided. Dark mode also activates from a `.dark` ancestor. |
| `accent` | `string \| { light, dark }` | purple | Accent/theme colour for the UI (selection, active tool, frames, hover, edit caret). A single CSS colour applies to both themes; `{ light, dark }` varies per theme. |
| `onPublish` | `(snapshot) => Promise` | `null` | Persist the board somewhere durable. Shows the "Save" button when set. |
| `onUploadImage` | `(file, dataUrl) => Promise<url>` | inline / IndexedDB | Resolve a `src` for dropped images. |
| `onUploadVideo` | `(file, dataUrl) => Promise<url>` | IndexedDB | Resolve a `src` for dropped videos. |
| `onUploadAudio` | `(file, dataUrl) => Promise<url>` | inline / IndexedDB | Resolve a `src` for dropped / pasted / recorded sound clips. |
| `onChange` | `(snapshot) => void` | `null` | Fires after every autosave. |
| `collide` | `boolean` | `false` | Reposition objects so they don't overlap when the container is too narrow to fit their authored layout. View-mode only; positions are derived, never persisted. |
| `collideStrategy` | `'organic' \| 'push-down' \| 'pack'` | `'organic'` | `organic` (default) keeps every object at its authored position and moves only what overlaps / falls out of view, flowing the overflow downward — nothing moves if it already fits; `push-down` pins each object's x to the band's left edge and stacks overlaps into a reading-order column; `pack` recomputes all positions into a balanced grid centred in the visible box. |
| `collideSeparate` | `boolean` | `false` | (`organic` strategy) also prise apart *intentional* overlaps when reflowing. Default `false`: authored-overlapping objects form a rigid group that reflows as one unit — it routes around other objects but its members never shift relative to each other, so the overlap is kept exactly. Set `true` to separate every overlap. |
| `collideGap` | `number` | `16` | Minimum gap (world px) kept between repositioned objects. |
| `layoutWidth` | `'viewport' \| number` | `'viewport'` | (`push-down` only) the band's width. `viewport` = the container's width in world units; a number fixes it in world px. |
| `collideOrigin` | `'content' \| number` | `'content'` | (`push-down` only) the band's left edge: `content` = the left-most object, or an explicit world x. |
| `scrollbars` | `false \| 'auto' \| 'x' \| 'y'` | `false` | Show a scrollbar on an axis only while content extends past the viewport on that axis (it auto-hides when everything fits). `'auto'` = both axes; `'x'` / `'y'` = that axis only. The board is a transform pan/zoom surface, not a native scroller, so each bar is a thin screen-space overlay whose thumb is draggable to pan that axis. |

### Responsive collision resolution

With `collide`, the canvas measures its container and, when the authored layout no
longer fits, repositions whole objects so they don't overlap — without changing
anything *inside* an object. Repositioned coordinates are **derived**: the node model
(and saved snapshot) keep their authored positions, so an object that still fits never
moves, and growing the container back returns everything to exactly where it was.
Resolution runs in view mode only — while editing you author at the real positions, so
a board can be both edited and collision-driven (the two just don't run at once).

```jsx
<Canvas collide />                 {/* default: organic, minimal-displacement */}
<Canvas collide collideStrategy="pack" />   {/* balanced centred grid */}
```

The default `organic` strategy preserves the board's arrangement — as the container
narrows, each object holds its authored position until it would overlap or leave the
view, then only the overflow flows downward. Frames are treated as section/background
regions — they neither push nor get pushed.

Built-in node types: `sticky`, `tblock` (text), `md` (markdown), `code`, `frame`,
`image`, `video`, `sound`, `link`, `html`, plus freehand `shape`s.

### Text blocks

Text blocks carry light formatting: **bold**, *italic*, underline and
strikethrough, plus bulleted and numbered lists. The properties panel shows a
format row whenever a text block is selected — with the block open for editing
the buttons apply to the current selection (and light up to match the caret),
and with it merely selected they apply to the whole block. The browser's own
`⌘B` / `⌘I` / `⌘U` work while editing too.

Lists also format themselves as you type: opening a line with `- `, `* `, `+ `,
`1. ` or `1) ` drops the marker and turns the line into a real list item, with
Enter continuing the list and a second Enter leaving it.

Formatting is stored as an `html` field on the node, alongside the `text` field
that stays the plain-text mirror (page labels, clipboard, search all read
`text`). Only blocks that actually carry formatting get an `html` — snapshots
authored before rich text, and blocks the user never formats, save exactly as
they did before. The markup is restricted to a small subset — `strong`, `em`,
`u`, `s`, `ul`, `ol`, `li`, `br`, `div`, with no attributes at all — and every
string is sanitised down to that subset on load, on paste and on commit, so a
snapshot can be treated as data rather than trusted markup.

In edit mode the top bar shows a background-colour picker (presets or a custom
colour) that recolours the whole board; the choice is stored on the snapshot as
`bgColor` and applies in read-only views too. Picking "Theme default" removes
the override so the board follows the light/dark theme tokens again.

In edit mode, images and videos can be dragged onto the board either as local
files or straight from another browser tab (the drop arrives as a URL). Animated
image formats (GIF/WebP/AVIF) are stored untouched and play automatically —
image nodes render a plain `<img>`, so no player wiring is needed. SVGs are
supported too: they render crisply at any zoom, and their intrinsic size is read
from the markup (`width`/`height`, else the `viewBox` aspect ratio) so
viewBox-only exports land at the right proportions instead of a default box. Video nodes
autoplay muted and looped on the board (GIF-style); hovering one reveals a
play/pause + scrub bar, and double-click opens the lightbox with native
controls and sound.

Sound is a first-class object too. Audio files (`mp3`, `wav`, `m4a`, `aac`,
`ogg`, `flac`, …) can be **dragged in** or **pasted** — each lands as a
fixed-size player card with a play/pause button, its name, and a scrub bar with
elapsed / total time. The toolbar's mic button (shortcut `S`) **records**
straight from the microphone: pressing it starts capturing and shows a floating
recorder (live timer + stop / cancel); stop drops the finished clip on the
board, cancel or `Esc` discards it. Playback works in read-only views so
published boards stay listenable. Recorded and dropped clips are stored the same
way as other media — inline as a data URL when small, otherwise IndexedDB (or
`onUploadAudio` when provided). The mic button hides itself where the browser
can't record.

Without upload adapters, small images inline into the snapshot as data URLs,
while videos and large images are stored in IndexedDB (scoped per `storageKey`,
garbage-collected on load) with only an `idb:<key>` reference in the snapshot —
localStorage's ~5MB quota can't hold real video bytes. `idb:` refs only resolve
in the browser profile that dropped them, so wire `onUploadImage`/`onUploadVideo`
to real storage for boards you intend to publish for other viewers.

## Styling

Everything the canvas renders — the surface, the floating chrome, and every
object — is styled through one **scoped, namespaced contract**. All rules live
under `.canvas-root`, all custom properties are prefixed `--cv-`, and all classes
are prefixed `cv-`, so the component never leaks into (or inherits from) the host
page, and several boards can coexist with independent looks. Style it at whichever
level you need:

### 1. Design tokens — re-skin in a few lines

Override any `--cv-*` custom property on your own `.canvas-root` (or a wrapping
class / the `classNames.root` you pass). Tokens cascade: change `--cv-accent` and
every accent-derived surface (selection, active tool, frames, hover, edit caret,
`--cv-accent-soft`) re-tints with it.

```css
.my-board.canvas-root {
  --cv-accent: #ff5c00;
  --cv-surface: #12121a;
  --cv-ink: #eaeaf0;
  --cv-ui-radius: 8px;    /* chrome panel corners */
  --cv-radius: 3px;       /* object/card corners  */
  --cv-ui-blur: 0px;      /* flatten the frosted panels */
  --cv-shadow: none;
  --cv-sans: "Söhne", system-ui, sans-serif;
}
```

| Token | Role | Token | Role |
| --- | --- | --- | --- |
| `--cv-bg` / `--cv-bg-base` | board background | `--cv-accent` | primary accent (also `--cv-accent-soft`) |
| `--cv-surface` | raised object fill | `--cv-ink` / `--cv-muted` / `--cv-faint` | text tiers |
| `--cv-line` / `--cv-line-strong` | borders / dividers | `--cv-grid` / `--cv-grid-strong` | grid dots |
| `--cv-ui-bg` / `--cv-ui-border` | chrome panels | `--cv-shadow` | elevation |
| `--cv-radius` / `--cv-ui-radius` | object / panel corners | `--cv-ui-blur` | panel frost |
| `--cv-sans` / `--cv-serif` / `--cv-mono` / `--cv-hand` | font families | `--cv-snap-guide` | snap guides |
| `--cv-note-<hue>` / `--cv-note-<hue>-ink` | sticky-note paper + ink (`yellow` `pink` `blue` `green` `purple` `orange`) | `--cv-code-<tok>` | code syntax highlight (`comment` `keyword` `string` `number` `function` `tag` `punctuation`) |

Dark mode overrides the colour tokens automatically under a `.dark` ancestor (or
`.canvas-root.dark`); shape tokens (`--cv-radius`, `--cv-ui-radius`, `--cv-ui-blur`)
and the note palette are theme-independent, while `--cv-code-*` has its own dark
values. The `accent` prop is just a scoped, per-instance writer for `--cv-accent`.
Overriding a `--cv-note-<hue>` reskins both the notes and the picker swatches.

### 2. Part hooks — restyle specific regions and objects

Every region and object carries a stable `data-cv-part` attribute — target these
rather than internal class names (which are implementation detail):

`canvas` (the pannable surface) · `toolbar` · `topbar` · `zoom` · `properties`
(the swatches panel) · `pages` · `recorder` · `context-menu` · `lightbox` ·
`save-status` · `node` · `shape`

Objects also expose `data-type` (`sticky`, `tblock`, `md`, `code`, `frame`,
`image`, `video`, `sound`, `link`, `html`). **State is expressed as `data-*`
attributes**, not classes — the root carries `data-tool="<tool>"` and
`data-readonly`; elements carry `data-active`, `data-on`, `data-open`,
`data-editing`, `data-dragging`, `data-recording`:

```css
.canvas-root [data-cv-part="toolbar"] { border-radius: 0; }
.canvas-root [data-cv-part="node"][data-type="sticky"] { border-radius: 0; }
.canvas-root [data-cv-part="node"][data-type="code"] { --cv-mono: "Fira Code"; }
.canvas-root [data-cv-part="toolbar"] .cv-tool[data-active] { outline: 2px solid var(--cv-accent); }
.canvas-root[data-tool="pen"] { /* style the whole board while the pen tool is active */ }
```

### 3. `classNames` prop — inject your own classes

For the singleton chrome parts, merge a class of your own without any specificity
fight (yours always comes last):

```jsx
<Canvas classNames={{ root: 'my-board', toolbar: 'my-toolbar', canvas: 'my-surface' }} />
```

Keys: `root`, `canvas`, `toolbar`, `topbar`, `zoom`, `properties`, `pages`,
`saveStatus`. Per-object classes aren't needed — style objects via the
`data-cv-part="node"` / `data-type` hooks above, or replace their markup entirely
with the `nodeTypes` prop.

### 4. Headless — build the chrome and skin from scratch

The stylesheet ships as two layers:

```jsx
import '@gavinmcfarland/canvas/core.css'   // structure: geometry, camera, interaction — REQUIRED
import '@gavinmcfarland/canvas/theme.css'  // the default skin (colour/border/radius/font) — OPTIONAL
```

`@gavinmcfarland/canvas/styles.css` is just those two together (the default). Import
**`core.css` alone** to get a fully working but unstyled board — nodes are
positioned, the camera pans/zooms, tools work — with none of the default look, then
write your own skin against the tokens and `data-cv-part` hooks. `core.css` never
depends on a colour token, so nothing you leave unstyled breaks the engine.

(`core.css` / `theme.css` are generated from the authored `canvas.css` by
`npm run split-css`; `prepublishOnly` regenerates them.)

To replace the **chrome components** themselves — not just their styles — pass
`components`. Each replacement reads board state through `useCanvas()`, so it needs
no props; `null` hides a piece entirely:

```jsx
import { useCanvas } from '@gavinmcfarland/canvas'

function MyToolbar() {
  const { tool, eng } = useCanvas()
  return <div className="my-toolbar">{/* your buttons calling eng.setTool(…) */}</div>
}

<Canvas editable
  components={{ Toolbar: MyToolbar, ZoomControls: null }}  // custom toolbar, no zoom control
/>
```

Slots: `TopBar`, `Toolbar`, `ZoomControls`, `SaveStatus`, `Recorder`, `ContextMenu`,
`Lightbox`, `NotesDrawer`, `PresentBar`. Objects are swapped the same way through
`nodeTypes`.

## Presenting

Any board with sections can be presented: **Present** in the top bar takes it full
bleed, hides every panel, drops to view-only and parks on the first section. `←`/`→`
(and `space` / `PageUp` / `PageDown`, so a clicker works) step through the running
order; `Esc` ends it and hands the board back in the mode it was found in.

Each section carries **speaker notes** — right-click a frame → *Add speaker notes…*.
They live on the node, so they undo and save like anything else, and they are never
drawn on the board: the only things that read them are the notes drawer and the
remote.

A **phone remote** is optional and needs a transport, since the canvas has no server
of its own. Pass `presentRelay`:

```jsx
<Canvas editable presentRelay={{
  publish: ({ room, deck, index }) => {…},   // board → listeners
  subscribe: (room, onCmd) => unsubscribe,   // listeners → board ('next' | 'prev' | 'goto')
  link: async (room) => ({ url }),           // the address to show as a QR code
}} />
```

Without it, present mode still works — the phone button just isn't offered. The
board is the only writer of the position: a remote sends a command and learns where
it landed from the next `publish`, so the two can never disagree about the current
section. See `vite-plugin-present.js` in the portfolio for a dev-server relay built
on Server-Sent Events.

### Worked example — a completely bespoke skin

`demo/enamel` re-skins the whole board to a bespoke "Enamel" look (flat enamel
colour-fills, no curves or shadows, mono type) — using **only** this contract:
`--cv-*` tokens, `data-cv-part`/`data-type` selectors and the `classNames.root`
scope, with **zero** changes to the package. It follows the system colour scheme,
serving two surfaces (dark graphite / light steel) off the canvas's own `.dark`
ancestor mechanism. The whole look lives in one stylesheet,
[`src/enamel.css`](src/enamel.css); the board itself is an editable
`<Canvas base={…} classNames={{ root: 'enamel' }} />`. Run it with:

```bash
npm run demo   # → http://localhost:5178  (Vite, consumes the package from source)
```

## Further reading

- [EMBEDDED-HTML.md](EMBEDDED-HTML.md) — what the canvas injects into a dropped
  HTML document, the `canvas-zoom` message contract, and what a document (or the
  tool that generates it) can do to make zooming cheaper. Read this before
  changing `injectBridge` or the zoom paint mode.

## Build

```bash
pnpm --filter @gavinmcfarland/canvas build   # → dist/index.js (ESM, React external)
```

`vite build` (lib mode) bundles the engine to `dist/index.js` with React marked as
a peer/external. Styles are plain CSS shipped as-is: `canvas.css` is the authored
source, from which `npm run split-css` generates `core.css` (structure) +
`theme.css` (skin); `styles.css` is the two combined (the `./styles.css` export).
`prepublishOnly` regenerates the split and runs the bundle on `npm publish`.

Inside this monorepo the portfolio consumes the package **as source** through a
Vite alias (see `packages/portfolio/vite.config.js`) for instant HMR across
packages; external npm consumers take the compiled `dist` path instead.

## Status

Complete and verified in both modes (fullscreen + section embed) and consumed
both as source and as the built `dist`. Engine is fully prop-driven and decoupled
from window/`document.body` globals: container-relative measurement (fit/zoom/pan
observe the viewport, not the window), scoped wheel + pointer-gated keyboard so an
embed never steals the host page's scroll or keystrokes, all state/styles scoped
under `.canvas-root` (multiple independent instances per page), a `fit` prop for
contain/fullscreen, and a bundled library build for publishing.
