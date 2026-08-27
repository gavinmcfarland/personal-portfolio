/* The bridge baked into every HTML document the canvas ingests.

   An `html` node is a sandboxed iframe at an opaque origin (see nodes/Html.jsx):
   the host can't reach into it and it can't reach out. Everything the document
   needs to know about the board therefore arrives as `postMessage`, and these
   four scripts — injected at the end of <head> at ingest — are what listen.
   The input half also talks back: it is the only route the board has to the
   presses landing on a document it cannot otherwise see, and the page half with
   it — it is how the board learns which screen a prototype is showing.

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

   It also rules out the per-pixel half awenate keeps: box-shadow and
   text-shadow, dropped for the duration of the glide (v4 and earlier). It never
   moved a box, but it was visible — a document's shadows blinked off the moment
   a zoom started and back when it settled, which reads as the document changing
   rather than the camera moving. Depth is part of how these documents are
   designed; a frame of raster time isn't worth losing it.

   Deliberately NOT stripped either, following awenate: `filter` and
   `mix-blend-mode`. Both are load-bearing for real documents — filter drives
   duotone and grayscale treatments (stripping flashes the raw image), blend
   modes let overlays composite (stripping makes them opaque and hides what's
   underneath).

   So nothing here is gesture-scoped any more. What the mode does is entirely
   the scale gate below. The rule that replaced "paint only, never layout" is
   that an optimisation must be invisible by construction — cheap because the
   reader could not have seen the difference at that moment, not because we
   decided they would forgive it. EMBEDDED-HTML.md, "Shadows: stripped until v5",
   carries that argument in full along with the ways to make a shadowed document
   cheap to zoom without taking its shadows away.

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
const ZOOM_OPTS = `<script data-cv-zoom-opts="5">(() => {
  var FLAT_ABOVE = 1.02; // board scale past which a ~1:1 filter surface is upscaled and soft
  var css =
    // Frost off: applied while zoomed in past 1:1, and during a gesture (where
    // it is also the single biggest per-frame paint saving).
    'html.cv-flat *,html.cv-flat *::before,html.cv-flat *::after{' +
    'backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';
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

   TWO THINGS FOLLOW THE REAL POINTER and so can never be dispatched in: the
   `:hover` pseudo-class, and the cursor. Both are handled by going around rather
   than through. `:hover` is mirrored — the document's own rules are re-emitted
   against a class this script controls — and the cursor is reported outwards,
   for the host to put on the shield the pointer is genuinely over. See each
   below.

   WHAT IS LEFT is a demo's own dragging and scrolling: a slider, a carousel, a
   pane with a scrollbar. Nothing about those gestures distinguishes them from a
   pan, so the user says which they meant — hold Shift, and the board drops the
   shield and the iframe takes the pointer, so the document behaves exactly as it
   would standalone. */
const INPUT_BRIDGE = `<script data-cv-input="3">(() => {
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

  /* ── The cursor ──────────────────────────────────────────────────────────
     The other thing that follows the real pointer and therefore never reaches
     this document: the cursor itself. The board's shield is what the pointer is
     actually over, and a plain div has no idea that a link, a text field or a
     resize handle is sitting under it — so a demo full of buttons reads as flat
     board, and the one signal that says "this is clickable" is missing at
     exactly the moment it is wanted.

     :hover is mirrored because it cannot be dispatched; the cursor is REPORTED
     for the same reason. The document computes what it would be showing and
     tells the host, which puts it on the shield (see Html.jsx). Read after the
     hover class is applied, so a rule that only sets cursor:pointer on :hover is
     included — that is why this sits at the end of hoverAt rather than beside
     elementFromPoint.

     Sent only when it changes: the position arrives once a frame, and nearly
     every one of those is over the same element as the last. */
  var lastCursor = null;
  /* getComputedStyle answers 'auto' for cursor:auto — the renderer resolves it
     while painting and never writes the answer back, so it has to be resolved
     here. The rule the browser uses: an I-beam over text you could select or
     type into, an arrow everywhere else. */
  var resolveCursor = function (el) {
    var c = '';
    try { c = getComputedStyle(el).cursor; } catch (err) { return 'default'; }
    if (c === 'auto') {
      var tag = el.tagName;
      if (el.isContentEditable || tag === 'TEXTAREA'
        || (tag === 'INPUT' && /^(|text|search|url|tel|email|password|number)$/i.test(el.type || ''))) return 'text';
      // Text the pointer is directly over, rather than text somewhere in a
      // descendant: a card with a label inside it is not an I-beam, the label is.
      for (var n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3 && n.nodeValue && n.nodeValue.trim()) return 'text';
      }
      return 'default';
    }
    /* A custom image cursor cannot cross: its url() resolves against THIS
       document, which the host cannot reach (opaque origin, and a relative path
       would resolve against the host page instead). Fall back to the keyword the
       document listed after it — which is what a browser does when the image
       fails to load — and to an arrow when it listed none. */
    if (c.indexOf('url(') !== -1) {
      var last = c.split(',').pop().trim();
      return /^[a-z-]+$/.test(last) ? last : 'default';
    }
    return c;
  };
  var sendCursor = function (el) {
    var c = el ? resolveCursor(el) : '';
    if (c === lastCursor) return;
    lastCursor = c;
    send({ type: 'canvas-input-cursor', cursor: c });
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
    sendCursor(el);
  };
  var hoverEnd = function () {
    setHoverChain(null);
    // Before the early return below: the host is wearing this document's cursor
    // and must be given the board's back even when nothing was hovered.
    sendCursor(null);
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
  var replay = function (x, y, pointerType, detail, quiet) {
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
       typing worked while the field stayed empty.

       A quiet tap — one a page restore is replaying, before anyone has
       looked at this board — asks for none of that: the frame must not take
       the host's focus for a press the user never made. */
    if (!quiet && f && (/^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName) || f.isContentEditable)) {
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
    /* A click routinely rebuilds what is under the pointer — a re-render, a
       button that disables itself, a menu that opens over the thing that opened
       it — and the cursor the host is wearing describes the element that was
       there. Nothing would notice: the pointer has not moved, so the next hover
       lands on the same point and this side's caches all still agree. So re-read
       once the document has had a frame to settle. */
    requestAnimationFrame(function () { sendCursor(document.elementFromPoint(x, y)); });
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
    if (d.type === 'canvas-input-tap') replay(d.x, d.y, d.pointerType || 'mouse', d.detail || 1, !!d.quiet);
  });
})()</` + 'script>';


/* Page memory, the fourth half.

   An embedded prototype is usually more than one screen, and which screen it
   opens on is a thing the author cares about: a board that shows a health app's
   timeline wants the timeline, not whatever the document boots into. But the
   screen is the DOCUMENT's business — it lives in a closure the host cannot
   reach, behind an opaque origin, in a document the board only knows as a URL.

   So the board never learns what a page IS. It asks this script to describe the
   one the document is on, keeps that description on the node (`page`, saved with
   the board), and hands it back on every load for this script to walk the
   document to. Three descriptions, in the order they are tried:

     1. `window.canvasPage` — a document that knows its own routing says so
        directly: `{ get() { return state.screen }, set(p) { go(p) } }`. Exact,
        cheap, and worth adding to a prototype you author.
     2. The URL hash, for a document that routes by it. Restored by assignment,
        which fires `hashchange` exactly as a real navigation would. The board's
        own boot hash (#cv-theme=…) is stripped first — that one is the host's.
        Only the hash: `history.pushState` throws in a sandboxed document at an
        opaque origin, so `search` and `pathname` are beyond reach here.
     3. The clicks that got the document here, replayed. The fallback that needs
        nothing of the document at all — which is why it exists, since a
        prototype typically holds its screen in a plain variable and re-renders
        on click. Each click is recorded with a selector for what it landed on,
        so the replay finds the same control even when the document lays out at
        a different size than it was recorded at, and falls back to the recorded
        point when the selector no longer matches.

   Replay is done under a veil — the document is hidden and its transitions are
   off until it arrives — so a restored board paints the saved page rather than
   flicking through the path to it. A watchdog lifts the veil whatever happens:
   a document that fails to restore is still a document to show. */
const PAGE_BRIDGE = `<script data-cv-page="2">(() => {
  if (window.parent === window) return;
  var send = function (m) { try { parent.postMessage(m, '*'); } catch (err) { /* host gone */ } };

  /* The document's own hash, with the board's boot parameter taken out — a
     document that never touched its hash must read as unchanged. */
  var docHash = function () {
    var h = (location.hash || '').replace(/^#/, '');
    h = h.replace(/(^|&)cv-theme=(dark|light)(&|$)/, function (m, a, b, c) { return a && c ? '&' : ''; });
    return h.replace(/(^|&)cv-page=1(&|$)/, function (m, a, c) { return a && c ? '&' : ''; });
  };
  var BOOT_HASH = docHash();

  // ── The trail ─────────────────────────────────────────────────────────────
  /* Every click, whoever made it: in edit mode the shield is down and these are
     the author's own presses; in view mode they are the taps the input half
     dispatches on the board's behalf. Both fire this capture-phase listener, so
     the trail reads the same either way — and the clicks a replay itself makes
     are skipped, since the trail they would duplicate is already loaded. */
  var MAX = 60;   // a path this long is a session, not a destination
  var trail = [];
  var restoring = false;

  /* A selector for the element a click landed on. Stops at the first id —
     nothing above it can change what matches. */
  var pathOf = function (el) {
    var parts = [];
    for (var n = el; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement) {
      if (n.id && /^[A-Za-z][-\\w]*$/.test(n.id)) { parts.unshift('#' + n.id); break; }
      var i = 1, s = n;
      while ((s = s.previousElementSibling)) { if (s.tagName === n.tagName) i++; }
      parts.unshift(n.tagName.toLowerCase() + ':nth-of-type(' + i + ')');
    }
    return parts.join('>');
  };

  addEventListener('click', function (e) {
    if (restoring) return;
    var el = e.target;
    if (!el || el.nodeType !== 1) return;
    if (trail.length >= MAX) trail.shift();
    trail.push({ p: pathOf(el), x: Math.round(e.clientX), y: Math.round(e.clientY) });
    checkMoved();
  }, true);

  /* ── Off the start state ────────────────────────────────────────────────
     In view mode a visitor can drive a demo wherever they like, and the board
     offers them a way back — but only once there is somewhere to come back
     FROM, or the button is an affordance for nothing.

     What counts as "moved" cannot be asked of the document directly: the whole
     reason the trail tier exists is that a prototype keeps its screen out of
     reach. So this compares a signature of the document against the one taken
     when the board finished opening it — a routing hook's answer, the hash, and
     what the document is SHOWING. Deliberately broad: it catches a screen change
     without pretending to know what a screen is, and a visitor who merely opened
     a disclosure has changed the document too — offering them the way back is no
     worse for it.

     The showing half is the body's markup, hashed, with the input half's hover
     classes taken back out. Every part of that sentence was arrived at the hard
     way:

     The markup rather than the TEXT, because a prototype often switches screens
     by class alone — the health app's drawer is in the DOM either way, shown by
     a class on its wrapper — and a text signature sees nothing happen.

     Hashed rather than MEASURED. Length collapses a document to one number and
     two unrelated changes can cancel: on that same drawer, the content lost 14
     characters while the hover class added exactly 14, and the signature came
     back identical across a real navigation.

     And the hover classes come out because the input half puts one on every
     element under a replayed tap, to drive CSS :hover. Left in, the markup would
     change on every click whether the document moved or not, and every click
     would read as movement.

     Sampled two frames after the click so the document has re-rendered and laid
     out; a click that changes nothing leaves the signature alone and says
     nothing. Announced once — the board only needs to be told to show it. */
  var moved = false;
  var HOVER_MIRROR = 'cv-hv'; // must match HOVER_CLASS in the input half
  // djb2. Cheap enough to run on a click and no more.
  var hashOf = function (str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return h;
  };
  /* The hover mirror's class, and the empty attribute removing it can leave
     behind, so markup carrying one hashes the same as markup that never did.
     classList appends, so the token is last and takes its leading space with it. */
  var unhover = function (html) {
    return html
      .split(' ' + HOVER_MIRROR).join('')
      .split(HOVER_MIRROR).join('')
      .split(' class=""').join('');
  };
  var stateSig = function () {
    var hook = '';
    try {
      if (window.canvasPage && typeof window.canvasPage.get === 'function') hook = JSON.stringify(window.canvasPage.get());
    } catch (err) { /* the document's own hook threw */ }
    var markup = document.body ? unhover(document.body.innerHTML) : '';
    return hook + '|' + docHash() + '|' + markup.length + ':' + hashOf(markup);
  };
  var announce = function () {
    if (moved || restoring) return;
    moved = true;
    send({ type: 'canvas-page-moved' });
  };
  /* Did THIS press change anything?

     The baseline is taken at the click, in the capture phase, before the
     document's own handler has run — not once when the board finished opening
     the document. A snapshot taken then goes stale on its own: a prototype that
     is still settling (a late render, a scroll into place, a font landing) has
     moved by the time the visitor touches it, and their first press would report
     movement wherever they put it. Measured on the health app: a tap on inert
     chrome announced a move it had not made.

     Sampled again two frames later, and once more at 400ms for a document that
     answers a press with something slower than a re-render. */
  var checkMoved = function () {
    if (moved || restoring) return;
    var before = stateSig();
    var probe = function () {
      if (moved || restoring || stateSig() === before) return false;
      announce();
      return true;
    };
    settle(function () { if (!probe()) setTimeout(probe, 400); });
  };
  /* A hash router has already moved by the time this fires, so there is nothing
     to compare against — the change IS the event. */
  addEventListener('hashchange', function () { announce(); });

  // ── Describing the page ───────────────────────────────────────────────────
  var capture = function () {
    try {
      if (window.canvasPage && typeof window.canvasPage.get === 'function') {
        var v = window.canvasPage.get();
        if (v !== undefined && v !== null) return { v: 1, hook: v };
      }
    } catch (err) { /* the document's own hook threw; fall through */ }
    var h = docHash();
    if (h !== BOOT_HASH) return { v: 1, hash: h };
    if (trail.length) return { v: 1, taps: trail.slice() };
    return null; // nothing happened here worth remembering
  };

  // ── Walking back to it ────────────────────────────────────────────────────
  var veil = null;
  var hide = function () {
    if (veil) return;
    veil = document.createElement('style');
    veil.setAttribute('data-cv-page-veil', '');
    /* Opacity, not visibility: a hidden document is not hit-testable, and the
       replay finds what it is aiming at with elementFromPoint. Hiding it the
       obvious way makes every tap in the trail land on nothing. */
    veil.textContent = ':root{opacity:0!important}*{transition:none!important;animation:none!important}';
    (document.head || document.documentElement).appendChild(veil);
  };
  var reveal = function () {
    if (veil && veil.parentNode) veil.parentNode.removeChild(veil);
    veil = null;
  };
  /* One step of a replay: long enough for the document to have reacted to the
     last tap and laid out again.

     Two animation frames where the document is being rendered — one to
     re-render in, one to lay out in — raced against a timer that takes over
     where it isn't. An embed parked outside the board's viewport is not
     rendered at all: the browser stops its rAF dead (measured on a project
     board: 0 ticks a second, against 35 for the same document on screen), so a
     trail driven by frames alone simply stops part-way. The veil's own deadline
     then reveals the document wherever it stopped, and the taps still owed
     replay in front of the reader the moment they pan the node into view —
     which is the embed walking through its screens by itself.

     Nothing is lost by advancing on the timer instead: layout is computed on
     demand and the replay forces it at every step by measuring what it is
     aiming at. What an unrendered document doesn't get is a paint nobody was
     going to see. 50ms, so the timer only wins where frames genuinely aren't
     coming — two of them on a 60Hz display is 33ms. */
  var settle = function (fn) {
    var t = 0;
    var done = false;
    var run = function () { if (done) return; done = true; clearTimeout(t); fn(); };
    t = setTimeout(run, 50);
    requestAnimationFrame(function () { requestAnimationFrame(run); });
  };

  /* The board writes cv-page=1 into the boot hash when the node it is loading
     has a saved page, and the veil goes up HERE — synchronously, at the end of
     <head>, before the document has painted anything.

     It cannot wait for the restore message. That arrives after the frame's load
     event, which is several paints too late: the document has already shown the
     screen it boots into, so what the user sees is that screen, then a blank,
     then the saved one. Veiling on the flag means the boot screen is never
     painted at all, and the first thing drawn is the right one.

     The watchdog matters more here than anywhere else in this script: a veil
     raised at boot with no restore behind it — an older host, a message that
     never comes — would leave the document invisible for good. */
  var bootTimer = 0;
  var ready = function () { send({ type: 'canvas-page-ready' }); };
  if (/(^|#|&)cv-page=1(&|$)/.test(location.hash || '')) {
    hide();
    bootTimer = setTimeout(function () { if (!restoring) { reveal(); ready(); } }, 3000);
  }

  /* One recorded click, replayed through the INPUT half's own tap path — so a
     restored click is exactly the click a view-mode press produces: same
     events, in the same order, with the same hover set up before them. Quiet,
     because a tap that lands on a field must not pull the host's focus into a
     frame nobody has touched yet. */
  var tapAt = function (step) {
    var el = null;
    try { el = step.p ? document.querySelector(step.p) : null; } catch (err) { el = null; }
    var x = step.x, y = step.y;
    if (el) {
      var r = el.getBoundingClientRect();
      // A zero-sized match is a stale selector pointing at something the
      // document has since collapsed: the recorded point is the better guess.
      if (r.width || r.height) { x = r.left + r.width / 2; y = r.top + r.height / 2; }
    }
    postMessage({ type: 'canvas-input-tap', x: x, y: y, pointerType: 'mouse', detail: 1, quiet: true }, '*');
  };

  var replayTrail = function (steps, done) {
    var i = 0;
    var next = function () {
      if (i >= steps.length) {
        /* Each replayed tap hovers what it aims at, and the input half leaves
           that hover standing until something moves off it — which here would
           be a control sitting lit up on a board nobody has touched. Ending the
           hover the same way a real pointer leaving does clears it. */
        postMessage({ type: 'canvas-input-hover-end' }, '*');
        return settle(done);
      }
      tapAt(steps[i++]);
      settle(next);
    };
    next();
  };

  var restore = function (page) {
    clearTimeout(bootTimer);
    // Nothing to restore, but the veil may already be up on the boot flag.
    if (!page) { reveal(); ready(); return; }
    if (restoring) return;
    restoring = true;
    hide();
    var settled = false;
    var done = function () {
      if (settled) return;
      settled = true;
      restoring = false;
      reveal();
      // The host paints a loading indicator over a node it knows is restoring;
      // this is what takes it down.
      ready();
    };
    // Whatever happens — a hook that throws, a selector that matches nothing, a
    // document that never settles — the veil comes off.
    var guard = setTimeout(done, 2500);
    var finish = function () { clearTimeout(guard); done(); };
    try {
      if (page.hook !== undefined && window.canvasPage && typeof window.canvasPage.set === 'function') {
        window.canvasPage.set(page.hook);
        return void settle(finish);
      }
      if (page.hash != null) {
        if (('#' + page.hash) !== location.hash) location.hash = page.hash;
        return void settle(finish);
      }
      if (page.taps && page.taps.length) {
        /* The restored path becomes this document's own trail, so a capture
           taken after further navigation still describes the whole way from
           boot rather than only what followed the restore. */
        trail = page.taps.slice();
        return void replayTrail(page.taps, finish);
      }
    } catch (err) { /* a document that threw is still a document to show */ }
    finish();
  };

  addEventListener('message', function (e) {
    var d = e.data;
    if (!d) return;
    if (d.type === 'canvas-page-get') { send({ type: 'canvas-page', page: capture() }); return; }
    if (d.type === 'canvas-page-restore') restore(d.page);
  });
})()</` + 'script>';

/* The four halves, each stamped with the version of the script it carries. Bump
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
  { marker: 'data-cv-zoom-opts', version: '5', script: ZOOM_OPTS },
  { marker: 'data-cv-input', version: '3', script: INPUT_BRIDGE },
  { marker: 'data-cv-page', version: '2', script: PAGE_BRIDGE },
];

/* ── Does this document actually follow the theme? ──

   The theme half of the bridge can only carry the host's theme across the
   boundary; it cannot make a document act on it. A document that themes itself
   in CSS gets that for free — its media rules are rewritten. A document that
   themes itself in *script* has to listen:

     const scheme = matchMedia('(prefers-color-scheme: dark)');
     let dark = scheme.matches;
     scheme.addEventListener('change', (e) => { dark = e.matches; render(); });

   One that reads `.matches` once at boot and stops there paints its first frame
   correctly and then sits at that theme for good — which looks like a working
   document right up until someone flips the board. That is a silent failure: it
   survives every screenshot, and it shipped once already (the health app on
   project-canvas-health).

   So: read the document at ingest and say so. Findings are advisory and never
   block — the board is a design tool, and a half-finished prototype dropped on
   it is a normal thing to do. `level` is 'warn' for a document that means to
   theme and got it wrong, 'note' for one that never had a theme to follow.

   This is a read of the source text, not of the running document, and it is
   honest about what that can miss: a document that hands its MediaQueryList to
   a helper (`watch(matchMedia(q), render)`) rather than binding it is reported
   as not listening. The exact version of this check is a runtime one — the
   bridge holds every prefers-color-scheme query it handed out and could count
   listeners on them — worth building if the text read starts crying wolf. */

const Q = String.raw`matchMedia\s*\(\s*['"\`][^'"\`]*prefers-color-scheme`;
const ON = String.raw`addEventListener\s*\(\s*['"\`]change|addListener\s*\(|onchange\s*=`;

export function auditHtml(html) {
  // The bridge's own scripts query prefers-color-scheme and listen to it; left
  // in, they would answer for the document.
  let src = html;
  for (const { marker } of BRIDGE) {
    src = src.replace(new RegExp(`<script ${marker}[^>]*>[\\s\\S]*?</script\\s*>`, 'gi'), '');
  }

  const queries = new RegExp(Q, 'i').test(src);
  const cssRules = /@media[^{]*prefers-color-scheme/i.test(src);
  const out = [];

  if (queries) {
    // Listening counts only on the query's own MediaQueryList — an unrelated
    // 'change' listener elsewhere in the document must not stand in for it.
    const chained = new RegExp(`${Q}[^'"\`]*['"\`]\\s*\\)\\s*\\.\\s*(?:${ON})`, 'i').test(src);
    const bound = [...src.matchAll(new RegExp(String.raw`(?:const|let|var)\s+([\w$]+)\s*=[^;\n]*?${Q}`, 'gi'))]
      .map((m) => m[1]);
    const listens = chained || bound.some((name) =>
      new RegExp(String.raw`\b${name}\s*\.\s*(?:${ON})`, 'i').test(src));
    if (!listens) out.push({
      level: 'warn', code: 'theme-read-once',
      message: 'reads prefers-color-scheme in script but never listens for a change — '
        + 'it will paint the right theme once and then stay there. Add '
        + "scheme.addEventListener('change', …) and re-render. See EMBEDDED-HTML.md, “Theming from script”.",
    });
  } else if (!cssRules) out.push({
    level: 'note', code: 'theme-none',
    message: 'has no prefers-color-scheme rules and no theme query — it will keep its own '
      + 'single appearance whatever the board does.',
  });

  return out;
}

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
