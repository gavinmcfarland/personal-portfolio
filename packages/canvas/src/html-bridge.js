/* The bridge baked into every HTML document the canvas ingests.

   An `html` node is a sandboxed iframe at an opaque origin (see nodes/Html.jsx):
   the host can't reach into it and it can't reach out. Everything the document
   needs to know about the board therefore arrives as `postMessage`, and these
   two scripts — injected at the end of <head> at ingest — are what listen.

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

/* The two halves, each stamped with the version of the script it carries. Bump
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
