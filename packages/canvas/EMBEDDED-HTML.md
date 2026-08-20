# Embedding HTML documents in the canvas

Notes for whoever maintains a tool that **generates** HTML documents to be dropped
onto the canvas as `html` nodes — currently `portfolio-screenshot-tool`.

Nothing here is required. A document that ignores all of it still renders and
zooms correctly; the canvas is defensive about what it's handed. This is about
how cheap the zoom can be, and about one constraint that a generator is much
better placed to satisfy than the canvas is.

Measurements below come from a real export,
`home-20260729-005307-734-play.html` (3.77 MB), profiled 2026-07-29. Where a
claim is reasoning rather than measurement it says so.

## How the canvas embeds and zooms a document

A dropped document becomes a node holding a live `<iframe>`
(`nodes/Html.jsx`). The iframe is `sandbox="allow-scripts"` **without**
`allow-same-origin`, so the document runs at an opaque origin: the host page
cannot touch `contentDocument`, and the document cannot touch the host. Every
host↔document interaction is `postMessage` only.

The board zooms by applying `transform: translate() scale()` to one world
element that contains every node, and it deliberately keeps that element
**un-promoted** (`will-change: auto`) during the zoom glide. That means the
browser re-rasterizes at the live scale on every frame instead of stretching one
cached bitmap, which is what keeps text crisp all the way through a zoom rather
than blurring and snapping. The cost is that everything visible repaints per
frame — including the full render tree of every embedded document.

So: **during a zoom, your document is repainted ~60×/second.** That is the
budget everything below is about.

## What the canvas injects into your document

At ingest the canvas rewrites the document to add three `<script>` blocks at the
end of `<head>`. Each is stamped with a version; on re-ingest an older copy is
stripped and replaced (`injectBridge` in `src/html-bridge.js`).

| Marker | Purpose |
|---|---|
| `data-cv-theme-sync="2"` | Applies the host's light/dark theme. Rewrites the document's `prefers-color-scheme` media rules, sets `color-scheme`, toggles a `dark` class on `<html>`, and patches `matchMedia` so prefers-color-scheme queries answer with the host theme (see below). Boot theme arrives in the URL hash (`#cv-theme=dark`) so the first paint is already correct; later flips arrive as `postMessage`. |
| `data-cv-zoom-opts="4"` | Listens for `{ type: 'canvas-zoom', active, scale }` and sets two classes on `<html>`: `cv-zooming` while a gesture runs (disables `box-shadow` / `text-shadow`), and `cv-flat` while zoomed in past 1:1 or mid-gesture (disables `backdrop-filter` — see below). |
| `data-cv-input="1"` | Keeps the document interactive while the board owns every gesture. In view mode the iframe is `pointer-events: none` behind a shield, so nothing reaches the document directly; this replays the cursor and any press that turned out to be a tap as real DOM events, and mirrors the document's `:hover` rules onto a class so hover states still show. See `INTERACTIVE-IFRAMES.md`. |

**If your generator emits a block carrying the current marker and version
itself, the canvas leaves it alone.** That's the supported way to own this
behaviour — for example, to scope the effect-stripping to specific elements
instead of universally, or to add document-specific work on the same signal.

### Theming from script

Rewriting media rules only reaches a document that themes itself in CSS. If your
generator picks colours in JavaScript — a `darkMode` flag, a class set from
`matchMedia` — read the query and **listen to it**:

```js
const scheme = matchMedia('(prefers-color-scheme: dark)');
let dark = scheme.matches;
scheme.addEventListener('change', (e) => { dark = e.matches; render(); });
```

Nothing canvas-specific in that, and it is what the document should do
standalone anyway. Inside the canvas, `matchMedia` is patched so
prefers-color-scheme queries report **the board's** theme rather than the OS, and
fire `change` when the host flips. A document that only reads `.matches` once at
boot still gets the right first paint, but then sits at that theme while the page
around it changes — which is the bug this half of the bridge exists to prevent.

`(prefers-color-scheme: no-preference)` is left to the real OS: the host is
always one of light or dark, so it has no honest answer. Every other media query
passes straight through.

### The `canvas-zoom` message

```js
addEventListener('message', (e) => {
  if (!e.data || e.data.type !== 'canvas-zoom') return;
  document.documentElement.classList.toggle('cv-zooming', !!e.data.active);
});
```

Sent on zoom-glide edges only — `active: true` when a glide starts, `false` when
it settles. **Not** sent for panning or pinch-zoom: those promote the world to
its own compositor layer and composite on the GPU, so nothing repaints and there
is nothing to save.

## The constraint: containment vs. `position: fixed`

This is the part worth designing around, because it's the one the canvas cannot
solve on its own.

The obvious way to make a document cheap to repaint is CSS containment:

```css
/* DO NOT DO THIS — see below */
html.cv-zooming body      { contain: layout paint; }
html.cv-zooming body > *  { content-visibility: auto; contain-intrinsic-size: auto 500px; }
```

The canvas shipped exactly this (zoom-opts v1) and had to withdraw it, because
**`contain: layout`, `contain: paint` and `content-visibility: auto` all make
the element a containing block for `position: fixed` descendants.** That is
specified behaviour, not a browser quirk. Applying any of them re-anchors every
fixed-position element in the document from the iframe viewport to the contained
box — so a fixed header, nav or floating control visibly jumps the moment a zoom
starts, and jumps back when it ends.

The profiled export has **4 `position: fixed` elements** (one `button`, three
`div`s), all nested inside body's wrapper div. Every one of them moved on every
zoom.

`content-visibility: auto` carries a second problem: it brings
`contain-intrinsic-size`, whose placeholder dimensions stand in for the real
ones on anything not yet rendered. Get the placeholder wrong and the document
reflows around it.

So zoom-opts v2 is restricted to properties that change **paint only** and
therefore cannot move a box: `box-shadow`, `text-shadow`, `backdrop-filter`.
That is the safe subset for an arbitrary document. It is also the smaller half
of the available win.

### What a document has to guarantee to get the bigger half back

Containment becomes safe when no fixed-position element has a contained
ancestor. Concretely, if the generator can guarantee all three of these:

1. **No `position: fixed` element sits inside a section wrapper.** Either emit
   none, or hoist them to be direct children of `<body>` — then containment
   applied to *sibling* sections never sits between them and the viewport.
   (`position: sticky` is fine: it resolves against the nearest scroll
   container, which containment does not change.)
2. **`<body>` itself is never the contained element** — only its section
   children are. Containing `<body>` re-anchors even its direct children.
3. **Each section carries a truthful `contain-intrinsic-size`.** A screenshot
   tool already knows every section's rendered width and height, so it can emit
   `contain-intrinsic-size: 1440px 812px` rather than leaving the canvas to
   guess. Exact values make `content-visibility: auto` layout-neutral by
   construction.

…then it can declare that and the canvas can re-enable the strong mode for that
document. There is no such declaration today — if you get to the point of
wanting it, the agreed marker is worth adding to both sides at once. A `<meta>`
element is the natural carrier:

```html
<meta name="cv-zoom" content="containment-safe">
```

## The other constraint: nothing composited can re-rasterize

The board scales its world with a CSS transform, and leaves it un-promoted so
the browser re-rasterizes at the live scale — that's what keeps embedded
documents crisp at any zoom.

An element that is **composited into its own render surface** opts out of that.
Its surface is rasterized once and then GPU-scaled by the ancestor transform, so
it never re-rasters at the board's scale. In a document that is otherwise sharp,
that one subtree stays permanently soft — at *every* zoom level, not just during
a gesture. It reads as "this element didn't re-render and everything around it
did", which is exactly how it was first reported.

`backdrop-filter` is the common way to trip this, and it does so even when the
effect is invisible. A real export carried:

```css
backdrop-filter: blur(0px) saturate(1.4)
```

— zero blur, because the source skin had turned it off via a custom property,
but `saturate()` alone still forces the surface. **Turning the radius to `0` does
not avoid the cost; only `none` does.**

Removing and re-applying the filter does not help. It recreates the surface, but
at the same ~1:1 raster scale — which is why a gesture-scoped strip (zoom-opts
v2) still left the element soft once the board settled. There is no way to hand
the child compositor the parent's effective scale.

So the canvas gates it on scale instead (zoom-opts v4). A ~1:1 raster is fine at
or below 100% and visibly soft above it, so `backdrop-filter` renders normally at
or below 1:1 and is disabled past it. A frosted design reads as intended when the
board is viewed as a whole, and flattens rather than blurs when a reader zooms in
to inspect detail — which is exactly when sharpness beats decoration.

If the generator can avoid emitting `backdrop-filter` at all, the document keeps
full control of its own appearance at every zoom level.

Other properties that create a render surface and will behave the same way:
`filter`, `opacity` below 1, `mix-blend-mode`, `will-change: transform`, and 3D
transforms. The canvas deliberately does **not** strip `filter` or
`mix-blend-mode` — they're load-bearing for real designs — so a generator that
emits them on fine-detail content should expect that content to stay soft.

In the profiled export, `backdrop-filter` appeared on **13 elements, all as
inline styles** (none in the stylesheets, none with `!important`). Inline is
worth noting: it means the value was baked at capture time from a computed
style, and no amount of changing the *source* stylesheet afterwards affects the
exported copy.

## A third thing: `content-visibility` needs sections to skip

Even setting the fixed-position problem aside, `content-visibility: auto` on
`body > *` earns nothing on the profiled export, because:

```
<body>
  <div>…the entire page…</div>     ← 1 real child
  <script>…</script>
  <script>…</script>
</body>
```

There is one real body child. It always intersects the viewport, so it can never
be skipped, so nothing is ever saved. Off-screen skipping only pays when the
document is emitted as **several top-level sections**, each independently
skippable. That is a structural property of the export, and only the generator
can supply it.

## Measured profile of a real export

`home-20260729-005307-734-play.html`, 3,774,960 bytes:

| | |
|---|---:|
| Elements | 606 |
| Elements with an inline `style` attribute | 577 (95%) |
| Inline-style bytes | 748,050 (20%) |
| Declarations inlined | 26,317 (avg 45 per element) |
| `<style>` blocks | 22 |
| CSS bytes | 2,780,066 (**74%**) |
| CSS rules (`{` count) | 8,168 |
| `data:` URIs | 6 (13,208 bytes, 0.3%) |

Two things stand out, both fixable in the generator and neither requiring any
canvas change.

### 1. A megabyte of the file is byte-identical duplicate stylesheets

Of the 22 `<style>` blocks, only 15 are unique. Seven are exact duplicates of
another block:

| Block | Copies | Size each | Total |
|---|---:|---:|---:|
| `e55039c2d6` | 3 | 191,702 | 575,106 |
| `3701a8be34` | 3 | 110,476 | 331,428 |
| `7280ab6cb9` | 2 | 192,380 | 384,760 |
| `4fb24b2b29` | 2 | 125,197 | 250,394 |
| `d396dbd286` | 2 | 125,752 | 251,504 |

Deduplicating by content hash takes the CSS from 2,780,066 to 1,732,381 bytes —
**1,047,685 bytes, 28% of the whole file, removed mechanically** with no
judgement calls and no risk to rendering. This looks like the same stylesheet
being captured once per component or per route rather than once per document.

### 2. The export ships resolved styles *and* the stylesheets that produced them

95% of elements carry an average of 45 inline declarations — a full computed-style
dump, including longhands nothing reads (`border-block-end-color:currentcolor`,
`-webkit-text-stroke-color:currentcolor`). Alongside that, 8,168 CSS rules that
largely produced those same values.

For the static rendering the two are redundant. Pruning the stylesheets to only
what inline styles structurally cannot express would be a large further cut:

- `@media` rules (28, of which 23 are `prefers-color-scheme`) — **required**, the
  theme-sync bridge rewrites these to follow the host theme. Removing them breaks
  dark mode.
- `@keyframes` (6) and `@font-face` (8) — required.
- `:hover` / `:focus` rules (30) — required for a live demo.
- `::before` / `::after` (2) — required.

Everything else is a candidate. Exact savings depend on how the rules
distribute, so this one needs measuring rather than a promised number, but it is
plainly the largest remaining item after deduplication.

**Caveat on both:** these are measurements of file composition, and the
reasoning that they cost zoom performance is reasoning, not profiling. 606
elements is a small DOM, and a transform-only scale does not itself trigger
style recalculation. What large CSS does make expensive is *invalidation* — and
the `cv-zooming` class toggle on `<html>` invalidates against a universal
selector twice per gesture. Whether that is material at 8,168 rules is unmeasured.
Deduplication is worth doing regardless, on file-size grounds alone.

## Priorities

If you only do one thing, do the deduplication — it is mechanical, risk-free,
and removes 28% of the file.

0. **Stop emitting `backdrop-filter`.** Already worked around in the canvas, but
   it's the generator's to own — see the compositing section. Anything composited
   stays soft at every zoom level.
1. **Deduplicate `<style>` blocks by content hash.** −1.05 MB, no rendering change.
2. **Emit the page as several top-level `<body>` sections** rather than one root
   div, with a truthful `contain-intrinsic-size` on each. Prerequisite for
   off-screen skipping ever being useful.
3. **Keep `position: fixed` elements as direct children of `<body>`.**
   Prerequisite for containment being safe at all.
4. **Prune stylesheet rules the inline styles already resolved**, preserving
   media queries, keyframes, font-face and interaction states.

1 is independently worthwhile. 2 and 3 together are what would let the canvas
re-enable the containment mode that had to be withdrawn.

## Verifying a change

There is no automated check for this. To confirm a document behaves:

1. Drop it on a board and zoom in and out across the full range.
2. Watch anything fixed-position — a header, a floating button. It must not move
   relative to the frame at any point during the gesture, including the first
   and last frame.
3. Watch section boundaries for reflow as the gesture starts and ends.
4. Confirm dark mode still follows the host's theme switcher — the theme bridge
   depends on `prefers-color-scheme` rules surviving whatever pruning you do.

## Related

- `INTERACTIVE-IFRAMES.md` — the other half of embedding: how the board pans and
  zooms over a document while the document stays hoverable and clickable. Worth
  reading if your generator emits anything with hover states, forms or its own
  scrolling.
- `src/html-bridge.js` — `THEME_SYNC`, `ZOOM_OPTS`, `INPUT_BRIDGE`, the version
  table and `injectBridge`. The single definition; both the runtime and the
  backfill script import it.
- `src/CanvasProvider.jsx` — ingest (`addHtmlFromFile`) and the gesture window
  (`beginGesture` / `endGesture` / `postZoomPaintMode`).
- `src/nodes/Html.jsx` — the iframe node, sandboxing, theme messaging.
- `packages/portfolio/scripts/inject-canvas-bridge.mjs` — upgrades the bridge in
  already-committed assets.
- `visual-code-editor/CANVAS_ZOOM_RASTERIZATION.md` — the prior art this
  approach was ported from, including the tile-memory and rasterization
  tradeoffs that apply to an Electron host but not a browser one.
