# Panning a canvas over interactive iframes

How to have a pan/zoom canvas that embeds live HTML documents in iframes, where
**the canvas owns every gesture** and the documents are still hoverable and
clickable — with no "click to activate" step.

Written to be portable. It describes the arrangement, the pieces, and the
several ways of doing it that don't work, so you can implement it somewhere
without rediscovering those. Where it names files, they are this repo's
implementation of it: `src/html-bridge.js` (the injected script),
`src/html-input.js` (the host side), `src/nodes/Html.jsx` (the node),
`src/Canvas.jsx` (the board's gesture handlers).

## The problem

An iframe swallows every pointer, wheel and touch event that lands on it, and a
sandboxed one at an opaque origin can't be reached into from the host. So a
canvas with embedded documents on it has to choose:

- **Let the iframe have events** and the canvas can't be panned, zoomed or
  dragged over a document. Usually patched with a "click to interact" mode,
  which is a mode users have to discover, enter and leave.
- **Cover the iframe** and the canvas works perfectly, but every document on the
  board is a dead screenshot.

The arrangement below gets both, by noticing that the two want *different halves
of the same gesture*: the canvas wants **drags and wheels**, the document wants
**taps and hovers**. Neither has to give anything up.

## The arrangement

**The iframe never receives events.** It is `pointer-events: none`, with a
transparent shield element over it.

Everything therefore lands on the canvas, in the host document, and is handled
by the same code that handles a gesture over empty canvas — the same pointer
capture, the same wheel listener, the same everything. This is the load-bearing
decision, and the reason to make it is not tidiness: it means **none of the ways
an iframe can steal a gesture apply.** There is no capture to lose at a node's
edge, no wheel latched to the wrong document, nothing to marshal across a
boundary and no boundary to get it wrong at.

**Interactivity is given back from the other direction.** A script injected into
each document listens for messages from the host and replays them as real DOM
events:

| Host → document | When | Effect |
|---|---|---|
| `hover` (x, y) | The cursor moves over the shield | `pointerover/out/enter/leave/move` + mouse equivalents at that point, plus the CSS `:hover` mirror (below) |
| `hover-end` | The cursor leaves the shield | Clears both |
| `tap` (x, y, detail, quiet) | A press ended without moving | `pointerdown → mousedown → pointerup → mouseup → click`, plus `dblclick` on the second of a run. `quiet` marks a tap nobody made — one replayed to put a document back on a saved screen (see the start page in `EMBEDDED-HTML.md`) — and suppresses the focus request below |

| Document → host | When | Effect |
|---|---|---|
| `hello` | The injected script starts | Host sends any state it holds for the document |
| `focus` | A replayed tap landed on a text field | Host calls `iframe.focus()` so real typing works (below) |
| `cursor` | The element under the forwarded position changes what it would be showing | Host puts that cursor on the shield, which is what the real pointer is over (below) |
| `shift` | Shift pressed/released while focus is inside the document | Host toggles the escape hatch |

**Shift is the escape hatch.** While held, the shield stands down
(`pointer-events: none` on the shield, `auto` on the iframe) and the document
behaves exactly as it would standalone. This is how a demo's own scrolling,
sliders and drags are used — see "What this costs" below.

**A node can opt out of all of it.** An embed marked not-interactive (`inert` on
the node; **Interactive** in its right-click menu) is given nothing: no hover, no
replayed tap, and no Shift escape hatch. It keeps the shield and the running
document, and loses only the ability to be driven — which is what you want for a
prototype that is on the board as an illustration. See "Turning interactivity
off" in `EMBEDDED-HTML.md`.

## The pieces

### 1. The shield

```css
.node .frame        { pointer-events: none; }
.node .shield       { position: absolute; inset: 0; }

/* Shift held */
[data-passthrough] .node .shield { pointer-events: none; }
[data-passthrough] .node .frame  { pointer-events: auto; }
```

The shield is a normal element in the host document, so a press on it starts a
canvas pan exactly like a press on empty canvas, and a wheel over it bubbles to
the canvas's wheel listener. Nothing special is needed for either.

Put `user-select: none`, `-webkit-user-select: none` and `-webkit-touch-callout:
none` on it, or a long-press on mobile selects the iframe element itself and
draws a selection box.

### 2. Deciding a press was a tap

The canvas already distinguishes a drag from a click for its own purposes — it
needs to know whether a press on a card was a pan or a click. Reuse that. On
press, record which node was under the pointer; on release, if the gesture never
exceeded the movement threshold, it was a tap and belongs to the document:

```js
// on pointerdown
action = { type: 'pan', sx: e.clientX, sy: e.clientY,
           htmlId: e.target.closest('.node.html')?.dataset.id,
           pointerType: e.pointerType };

// on pointerup
if (action.htmlId && !action.moved) replayTap(frameOf(action.htmlId), action.sx, action.sy, action.pointerType);
```

### 3. Coordinates

Everything crossing the boundary is in the **embedded document's own CSS
pixels**. A canvas that zooms by scaling the world means a host client
coordinate is not one of those: at 50% zoom a point 200px into the document is
100px into the node on screen.

Read the scale off the element rather than from the canvas's zoom state — a node
may carry its own scale on top of the board's, and `getBoundingClientRect()`
already accounts for every transform between the element and the screen:

```js
function frameScale(frame) {
  const w = frame.offsetWidth;
  return w ? frame.getBoundingClientRect().width / w : 1;   // 1 before layout
}
function toFrame(frame, clientX, clientY) {
  const r = frame.getBoundingClientRect(), k = frameScale(frame);
  return { x: (clientX - r.left) / k, y: (clientY - r.top) / k };
}
```

This needs no maintenance when another transform is added anywhere in the
ancestor chain.

### 4. Replaying a tap

```js
const el = document.elementFromPoint(x, y);
const o = { bubbles: true, cancelable: true, composed: true, view: window,
            clientX: x, clientY: y, screenX: x, screenY: y };
el.dispatchEvent(new PointerEvent('pointerdown', { ...o, button: 0, buttons: 1, pointerId: 1, isPrimary: true }));
// focus like a real press would — a popover that closes on blur depends on it
el.closest('a[href],button,input,select,textarea,summary,[tabindex],[contenteditable]')
  ?.focus({ preventScroll: true });
el.dispatchEvent(new MouseEvent('mousedown', { ...o, button: 0, buttons: 1 }));
el.dispatchEvent(new PointerEvent('pointerup',  { ...o, button: 0, buttons: 0, pointerId: 1, isPrimary: true }));
el.dispatchEvent(new MouseEvent('mouseup',      { ...o, button: 0, buttons: 0 }));
el.dispatchEvent(new MouseEvent('click',        { ...o, button: 0, buttons: 0, detail }));
if (detail === 2) el.dispatchEvent(new MouseEvent('dblclick', { ...o, detail }));
```

Untrusted events still run **activation behaviour**, so links follow, checkboxes
toggle and buttons submit. Dispatch at `elementFromPoint`, not at the body — the
event bubbles to the ancestors on its own.

Count consecutive taps **on the host**, not in the document: the host is the
side that knows a gesture ended. A run is same-frame taps within ~400ms and ~12
document-pixels of each other. Fire `dblclick` on exactly the second of a run —
a third tap keeps incrementing `click.detail` but fires no further `dblclick`,
which is what the platform does.

For a touch tap, dispatch a `touchstart`/`touchend` pair as well for demos that
listen for touches alone. Guard it — the `Touch` constructor isn't everywhere.

### 5. Hover, including CSS `:hover`

Replaying `pointerover`/`mouseover`/`mousemove` gets you every hover effect the
document drives **in JavaScript**. It does not get you `:hover`, and that is
most of what a user sees.

**`:hover` cannot be synthesized.** The pseudo-class follows the real cursor,
and the real cursor is on the shield. No dispatched event sets it, ever.

So mirror it. Read the document's own stylesheets, find every rule whose
selector contains `:hover`, and re-emit it with `:hover` replaced by a class you
control:

```js
function collect(rules) {
  let css = '';
  for (const r of rules) {
    // rebuild from selector + declarations, so a ':hover' inside a VALUE is untouched
    if (r.selectorText?.includes(':hover') && r.style) {
      css += r.selectorText.split(':hover').join('.cv-hv') + '{' + r.style.cssText + '}\n';
    } else if (r.cssRules) {
      const inner = collect(r.cssRules);          // @media / @supports / @layer
      if (inner) css += r.cssText.slice(0, r.cssText.indexOf('{') + 1) + '\n' + inner + '}\n';
    }
  }
  return css;
}
```

Three things make this work rather than approximately work:

- **Specificity is preserved exactly.** A pseudo-class and a class both count
  `(0,1,0)`, so a mirrored rule wins and loses against everything the original
  did. Append the generated sheet **last** so it takes ties.
- **The class goes on the whole ancestor chain**, not just the innermost element
  — `:hover` matches ancestors too, so `.card:hover .title` would never fire
  otherwise.
- **Rebuild when the stylesheets change.** A CSS-in-JS document inserts rules
  long after your script first ran. Cheap fingerprint: the number of sheets and
  each one's `cssRules.length`. Reading a rule *count* is cheap; reading the
  rules is not, so only rebuild when the fingerprint moves.

A sheet you can't read (genuinely cross-origin) is skipped. In practice ingested
documents are styled inline or from their own origin, so this reaches nearly
everything.

Throttle the forwarded cursor position to one message per frame, and skip it
entirely while a gesture is running — mid-pan the canvas is moving the content,
not pointing at it.

### 6. The cursor

The second thing that follows the real pointer, and so the second that has to be
handled by going around rather than through. The pointer is on the shield — a
bare div that knows nothing of what is beneath it — so every document on the
canvas is an arrow, whatever it is full of. A prototype of buttons and links
reads as a picture of one, and it is the cursor, more than any hover state, that
says a thing can be clicked.

`:hover` is mirrored inwards because it cannot be dispatched. The cursor goes
the other way: the document computes what it would be showing and reports it,
and the host puts it on the shield.

```js
// document, at the end of the hover handler — AFTER the hover class is applied,
// so a rule that only sets cursor:pointer on :hover is included
let last = null;
const report = (el) => {
  const c = el ? resolve(el) : '';
  if (c !== last) parent.postMessage({ type: 'cursor', cursor: (last = c) }, '*');
};
```

Three things it needs to get right:

- **`cursor: auto` has to be resolved by hand.** The renderer resolves it while
  painting and never writes the answer back, so `getComputedStyle` still says
  `auto`. The rule: an I-beam over text you could select or type into, an arrow
  everywhere else — and *directly* over it, since a card containing a label is
  not an I-beam, the label is.
- **A `url()` cursor cannot cross.** It resolves against the *document*, which
  the host can't reach; a relative path would resolve against the host page
  instead. Fall back to the keyword the document listed after it — what a
  browser does when the image fails to load — and to an arrow when it listed
  none.
- **A click can change what is under a pointer that hasn't moved.** A
  re-render, a button that disables itself, a menu that opens over its own
  trigger: the reported cursor now describes an element that is gone, and
  nothing notices, because the next hover lands on the same point and every
  cache still agrees. Re-read a frame after replaying a tap.

Send only on change — the position arrives once a frame and nearly every one is
over the same element as the last.

On the host, apply the reported value through a custom property rather than as
`cursor` directly. `cursor` inherits, and an unset (or unusable) custom property
makes the declaration invalid at computed-value time — which for an inherited
property means the inherited value. So the fallbacks fall out of the cascade,
with nothing to clear and no `!important` anywhere:

```css
.node .shield             { cursor: var(--doc-cursor); }          /* unset -> the canvas's own */
[data-view] .node .shield { cursor: var(--doc-cursor, default); } /* ...but see below */
[data-panning] .node .shield,
[data-space]   .node .shield { cursor: inherit; }                 /* a gesture -> the canvas's own */
```

Two things that middle rule is doing.

**A gesture belongs to the canvas, so its cursor does too.** A pointer that is
panning the board is not pointing at anything in a document, and the canvas
already says so — `grabbing` — everywhere else. Keep the selectors at matching
specificity so the gesture rules win in source order over both of the others.

**But an idle pointer over an embed belongs to the document.** This is the one
that is easy to get backwards. A canvas in view mode typically sets one cursor
over the whole board — `grab`, because drag-to-pan is what a reader has — and
inheriting it means a prototype full of buttons offers the single gesture the
canvas reserved and hides the several the document would answer. So an
interactive embed reads as an **arrow** by default, and as whatever the document
reports the moment it says. An embed that has been marked non-interactive is the
exception, and should keep the board's `grab`: panning really is all it affords.

### 7. Keyboard

Don't synthesize key events. **An untrusted `KeyboardEvent` carries no default
action**: dispatching one fires the document's handlers but inserts no text and
moves no caret, so typing looks wired up while the field stays empty.

The actual obstacle is that keystrokes follow the focused **frame**, and yours
has never been focused — the press that would have focused it landed on the
shield. So when a replayed tap lands on an `input`, `textarea`, `select` or
`contenteditable`, have the document tell the host, and have the host call
`iframe.focus()`. Real keystrokes then arrive by themselves.

A useful side effect: while the frame holds focus the host window stops
receiving `keydown`, so the canvas's own keyboard shortcuts stand aside for
exactly as long as the user is typing.

One exception: a tap the *host* is replaying rather than a user making it —
restoring a saved screen on load — must not ask for focus. Nobody pressed
anything, and a frame that takes the keyboard on load is a frame that swallows
the first shortcut the user tries. That is what the `quiet` flag is for.

### 8. Getting state into the document reliably

A sandboxed iframe can only be talked to by `postMessage`, and the two obvious
moments to send are both unreliable: at mount the document hasn't loaded, and a
lazily-loaded iframe with a warm cache can finish before the host has a handler
on it.

Have the **document announce itself** on startup and the host answer. That makes
delivery independent of load order. For state that must be right before the
first paint or the first gesture, put it in the URL hash as well
(`src="doc.html#theme=dark"`) — the injected script reads it synchronously.

Identify the sender by `e.source === iframe.contentWindow`. A sandboxed document
has an opaque origin, so there is nothing to compare `e.origin` against.

## What this costs

**A demo's own dragging and scrolling.** The canvas takes drags, so a slider,
carousel or internally-scrolling pane inside a document can't be used directly.
Nothing about the gesture distinguishes those from a pan, so the user has to say
which they meant — hence Shift. Text selection inside a document goes the same
way.

Give the escape hatch a visible affordance. Nothing on screen says "hold Shift".

## Approaches that don't work

Recorded because each of these looks correct and fails in a way that takes a
while to see.

**Letting the iframe keep events and forwarding them out to the host.**
Injecting a script that blocks each event at `window` capture-phase and
`postMessage`s it to the host, which re-dispatches it, is the obvious inversion
of this design and it is a trap. Every failure below is one it produces:

- *A drag dies when the cursor leaves the node.* The only thing holding the
  gesture together is `setPointerCapture` inside the iframe, and the host can't
  take capture itself — there is no real pointer in its document to capture. If
  the browser doesn't keep that capture across the boundary, the drag simply
  stops mid-way.
- *A wheel gesture stays with the wrong document.* Browsers latch a continuous
  wheel sequence to the element it started on, so raising a cover mid-gesture
  doesn't re-target it.
- *Everything arrives a frame late,* because every event of every gesture makes
  a `postMessage` round trip.

None of it is necessary. Make the iframe inert and the host has the gesture
natively from the first event.

**Covering the iframe only during a gesture.** A cover raised on pointerdown
fixes drags and is still wrong for wheels — there is no "wheel start" to hook,
and wheel latching means the first events of a gesture go to the document
anyway.

**Blocking events inside the document but letting some fall through.** If you
intercept selectively — say, taking drags but letting a plain wheel through so
the host page can still scroll — the wheel you let through lands in the
*document*, which may scroll and swallow it. A canvas pan then dies the moment a
document passes under the cursor. Take all of a class of event or none of it.

**A cover with `pointer-events: none`.** It doesn't block anything; it's
transparent to hit-testing. If you want a cover to catch events it must be
`auto`. (Both have their place: `none` is right for an overlay that draws
decorations over the canvas without intercepting, `auto` for one that
intercepts.)

## Verifying it

No automated check will tell you the feel is right, but these catch the real
failures:

1. **Drag from inside a document until the cursor genuinely leaves it.** Note
   that a 1:1 pan moves the content *with* the cursor, so a long drag never
   leaves the node — the content follows. You have to drag past the canvas's own
   edge, and you must check `document.elementFromPoint`, not how far the board
   moved. Measuring displacement alone will show a drag "working" that isn't.
2. **Wheel-pan with the cursor still while documents sweep under it.** Each step
   should move the board by the same amount whether a document is under the
   cursor or not. A stalled step means something down there took the wheel.
3. **Count what reaches the iframe.** Instrument the document with capture-phase
   listeners; a correct implementation shows zero pointer and wheel events on
   it.
4. **Hover a CSS-only hover state.** JS hover handlers can work perfectly while
   `:hover` does nothing — they are separate mechanisms and separate bugs.
5. **Watch the cursor over a button, and again after clicking it.** The second
   is the one that breaks: the pointer hasn't moved, so nothing re-reads unless
   you made it.
6. **Type into a field in a document.** Handlers firing is not the same as text
   appearing.

## Related

- `EMBEDDED-HTML.md` — the other half of embedding: how a document is themed and
  how it should be built so zooming stays cheap.
- `src/html-bridge.js` — the injected script, and the version table that lets an
  already-ingested document be upgraded in place.
- `visual-code-editor` — prior art. Its `packages/awenate/src/components/`
  covers preview iframes with a `pointer-events: auto` div for the duration of a
  resize, for the same reason a shield is used here.
