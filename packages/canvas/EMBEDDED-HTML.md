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

At ingest the canvas rewrites the document to add four `<script>` blocks at the
end of `<head>`. Each is stamped with a version; on re-ingest an older copy is
stripped and replaced (`injectBridge` in `src/html-bridge.js`).

| Marker | Purpose |
|---|---|
| `data-cv-theme-sync="2"` | Applies the host's light/dark theme. Rewrites the document's `prefers-color-scheme` media rules, sets `color-scheme`, toggles a `dark` class on `<html>`, and patches `matchMedia` so prefers-color-scheme queries answer with the host theme (see below). Boot theme arrives in the URL hash (`#cv-theme=dark`) so the first paint is already correct; later flips arrive as `postMessage`. |
| `data-cv-zoom-opts="5"` | Listens for `{ type: 'canvas-zoom', active, scale }` and sets one class on `<html>`: `cv-flat`, while zoomed in past 1:1 or mid-gesture (disables `backdrop-filter` — see below). Nothing else about the document's paint changes during a gesture: v4 and earlier also stripped `box-shadow` / `text-shadow` for the duration, which was visible as shadows blinking off mid-zoom, and no longer happens. |
| `data-cv-input="3"` | Keeps the document interactive while the board owns every gesture. In view mode the iframe is `pointer-events: none` behind a shield, so nothing reaches the document directly; this replays the cursor's position and any press that turned out to be a tap as real DOM events, mirrors the document's `:hover` rules onto a class so hover states still show, and reports the cursor the document would be showing back out for the board to put on the shield. See `INTERACTIVE-IFRAMES.md`. |
| `data-cv-page="1"` | Remembers which screen the document is on, so a board opens on the one its author chose. Answers `{ type: 'canvas-page-get' }` with a description of the current page and walks the document back to one handed over as `{ type: 'canvas-page-restore', page }`. Hides the document from its first paint when the boot hash carries `cv-page=1`, so a restore is never seen happening, and tells the board when a reader has moved the document off that screen. See below. |

**If your generator emits a block carrying the current marker and version
itself, the canvas leaves it alone.** That's the supported way to own this
behaviour — for example, to scope the `backdrop-filter` flattening to specific
elements instead of universally, or to add document-specific work on the same
signal.

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

Ingest checks for this: a document that queries the media list without listening
to it is warned about on drop and fails `pnpm canvas:audit`. See “Verifying a
change”.

### The `canvas-zoom` message

```js
addEventListener('message', (e) => {
  if (!e.data || e.data.type !== 'canvas-zoom') return;
  const { active, scale } = e.data;
  document.documentElement.classList.toggle('cv-flat', !!active || scale > 1.02);
});
```

Sent on zoom-glide edges only — `active: true` when a glide starts, `false` when
it settles. **Not** sent for panning or pinch-zoom: those promote the world to
its own compositor layer and composite on the GPU, so nothing repaints and there
is nothing to save.

A document that hooks this itself should think in *scale*, not in motion.
Anything keyed purely on `active` toggles a visual property on and off around
every gesture, and a reader watching the document sees the property go, not the
frame time it bought — which is why the bridge no longer strips shadows on it.

### The cursor your document shows

The pointer is never in your document — it is on the board's shield, over an
iframe that has been made inert so the board can be panned across it (the whole
arrangement is in `INTERACTIVE-IFRAMES.md`). A cursor follows the real pointer
and no message can move it, so an embed would be an arrow from edge to edge
however many buttons it has.

So the input half reads what your document *would* be showing under the
forwarded position — after the hover mirror is applied, so a `cursor: pointer`
that only appears on `:hover` counts — and posts it out for the shield to wear.
A button in an embed comes with a pointer, a paragraph with an I-beam, a
resizable pane with its arrows.

Until it says otherwise, an embed you can drive is a plain arrow rather than the
board's `grab`. A view-mode board is drag-to-pan everywhere, and over a demo
that is the wrong thing to say: it offers the one gesture the board reserved and
hides the several yours would answer. (A node whose **Interactive** is switched
off keeps the `grab` — see below. There, panning really is all it affords.)

This asks nothing of your document: it is your own CSS, read back. `cursor:
auto` is resolved the way the renderer would (an I-beam over text you could
select or type into, an arrow elsewhere), and a cursor set from script is read
the same way, since it is the computed value either way.

The one thing worth knowing is that **an image cursor cannot cross**. `url()`
resolves against your document, which the board cannot reach — and a relative
path would resolve against the host page instead. So list a keyword after it, as
you would for a browser that fails to load the image:

```css
cursor: url(pencil.png) 4 12, crosshair;   /* the board shows: crosshair */
cursor: url(pencil.png) 4 12;              /* the board shows: an arrow */
```

### The start page: which screen the board opens you on

A prototype is usually several screens, and which one the board shows is the
author's decision. It is set by hand and stored on the node:

1. In edit mode, double-click the embed to make it live.
2. Navigate to the screen you want.
3. Press away (or right-click → **Set start page**).

The board then asks your document to describe where it ended up, keeps the
answer on the node, and hands it back on every load — so a visitor opens the
board on that screen. **Right-click → Clear start page** forgets it and reloads
the document onto its own first screen.

The description is your document's to make. The page half tries three things in
order:

| | How the screen is described | Restored by |
|---|---|---|
| 1 | `window.canvasPage.get()` — whatever you return, as long as it survives `JSON.stringify` | `window.canvasPage.set(page)` |
| 2 | `location.hash`, if your document routes by it (the board's own `#cv-theme=…` is stripped first) | assigning the hash, which fires `hashchange` as a real navigation would |
| 3 | The clicks that got the document there, recorded with a selector for each target | replaying them in order, under a veil, before anyone sees the document |

Tier 3 is the fallback that needs nothing of your document at all, which is why
it exists: a prototype typically keeps its screen in a plain variable and
re-renders on click, and there is nothing for the board to read. It is also the
brittle one — a document that renders a different tree on a different day (a
list of live data, a random layout) can have its trail land somewhere else, and
a trail is capped at 60 clicks.

So if you own the document, spend the five lines:

```js
window.canvasPage = {
  get: () => state.screen,      // any JSON-serialisable value
  set: (p) => { state.screen = p; render(); },
};
```

Notes:

- `history.pushState` throws in these documents — they are sandboxed at an
  opaque origin — so tier 2 is the hash only. `search` and `pathname` are out of
  reach.
- **The document hides itself from its first paint, not from when the restore
  arrives.** The board writes `cv-page=1` into the boot hash of a node that has
  a saved page; the page half reads it synchronously at the end of `<head>` and
  goes to `opacity: 0` there. Waiting for the restore message would be several
  paints too late — the document would paint the screen it boots into, blink,
  and land on the saved one. Transitions are suppressed for the walk, and a
  watchdog reveals the document after 3s whatever happens, so one that fails to
  restore is still a document to show.
- When it arrives it posts `{ type: 'canvas-page-ready' }`. The board paints a
  spinner over a node it knows is restoring, and that message is what takes it
  down; the spinner is delayed 250ms, so a restore that lands in the usual
  couple of hundred milliseconds shows no indicator at all.

### Getting back: the reader's Reset

A reader can drive an embed wherever they like, so the board gives them the way
back — a **reload icon in the device frame's own toolbar**, which reloads the
document and hands it its start page again (or boots it into its own first
screen, for a node with none). On a browser frame it takes the place of the
decorative reload already drawn there, which is the control a reader would reach
for anyway; the plugin, terminal and platform frames get it at the right-hand end
of the bar. View mode only: an author has the context menu, and a live control in
every frame would be one more thing between them and the work.

**An embed with no device frame has no toolbar, and so has no way back.** Give
such a node a frame if its readers need one.

It appears only once there is somewhere to come back from. The page half posts
`{ type: 'canvas-page-moved' }` the first time a press actually changes the
document — comparing a signature of the document across the click itself, which
is the only comparison that holds up:

- **Across the click, not against a snapshot from load.** A prototype that is
  still settling when the board finishes opening it has moved by the time anyone
  touches it, and the reader's first press would report movement wherever they
  put it.
- **The markup, not the text.** A prototype often switches screens by class
  alone — the health app's drawer is in the DOM either way — and a text
  signature sees nothing happen.
- **Hashed, not measured.** Length collapses a document to one number and two
  unrelated changes can cancel: on that drawer, the content lost 14 characters
  while the hover class added exactly 14, and a length signature came back
  identical across a real navigation.
- **With the hover mirror's classes taken out.** The input half puts a class on
  every element under a replayed tap to drive CSS `:hover`; left in, every click
  would read as movement.

A document with a `window.canvasPage` hook needs none of that guesswork — its
answer is part of the signature, so a screen change is exact.
- Restoring is not a substitute for interaction: the document is genuinely on
  that screen afterwards, with its own state advanced, so a visitor carries on
  from there normally.

### Turning interactivity off

Some prototypes are on the board to be *looked at* — a screen that illustrates a
point, a demo that animates by itself. **Interactive** in an html node's
right-click menu toggles that. Switched off, the node is stored with `inert:
true` and:

- no hover position and no tap is forwarded into the document, so a click on it
  is an ordinary board click;
- nothing comes back out either, so the board's own cursor stays over the whole
  node — which is the honest signal, since nothing in there can be clicked;
- Shift no longer stands its shield down, so the escape hatch can't reach it
  either (the CSS excludes `.cv-html-inert`);
- the document still *runs* — its own animations play, the theme still syncs,
  a saved start page is still restored. It is a live rendering, not a picture.

Edit mode is deliberately unaffected: double-click still makes the node live,
because navigating to a screen is how its start page gets set.

The reason a reader can't drive it is worth stating plainly: a prototype with no
Reset (a frameless one — see above) that a visitor clicks off its screen stays
there for the rest of their visit. Turning interactivity off is the way to say
that a node is an illustration and should stay on the screen it was placed on.

## The constraint: containment vs. `position: fixed`

This is the part worth designing around, because it's the one the canvas cannot
solve on its own.

The obvious way to make a document cheap to repaint is CSS containment:

```css
/* DO NOT DO THIS — see below. `.zooming` here is a gesture-scoped class of your
   own; the bridge no longer sets one. */
html.zooming body      { contain: layout paint; }
html.zooming body > *  { content-visibility: auto; contain-intrinsic-size: auto 500px; }
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

So from v2 the mode is restricted to properties that change **paint only** and
therefore cannot move a box: `box-shadow`, `text-shadow`, `backdrop-filter`.
That is the safe subset for an arbitrary document. It is also the smaller half
of the available win.

From v5 it is smaller still: only `backdrop-filter`, and on scale rather than on
the gesture. The two shadow properties were dropped from the mode because
"cannot move a box" is a lower bar than "cannot be noticed" — a document's
shadows disappearing for the length of every zoom is a change the reader sees,
and depth is part of how these documents are designed.

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

## Shadows: stripped until v5, and what to do instead

For three versions the zoom paint mode's cheapest saving was also its most
visible one. zoom-opts v2–v4 injected:

```css
/* WITHDRAWN in v5 */
html.cv-zooming *,
html.cv-zooming *::before,
html.cv-zooming *::after { box-shadow: none !important; text-shadow: none !important; }
```

`cv-zooming` was set for the length of every zoom glide, so every shadow in the
document went flat when a zoom started and came back when it settled.

**Why it was withdrawn.** It obeyed the rule this mode is built around — paint
only, never layout, so nothing moved — but that rule turns out to be the wrong
bar. "Cannot move a box" is not "cannot be noticed". Shadows are how these
documents say what floats above what; dropping them for the length of a gesture
is the reader watching the *document* change while they move the *camera*, which
is the one thing a zoom must never look like. It also inverted the intent of the
un-promoted world: the board spends raster time per frame specifically so the
thing you are zooming into looks like itself all the way in.

The saving was also never measured on the documents this canvas actually embeds.
It was ported from awenate's paint-opts handler along with the containment half
(which was withdrawn in v2 for the `position: fixed` reason above), and shadows
survived three versions on that inherited reasoning alone.

So the rule for this mode is now stricter than "paint only":

> A zoom-time optimisation must be **invisible by construction** — cheap because
> the reader could not have seen the difference at that moment, not cheap because
> we decided they would forgive it.

`backdrop-filter` still qualifies: it is gated on *scale*, and it is switched off
exactly where a 1:1 filter surface would have been upscaled into softness, which
is a defect either way. A gesture-scoped strip of anything visible does not.

### Before optimising again: measure

Nothing below should be built on the same inherited reasoning that put the
shadow strip there. The profile in this document is of file *composition*; the
per-frame raster cost of a zoom over an `html` node has not been recorded. To
get that:

1. Chrome DevTools → **Rendering** → *Paint flashing* and *Frame rendering
   stats*. Zoom the board over the node. Confirm the iframe is actually
   repainting per frame rather than being composited already — a sandboxed
   iframe may be getting its own layer regardless of what the host does, in
   which case the whole premise of the paint mode is moot for that node.
2. **Performance** panel, record a zoom glide, and read the *Rasterize* track
   rather than total frame time. Shadow blur shows up as raster work, not as
   style or layout.
3. If raster is the bottleneck, use the paint profiler on one long frame: the op
   list attributes cost per draw call, so "blur passes on 40 stacked elevation
   shadows" and "one enormous background image" are distinguishable rather than
   both being "paint is slow".

The two numbers worth having before touching this again: raster ms/frame during
a glide with shadows, and the same with them forced off (the withdrawn rule,
pasted into the document by hand, is the control). If the delta is small the
question is closed.

### What the generator can do — these keep shadows at every zoom level

Blur cost tracks the *blurred area and radius*, not the element count, and every
shadow in a comma-separated list is its own pass. That gives four token-level
levers, plus one structural one below — none of which the reader ever sees
operating:

1. **Collapse elevation stacks to one shadow.** The Material/Tailwind idiom
   layers three to five shadows per card to fake a light model. Each is a
   separate blur over roughly the same area, so a five-shadow token costs about
   five times a one-shadow token — for a difference most designs cannot show you
   at 100%, let alone mid-glide. This is the largest shadow-side saving available
   and it is a token change.
2. **Cap the blur radius.** A `0 40px 80px` shadow on a full-width card blurs an
   area larger than the card. Halving the radius is closer to a quarter of the
   work, since the affected area shrinks in both axes.
3. **Put the shadow on the container, not on every row.** A list of 60 shadowed
   rows is 60 blur passes to draw one edge the reader reads as a single surface.
4. **Bake it.** A shadow that never animates can ship as a pre-blurred
   `border-image` 9-slice or a small PNG/SVG behind the element. Drawing a
   bitmap is cheap where running a blur is not, and upscaling a pre-blurred
   texture is safe for the reason given just below.

#### And the structural one: promote the shadow, not the element

This is the lever that makes the compositing constraint work *for* a document
instead of against it. Everything in the section above says a composited subtree
stays soft, because its surface rasters once and is then GPU-scaled — which is
fatal for text and fine detail. A blurred shadow has no fine detail: it is
low-frequency by definition, and upscaling it is invisible in a way that
upscaling type never is.

So draw the shadow on its own promoted layer and leave the content un-promoted
and crisp:

```css
.card { position: relative; /* no box-shadow here */ }
.card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.18);
  will-change: transform;   /* raster once, GPU-scale thereafter */
  z-index: -1;
}
```

The blur runs once, at whatever scale the layer was first rasterized at, and
every subsequent frame of the glide composites the cached texture. The card's
text is untouched and re-rasters crisply as before.

Two caveats, both real. Every promoted element costs layer memory, so this is
for the handful of large surfaces that carry the document's depth, not for every
shadowed element in it — `will-change` on hundreds of nodes trades a raster
problem for a memory one. And a shadow scaled far past the scale it rastered at
will eventually show soft banding on its edge; if a document is read at 400% and
the shadow is a hairline rather than a soft pool, this is not the technique for
it.

### What the canvas could do

None of these are implemented. In rough order of how much they buy against how
much they cost:

1. **Give the document the scale and let it decide.** The `canvas-zoom` message
   already carries `scale`, and the document is the only party that knows which
   of its shadows are structural and which are decoration. A document can strip
   its own decorative shadows below the scale where their blur falls under a
   device pixel — at 8% zoom a 16px blur is 1.3px and a 4px blur has nothing left
   to show — which is a strip the reader is physically unable to see. The canvas
   cannot do this universally, because it does not know any document's shadow
   tokens; the document can, and the generator can emit the rule.
2. **Promote the iframe for the length of the glide.** `will-change: transform`
   on `.cv-html-frame` at gesture start, removed at `endGesture` so the settled
   view re-rasters crisply. Repaint cost during the glide goes to zero — shadows,
   filters, blend modes and all — because the whole document becomes one texture
   the GPU stretches. What it spends is the thing the un-promoted world was
   bought with: the document is soft *while moving* and snaps sharp when it
   settles. That is a real regression to the glide's feel, but it is a uniform
   one — everything softens together, which reads as motion blur rather than as
   the document restyling itself. Worth prototyping as a per-node opt-in for the
   documents heavy enough to need it, rather than as a global default.
3. **Spend fewer frames.** The strip only ever paid for the duration of the
   lerp, so a shorter glide (a higher `ZOOM.lerp`) is the same saving with no
   fidelity cost at all — and re-rasterizing on every other frame during the
   glide halves raster work while keeping every property the document asked for.
   Both are worth trying before anything is taken away from the document again.
4. **Fix invalidation before paint.** The profile says CSS is 74% of the file and
   8,168 rules, a megabyte of it byte-identical duplicates. A universal-selector
   class toggle against a stylesheet that size is style work per gesture edge,
   and it is unmeasured. Deduplication is free and it is item 1 under Priorities
   for other reasons anyway.

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
the `cv-flat` class toggle on `<html>` invalidates against a universal selector
whenever it flips. Whether that is material at 8,168 rules is unmeasured. (It
flips less often than it used to: the gesture-scoped shadow strip that toggled a
second universal-selector class on every zoom edge is gone.)
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
5. **Collapse layered elevation shadows to one shadow per surface**, and cap the
   blur radius. Each shadow in a comma-separated list is its own blur pass over
   roughly the same area — see the shadow section. Cheapest way to make a zoom
   cheaper without anything disappearing during it.
6. **Promote the shadow rather than the element** on the few large surfaces that
   carry the document's depth (same section). Blur is low-frequency, so a cached
   shadow texture upscales invisibly where cached text would not.

1 is independently worthwhile. 2 and 3 together are what would let the canvas
re-enable the containment mode that had to be withdrawn. 5 is a token change
that pays on every frame of every glide, and it is the reason the canvas no
longer needs to strip shadows for you.

## Verifying a change

One fault is checked for you. `auditHtml` in `src/html-bridge.js` reads a
document and warns when it queries `prefers-color-scheme` in script but never
listens for a change, i.e. the “Theming from script” mistake above. That one is
worth automating because it is invisible: the document paints its first frame
correctly and fails only when someone flips the board, so it survives every
screenshot.

It runs at three points, deliberately — the first two are easy to miss, and the
mistake shipped twice on `project-canvas-health` before the third existed:

| Where | Channel | Blocks? |
|---|---|---|
| On drop (`addHtmlFromFile`) | browser console | no |
| When the dev server writes the asset (`vite-plugin-canvas-save.js`, `/__canvas/asset`) | the vite terminal | no |
| `pnpm build`, and `pnpm canvas:audit` on demand | stdout, non-zero exit on a `warn` | **yes** |

The middle one matters most in practice: a document is dropped by dragging a
file onto the board, and nobody has devtools open while doing that. The build
gate is the backstop — a `warn` fails the build, a `note` (“this document has no
theme to follow”) never does, since a deliberately single-appearance document is
a legitimate thing to publish.

It reads source text rather than the running document, so a document that hands
its MediaQueryList to a helper instead of binding it is reported as not
listening. Ingest findings are advisory — a drop is never blocked.

### Fix the generator, not the asset

An asset under `public/canvas-assets` is an *export*. Hand-patching one fixes
that file and nothing else: the next export of the same prototype arrives with
the fault back, under a new content hash, looking like a brand-new document.
That is exactly how it happened here — `health-app-11` was patched in place, and
`health-app-39` came off the same unfixed source weeks later and regressed.
So when the audit fires, fix the document where it is authored and re-export;
patch the committed asset only to unblock an already-published board.

The rest is by eye. To confirm a document behaves:

1. Drop it on a board and zoom in and out across the full range.
2. Watch anything fixed-position — a header, a floating button. It must not move
   relative to the frame at any point during the gesture, including the first
   and last frame.
3. Watch section boundaries for reflow as the gesture starts and ends.
4. Confirm dark mode still follows the host's theme switcher — the theme bridge
   depends on `prefers-color-scheme` rules surviving whatever pruning you do.
   Flip it *while the document is open*, not only before it loads: a document
   that themes from script can pass the second test and fail this one.

## Related

- `INTERACTIVE-IFRAMES.md` — the other half of embedding: how the board pans and
  zooms over a document while the document stays hoverable and clickable. Worth
  reading if your generator emits anything with hover states, forms or its own
  scrolling.
- `src/html-bridge.js` — `THEME_SYNC`, `ZOOM_OPTS`, `INPUT_BRIDGE`, the version
  table, `injectBridge` and `auditHtml`. The single definition; the runtime, the
  backfill script and the audit script all import it.
- `src/CanvasProvider.jsx` — ingest (`addHtmlFromFile`), the gesture window
  (`beginGesture` / `endGesture`) and the zoom broadcast (`postZoomState`,
  `postZoomStateTo`).
- `src/nodes/Html.jsx` — the iframe node, sandboxing, theme messaging.
- `packages/portfolio/scripts/inject-canvas-bridge.mjs` — upgrades the bridge in
  already-committed assets.
- `packages/portfolio/scripts/audit-canvas-html.mjs` — runs `auditHtml` over the
  committed assets (`pnpm canvas:audit`); exits non-zero on a warning.
- `visual-code-editor/CANVAS_ZOOM_RASTERIZATION.md` — the prior art this
  approach was ported from, including the tile-memory and rasterization
  tradeoffs that apply to an Electron host but not a browser one.
