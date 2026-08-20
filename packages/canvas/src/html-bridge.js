/* The bridge baked into every HTML document the canvas ingests.

   An `html` node is a sandboxed iframe at an opaque origin (see nodes/Html.jsx):
   the host can't reach into it and it can't reach out. Everything the document
   needs to know about the board therefore arrives as `postMessage`, and these
   three scripts — injected at the end of <head> at ingest — are what listen.
   The input half also talks back: it is the only route the board has to the
   presses landing on a document it cannot otherwise see.

   Plain JS with no imports, deliberately: `scripts/inject-canvas-bridge.mjs` in
   the portfolio runs this module under Node to upgrade already-committed assets
   in place. The scripts used to be duplicated between here and that file, and
   drifted (the zoom half shipped as v4 while the injector's version table still
   said v3, so its skip-if-current check never matched and every ingest
   re-injected). One definition, imported by both, is why that can't recur. */

/* Theme sync. The host page can't reach into the iframe and can't flip its
   `prefers-color-scheme` — that tracks the OS alone, whatever the embedder
   does. So the theme crosses by message and this script applies it three ways:
   it rewrites the document's prefers-color-scheme media rules, sets
   `color-scheme` (so UA defaults and any `light-dark()` follow), and toggles a
   `dark` class on <html>. Compound queries (`(prefers-color-scheme: dark) and
   (max-width: …)`) lose their other conditions once flipped — acceptable for
   demo docs.

   v2 adds the JS half: `matchMedia`. See the note beside the patch. */
const THEME_SYNC = `<script data-cv-theme-sync="2">(() => {
  const flipped = new WeakMap(); // media rule -> was it a dark-scheme rule?
  const walk = (rules, dark) => {
    for (const r of rules) {
      // A rewritten rule's mediaText no longer mentions prefers-color-scheme,
      // so membership in the flipped map must count as a match too or it
      // would only ever flip once.
      if (r.media && (flipped.has(r) || /prefers-color-scheme/i.test(r.media.mediaText))) {
        if (!flipped.has(r)) flipped.set(r, /prefers-color-scheme:\\s*dark/i.test(r.media.mediaText));
        r.media.mediaText = flipped.get(r) === dark ? 'all' : 'not all';
      } else if (r.cssRules) walk(r.cssRules, dark);
    }
  };

  // The board's theme, once it has said. Null until then: a document opened
  // without a boot hash answers from the OS rather than guessing.
  let host = null;

  /* prefers-color-scheme in JavaScript.

     Rewriting media rules only reaches a document that themes itself in CSS. A
     prototype that renders from script — picking colours in JS, or setting a
     class off matchMedia — reads the media query directly, and inside the
     iframe that answers with the OS. Such a document ignored the board
     entirely: it stayed on the system setting while the host sat pinned to
     light or dark, and when the OS flipped it moved on its own rather than
     with the page around it.

     So prefers-color-scheme queries answer with the host theme instead, and
     fire 'change' when it flips — meaning the ordinary listener a document
     already writes is enough to follow the board, with nothing canvas-specific
     in it. Every other query passes through to the real matchMedia untouched.

     'no-preference' is left to the OS: the host is always one of light or
     dark, so it has no honest answer for "the user expressed none". */
  const native = window.matchMedia && window.matchMedia.bind(window);
  const wants = (q) =>
    /prefers-color-scheme:\\s*dark/i.test(q) ? true
    : /prefers-color-scheme:\\s*light/i.test(q) ? false
    : null;
  // Held strongly, so a query stays live for as long as the document does —
  // the same lifetime a real MediaQueryList has once it carries a listener.
  const live = [];
  if (native) window.matchMedia = (query) => {
    const q = String(query);
    const dark = wants(q);
    if (dark === null) return native(q);
    const bus = new EventTarget();
    const mql = {
      media: q,
      get matches() { return host === null ? native(q).matches : host === dark; },
      onchange: null,
      addEventListener: (t, fn, o) => bus.addEventListener(t, fn, o),
      removeEventListener: (t, fn, o) => bus.removeEventListener(t, fn, o),
      // The pre-2019 spelling, still what a lot of copied snippets use.
      addListener: (fn) => bus.addEventListener('change', fn),
      removeListener: (fn) => bus.removeEventListener('change', fn),
      dispatchEvent: (e) => bus.dispatchEvent(e),
    };
    live.push({ mql, bus, was: mql.matches });
    return mql;
  };
  // Only on a real edge, like the platform: a host that re-sends the theme it
  // already sent must not make every listener re-run.
  const notify = () => {
    for (const l of live) {
      const now = l.mql.matches;
      if (now === l.was) continue;
      l.was = now;
      // A MediaQueryListEvent in all the ways a listener reads one.
      const ev = new Event('change');
      ev.matches = now;
      ev.media = l.mql.media;
      if (typeof l.mql.onchange === 'function') l.mql.onchange.call(l.mql, ev);
      l.bus.dispatchEvent(ev);
    }
  };

  const apply = (dark) => {
    host = dark;
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; // UA defaults (bg, controls) follow too
    for (const sheet of document.styleSheets) {
      try { walk(sheet.cssRules, dark); } catch { /* unreadable sheet */ }
    }
    notify();
  };
  addEventListener('message', (e) => {
    const d = e.data;
    if (d && d.type === 'canvas-theme' && (d.theme === 'dark' || d.theme === 'light')) apply(d.theme === 'dark');
  });
  // Boot theme from the URL hash (set by the host, see nodes/Html.jsx): applied
  // synchronously — this script sits at the end of <head>, after the document's
  // styles but before any rendering — so the first paint is already themed, and
  // a body script reading matchMedia gets the board's answer on its first read
  // rather than the OS's. The message path only lands after load.
  // Re-applied at DOMContentLoaded for any stylesheets later in the body.
  const boot = /cv-theme=(dark|light)/.exec(location.hash || '');
  if (boot) {
    apply(boot[1] === 'dark');
    addEventListener('DOMContentLoaded', () => apply(boot[1] === 'dark'));
  }
})()</` + 'script>';

/* Zoom paint-mode bridge, the second half of the injected pair. Adapted from
   awenate's `awenate-zoom-paint-opts` handler (see its
   CANVAS_ZOOM_RASTERIZATION.md).

   The board zooms by scaling the world, and deliberately leaves it un-promoted
   so the browser re-rasterizes crisply every frame (see zoomLoop). For a plain
   node that is cheap. For an HTML node it means re-painting a whole embedded
   document per frame — and a document with a lot of DOM is where the glide
   falls apart. So for the duration of the gesture the document is put in a
   cheaper paint mode.

   THE RULE THIS MODE MUST OBEY: it may change how the document paints, never
   how it lays out. A zoom that quietly reflows the content it is zooming is
   worse than a slow one.

   That rules out the containment half of awenate's version — `contain: layout
   paint` on <body> and `content-visibility: auto` on its children. All three of
   `contain: layout`, `contain: paint` and `content-visibility: auto` make the
   element a containing block for `position: fixed` descendants: applying them
   re-anchors every fixed header, nav or floating control in the document from
   the iframe viewport to the contained box, so it visibly jumps the moment a
   zoom starts and jumps back when it ends. `content-visibility` also brings
   `contain-intrinsic-size`, whose placeholder height replaces the real one for
   anything not yet rendered — and it earns nothing on the documents this canvas
   actually embeds, where <body> holds a single app-root element that always
   intersects the viewport and so can never be skipped.

   What remains is purely per-pixel work, which cannot move a box: shadows, the
   most expensive effect to raster and the least missed mid-motion.

   Deliberately NOT stripped, following awenate: `filter` and `mix-blend-mode`.
   Both are load-bearing for real documents — filter drives duotone and
   grayscale treatments (stripping flashes the raw image), blend modes let
   overlays composite (stripping makes them opaque and hides what's underneath).

   ── backdrop-filter is scale-gated, not gesture-gated ──

   An element with a backdrop-filter is composited into its own render surface,
   and that surface rasterizes at roughly 1:1 and is then GPU-scaled by the
   ancestor transform — which here is the board's world, in the PARENT document.
   The child compositor never learns the board's effective scale, so the element
   does not re-raster with it while every unfiltered element around it does: one
   subtree stays soft in a document that is otherwise crisp.

   This cannot be fixed by removing and re-applying the filter at the end of a
   gesture. That does recreate the surface, but it comes back at the same 1:1
   raster scale — which is why a gesture-scoped strip (v2) still left the element
   soft once the board settled.

   So the rule is about scale, not motion. A ~1:1 raster is fine at or below
   100% (downsampling a too-detailed texture looks correct) and visibly soft
   above it, where it is upscaled. FLAT_ABOVE is where the frost stops being
   worth its softness; tune it if the crossover sits elsewhere in practice.

   The upshot for a document that genuinely wants frosted glass: it gets it, at
   the zoom levels where the design is being read as a whole. Zooming in past
   1:1 — which readers do to inspect detail, exactly when sharpness matters more
   than decoration — flattens the panel instead of blurring everything on it.

   Inline styles carry backdrop-filter in practice (an exported document that
   serialises computed styles writes it onto every element that had one), so
   `!important` is required to win the cascade. */
const ZOOM_OPTS = `<script data-cv-zoom-opts="4">(() => {
  var FLAT_ABOVE = 1.02; // board scale past which a ~1:1 filter surface is upscaled and soft
  var css =
    // Frost off: applied while zoomed in past 1:1, and during a gesture (where
    // it is also the single biggest per-frame paint saving).
    'html.cv-flat *,html.cv-flat *::before,html.cv-flat *::after{' +
    'backdrop-filter:none!important;-webkit-backdrop-filter:none!important}' +
    // Gesture only: paint-level savings that cannot move a box.
    'html.cv-zooming *,html.cv-zooming *::before,html.cv-zooming *::after{' +
    'box-shadow:none!important;text-shadow:none!important}';
  var style = document.createElement('style');
  style.textContent = css;
  var attach = function () { (document.head || document.documentElement).appendChild(style); };
  if (document.head || document.documentElement) attach();
  else addEventListener('DOMContentLoaded', attach);
  // Flat until told otherwise: a host too old to send a scale gets the safe,
  // never-blurry rendering rather than an unannounced regression.
  document.documentElement.classList.add('cv-flat');
  addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.type !== 'canvas-zoom') return;
    var scale = typeof d.scale === 'number' ? d.scale : Infinity;
    document.documentElement.classList.toggle('cv-zooming', !!d.active);
    document.documentElement.classList.toggle('cv-flat', !!d.active || scale > FLAT_ABOVE);
  });
})()</` + 'script>';

/* Input bridge, the third injected half — the inward half of the arrangement in
   nodes/Html.jsx. Read that first; this only carries out what it decides.

   THE SHAPE OF IT. An `html` node's iframe is inert: `pointer-events: none`,
   with a transparent shield over it. Every press, drag and wheel therefore lands
   on the BOARD, in the host document, and is handled there by the same code that
   handles a gesture over bare board — the same pointer capture, the same wheel
   listener, the same everything. The board owns its gestures by construction
   rather than by arrangement, which is why none of the ways an iframe can steal
   a gesture apply: there is no capture to lose at a node's edge, no wheel to
   latch onto the wrong document, nothing to message back out and no boundary to
   go wrong at.

   What that costs is the document's own interactivity, and this script is how it
   is given back. The board sends in what the user did — a tap it decided was not
   a drag, the cursor's position as it moves — and these handlers replay it as
   ordinary DOM events at whatever is under that point. A demo lights up under
   the cursor and responds to clicks without anyone having to "enter" it first;
   it simply never sees the gestures the board reserved.

   WHAT IT CANNOT GIVE BACK: `:hover` in CSS. The pseudo-class follows the real
   cursor, which is over the shield, and no dispatched event can set it — so a
   demo whose hover states are pure CSS will look inert under the cursor even
   though its JavaScript hover handlers are running. Hold Shift for the real
   thing: the board drops the shield, the iframe takes the pointer, and the
   document behaves exactly as it would standalone — which is also how a demo's
   own scrolling, sliders and drags are used. */
const INPUT_BRIDGE = `<script data-cv-input="1">(() => {
  if (window.parent === window) return;
  var send = function (m) { try { parent.postMessage(m, '*'); } catch (err) { /* host gone */ } };

  // Announce this document, so the host can hand it anything it holds for it
  // whenever the script happens to start — a lazily-loaded frame with a warm
  // cache can be running before the host has a handler on it.
  send({ type: 'canvas-input-hello' });

  var opts = function (x, y, extra) {
    var o = {
      bubbles: true, cancelable: true, composed: true, view: window,
      clientX: x, clientY: y, screenX: x, screenY: y,
    };
    for (var k in extra) o[k] = extra[k];
    return o;
  };

  // ── Hover ──────────────────────────────────────────────────────────────────
  /* The cursor's position, replayed as the enter/leave traffic a real one would
     produce. Tracked so the transitions are emitted only on a real crossing, as
     the platform does it: over/out bubble, enter/leave do not.

     The CSS :hover pseudo-class is beyond reach here (see the note above, and
     note that a backtick would end this script's template literal) — what it
     drives is
     everything a demo does in JavaScript: onMouseEnter handlers, cursor-follow
     effects, tooltips, hover-tracked canvases. */
  /* CSS hover, which no dispatched event can produce.

     The pseudo-class follows the real cursor, and the real cursor is on the
     board's shield — so a demo whose hover states are pure CSS would sit inert
     under the pointer while its JavaScript hover handlers ran perfectly. The
     events below are only half of hovering; this is the other half.

     So the document's own rules are read back and re-emitted with :hover
     swapped for a class this script controls. Specificity survives the swap
     exactly — a pseudo-class and a class both count (0,1,0) — so a mirrored rule
     wins and loses against everything the original did, and the sheet goes last
     so it takes ties. Then hovering is a matter of putting that class on the
     right elements.

     Rules are read from the document's own stylesheets, which is why this works
     at all: these are ingested documents, styled inline or from their own
     origin. A sheet that can't be read is skipped, exactly as the theme half
     skips it.

     Rebuilt on load as well as first use — a document that adds a stylesheet
     while it boots would otherwise mirror only what existed at the first move. */
  var HOVER_CLASS = 'cv-hv';
  var hoverSheet = null;
  var collect = function (rules) {
    var css = '';
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      // Rebuilt from the selector and the declarations rather than patching
      // cssText, so a ':hover' appearing inside a VALUE is left alone.
      if (r.selectorText && r.selectorText.indexOf(':hover') !== -1 && r.style) {
        css += r.selectorText.split(':hover').join('.' + HOVER_CLASS) + '{' + r.style.cssText + '}\\n';
      } else if (r.cssRules) {
        var inner = collect(r.cssRules);
        // Keep whatever wrapper this is (@media, @supports, @layer) by reusing
        // its own prelude, so the condition still applies to the copy.
        if (inner) css += r.cssText.slice(0, r.cssText.indexOf('{') + 1) + '\\n' + inner + '}\\n';
      }
    }
    return css;
  };
  /* Cheap fingerprint of what is currently loaded — how many sheets, and how
     many rules in each. Enough to notice a stylesheet arriving or a rule being
     inserted, which is what a demo built with CSS-in-JS does continuously, long
     after this script first ran. Reading a rule COUNT is cheap; reading the
     rules themselves is not, which is why the mirror is only rebuilt when this
     changes rather than on every move. */
  var sheetSig = function () {
    var sig = '';
    for (var i = 0; i < document.styleSheets.length; i++) {
      try { sig += document.styleSheets[i].cssRules.length + ','; } catch (err) { sig += 'x,'; }
    }
    return sig;
  };
  var lastSig = null;
  var buildHoverSheet = function () {
    lastSig = sheetSig();
    var css = '';
    for (var i = 0; i < document.styleSheets.length; i++) {
      var sheet = document.styleSheets[i];
      if (sheet.ownerNode === hoverSheet) continue;
      try { css += collect(sheet.cssRules); } catch (err) { /* unreadable sheet */ }
    }
    if (!hoverSheet) {
      hoverSheet = document.createElement('style');
      hoverSheet.setAttribute('data-cv-hover', '');
      (document.head || document.documentElement).appendChild(hoverSheet);
    } else if (hoverSheet.parentNode) {
      // Last, so a mirrored rule takes ties against the original it copies.
      hoverSheet.parentNode.appendChild(hoverSheet);
    }
    hoverSheet.textContent = css;
  };
  addEventListener('load', function () { if (hoverSheet) buildHoverSheet(); });

  /* :hover matches the whole ancestor chain, not just the innermost element, so
     the class goes on every one of them — otherwise a rule of the form
     ".card:hover .title" would never fire when the cursor is over the title.
     (No backticks anywhere in here: this script lives in a template literal.) */
  var hoverChain = [];
  var setHoverChain = function (el) {
    var next = [];
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) next.push(n);
    for (var i = 0; i < hoverChain.length; i++) {
      if (next.indexOf(hoverChain[i]) === -1) hoverChain[i].classList.remove(HOVER_CLASS);
    }
    for (var j = 0; j < next.length; j++) next[j].classList.add(HOVER_CLASS);
    hoverChain = next;
  };

  var hoverEl = null;
  var hoverEvent = function (type, el, related, x, y, bubbles) {
    el.dispatchEvent(new PointerEvent(type, opts(x, y, {
      bubbles: bubbles, cancelable: false, relatedTarget: related || null,
      pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0,
    })));
  };
  var mouseEvent = function (type, el, related, x, y, bubbles) {
    el.dispatchEvent(new MouseEvent(type, opts(x, y, {
      bubbles: bubbles, cancelable: type === 'mousemove', relatedTarget: related || null, buttons: 0,
    })));
  };
  var hoverAt = function (x, y) {
    var el = document.elementFromPoint(x, y);
    if (!hoverSheet || sheetSig() !== lastSig) buildHoverSheet();
    setHoverChain(el);
    if (el !== hoverEl) {
      var was = hoverEl;
      hoverEl = el;
      if (was) {
        hoverEvent('pointerout', was, el, x, y, true);
        mouseEvent('mouseout', was, el, x, y, true);
        hoverEvent('pointerleave', was, el, x, y, false);
        mouseEvent('mouseleave', was, el, x, y, false);
      }
      if (el) {
        hoverEvent('pointerover', el, was, x, y, true);
        mouseEvent('mouseover', el, was, x, y, true);
        hoverEvent('pointerenter', el, was, x, y, false);
        mouseEvent('mouseenter', el, was, x, y, false);
      }
    }
    if (el) {
      hoverEvent('pointermove', el, null, x, y, true);
      mouseEvent('mousemove', el, null, x, y, true);
    }
  };
  var hoverEnd = function () {
    setHoverChain(null);
    if (!hoverEl) return;
    var was = hoverEl;
    hoverEl = null;
    hoverEvent('pointerout', was, null, -1, -1, true);
    mouseEvent('mouseout', was, null, -1, -1, true);
    hoverEvent('pointerleave', was, null, -1, -1, false);
    mouseEvent('mouseleave', was, null, -1, -1, false);
  };

  // ── Tap ────────────────────────────────────────────────────────────────────
  /* A press the board decided was not a drag, replayed as a full click at that
     point. Untrusted events still run activation behaviour, so links follow,
     checkboxes toggle and buttons submit. */
  var replay = function (x, y, pointerType, detail) {
    var el = document.elementFromPoint(x, y);
    if (!el) return;
    // The press implies the cursor is there; without this a demo that only
    // reveals a control on hover would be clicked while still thinking the
    // pointer was elsewhere.
    hoverAt(x, y);
    var mouse = function (type, buttons) {
      return new MouseEvent(type, opts(x, y, { button: 0, buttons: buttons, detail: detail }));
    };
    var pointer = function (type, buttons) {
      return new PointerEvent(type, opts(x, y, {
        button: 0, buttons: buttons, detail: detail,
        pointerId: 1, pointerType: pointerType, isPrimary: true, width: 1, height: 1,
      }));
    };
    // A touch pair too, in the platform's order, for a demo that listens for
    // touches alone. Guarded: the Touch constructor isn't everywhere, and a demo
    // that misses these still gets the pointer and mouse events below.
    var touch = null, t = null;
    if (pointerType === 'touch' && window.Touch && window.TouchEvent) {
      try {
        t = new Touch({
          identifier: 1, target: el,
          clientX: x, clientY: y, screenX: x, screenY: y,
          pageX: x + window.scrollX, pageY: y + window.scrollY,
        });
        touch = function (type, list) {
          return new TouchEvent(type, {
            bubbles: true, cancelable: true, composed: true, view: window,
            touches: list, targetTouches: list, changedTouches: [t],
          });
        };
      } catch (err) { touch = null; }
    }
    el.dispatchEvent(pointer('pointerdown', 1));
    if (touch) el.dispatchEvent(touch('touchstart', [t]));
    // Focus as a real press would: a demo that closes a popover on blur, or a
    // field that expects the caret, depends on it.
    var f = el.closest && el.closest('a[href],button,input,select,textarea,summary,[tabindex],[contenteditable]');
    if (f && f.focus) { try { f.focus({ preventScroll: true }); } catch (err) { f.focus(); } }
    /* Typing needs more than a focused field: keystrokes follow the focused
       FRAME, and this one has never been focused — the press that would have
       done it landed on the shield. So when a tap lands on something you type
       into, ask the host to focus the frame; from then on real keys arrive here
       by themselves.

       Real keys, deliberately, rather than synthesised ones: an untrusted
       KeyboardEvent carries no default action, so dispatching one fires a demo's
       handlers but inserts no text and moves no caret — it would look like
       typing worked while the field stayed empty. */
    if (f && (/^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName) || f.isContentEditable)) {
      send({ type: 'canvas-input-focus' });
    }
    el.dispatchEvent(mouse('mousedown', 1));
    el.dispatchEvent(pointer('pointerup', 0));
    if (touch) el.dispatchEvent(touch('touchend', []));
    el.dispatchEvent(mouse('mouseup', 0));
    el.dispatchEvent(mouse('click', 0));
    // Exactly the second of a run, as the platform does it: a third tap keeps
    // counting up on the click's detail but fires no further dblclick.
    if (detail === 2) el.dispatchEvent(mouse('dblclick', 0));
  };

  /* Shift is the escape hatch, and it is the HOST that drops the shield — but
     once a field in here has been typed into, focus is in this document and the
     host never sees the key. So it is reported from whichever side hears it. */
  addEventListener('keydown', function (e) {
    if (e.key === 'Shift') send({ type: 'canvas-input-shift', on: true });
  }, true);
  addEventListener('keyup', function (e) {
    if (e.key === 'Shift') send({ type: 'canvas-input-shift', on: false });
  }, true);
  addEventListener('blur', function () { send({ type: 'canvas-input-shift', on: false }); });

  addEventListener('message', function (e) {
    var d = e.data;
    if (!d) return;
    if (d.type === 'canvas-input-hover') { hoverAt(d.x, d.y); return; }
    if (d.type === 'canvas-input-hover-end') { hoverEnd(); return; }
    if (d.type === 'canvas-input-tap') replay(d.x, d.y, d.pointerType || 'mouse', d.detail || 1);
  });
})()</` + 'script>';


/* The three halves, each stamped with the version of the script it carries. Bump
   a version whenever its script changes: ingest replaces any older copy it
   finds rather than leaving it in place, so a document that already passed
   through an earlier build of the canvas — an asset re-dropped onto the board,
   an exported document imported back — is upgraded instead of silently keeping
   stale behaviour. (That mattered once already: v1 of the zoom half reflowed
   documents with fixed-position elements, and a skip-if-present check would
   have preserved the bug on exactly the documents most likely to be
   re-ingested.)

   The version here must match the one in the script's own opening tag — that
   is what the skip-if-current check compares against. */
export const BRIDGE = [
  { marker: 'data-cv-theme-sync', version: '2', script: THEME_SYNC },
  { marker: 'data-cv-zoom-opts', version: '4', script: ZOOM_OPTS },
  { marker: 'data-cv-input', version: '1', script: INPUT_BRIDGE },
];

/* Inject the bridge at the end of <head> — after the document's own styles (so
   the boot apply() sees them) yet before the body renders (else after the
   head/html open tag, else prepended). A half already at the current version is
   left untouched, so re-ingesting a current asset is a no-op. */
export function injectBridge(html) {
  let out = html;
  for (const { marker, version, script } of BRIDGE) {
    if (out.includes(`${marker}="${version}"`)) continue;
    // Any older copy goes first. The emitted script bodies contain no literal
    // `</script>`, so the non-greedy match is exactly the block.
    out = out.replace(new RegExp(`<script ${marker}[^>]*>[\\s\\S]*?</script\\s*>`, 'i'), '');
    const close = /<\/head\s*>/i.exec(out);
    if (close) { out = out.slice(0, close.index) + script + out.slice(close.index); continue; }
    const m = /<head[^>]*>/i.exec(out) || /<html[^>]*>/i.exec(out);
    if (m) { out = out.slice(0, m.index + m[0].length) + script + out.slice(m.index + m[0].length); continue; }
    out = script + out;
  }
  return out;
}
