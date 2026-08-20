/* The board's end of the input bridge — the host side of what INPUT_BRIDGE in
   html-bridge.js does inside each html node's iframe. Read that file's header
   first: it explains the shape of the arrangement and what it costs.

   The short version. An html node's iframe is inert (`pointer-events: none`)
   behind a transparent shield, so every gesture lands on the BOARD and is
   handled by the same code that handles one over bare board — same pointer
   capture, same wheel listener, same everything. The board owns its gestures by
   construction, which is why nothing here has to defend them: there is no
   capture to lose at a node's edge, no wheel latched to the wrong document, no
   boundary for a drag to fall through.

   What flows through this file goes the other way — INTO the document, so a
   demo stays interactive under the shield. The board says where the cursor is
   and which presses turned out to be taps; the bridge replays them as ordinary
   DOM events at that point.

   ── Coordinates ──
   Everything crossing the boundary is in the embedded document's own CSS
   pixels. The board zooms by scaling the world the iframe sits in, so a host
   client coordinate is not one of those: at 50% zoom a point 200px into the
   document is 100px into the node on screen.

   The scale is read off the element rather than the board's `viewRef.scale`
   because a node can carry its own scale on top of the board's (see the `scale`
   field in useRegister, and the device-frame skeleton) — `rect.width /
   offsetWidth` is the total of every transform between the iframe and the
   screen, whatever their number, so it needs no maintenance when another lands. */

/* The iframe of an html node, given the node element. */
export function frameOf(nodeEl) {
  return nodeEl ? nodeEl.querySelector('.cv-html-frame') : null;
}

/* Total on-screen scale of an iframe: every transform between it and the
   viewport, board zoom and node scale together. 1 while the element has no
   layout (not yet measured), which keeps the arithmetic below harmless. */
function frameScale(frame) {
  const w = frame.offsetWidth;
  return w ? frame.getBoundingClientRect().width / w : 1;
}

/* Host client coordinates -> the embedded document's own. */
function toFrame(frame, clientX, clientY) {
  const rect = frame.getBoundingClientRect();
  const k = frameScale(frame);
  return { x: (clientX - rect.left) / k, y: (clientY - rect.top) / k };
}

function post(frame, message) {
  if (!frame || !frame.contentWindow) return;
  frame.contentWindow.postMessage(message, '*');
}

/* Where the cursor is, so the document can light up under it.

   The shield takes the real pointer, so nothing inside the iframe would
   otherwise know the cursor was there — no tooltips, no hover states, no
   cursor-follow effects. Forwarding the position gives all of that back, with
   one exception the bridge documents and cannot fix: CSS `:hover` follows the
   real cursor, which is on the shield, and no dispatched event can set it. */
export function postHover(frame, clientX, clientY) {
  if (!frame || !frame.contentWindow) return;
  const { x, y } = toFrame(frame, clientX, clientY);
  post(frame, { type: 'canvas-input-hover', x, y });
}

export function postHoverEnd(frame) {
  post(frame, { type: 'canvas-input-hover-end' });
}

/* A press that never became a drag belongs to the document after all: hand it
   back for the bridge to replay at that point.

   Consecutive taps in the same spot are counted here rather than in the bridge,
   because this is the side that knows the gesture ended: the board's onUp is
   what decides a press was stationary, and only then is there a tap to count. A
   demo that distinguishes double-click from click therefore still can. */
const taps = new WeakMap(); // frame -> the previous tap, for the double-click run
const TAP_MS = 400;         // roughly the platform double-click interval
const TAP_SLOP = 12;        // document px the second tap may drift and still count

export function replayTap(frame, clientX, clientY, pointerType) {
  if (!frame || !frame.contentWindow) return;
  const { x, y } = toFrame(frame, clientX, clientY);
  const now = performance.now();
  const prev = taps.get(frame);
  const run = prev && now - prev.t < TAP_MS && Math.hypot(x - prev.x, y - prev.y) < TAP_SLOP ? prev.detail + 1 : 1;
  taps.set(frame, { t: now, x, y, detail: run });
  post(frame, { type: 'canvas-input-tap', x, y, pointerType: pointerType || 'mouse', detail: run });
}
