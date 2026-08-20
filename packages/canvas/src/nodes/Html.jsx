import { memo, useCallback, useEffect, useRef } from 'react';
import { useCanvas } from '../CanvasProvider';
import { useRegister, useMediaSrc } from './common';
import { frameBarH } from '../constants';
import { FrameBar } from './DeviceFrame';
import { postHover, postHoverEnd } from '../html-input';

/* A dropped/pasted HTML document rendered live in a sandboxed iframe. The
   iframe is the whole point: the document's styles and scripts are fully
   isolated from the host page (and vice versa). `sandbox="allow-scripts"` —
   deliberately without allow-same-origin — runs the demo's JS as an opaque
   origin, so even a same-origin /canvas-assets file can't touch the parent.

   Pointer events: an iframe swallows them, which would kill drag/pan/select
   over the node. So it never gets them. The iframe is inert
   (`pointer-events: none`) behind a transparent shield, and every gesture lands
   on the board instead — where the board's ordinary handlers take it, with its
   own pointer capture and its own wheel listener. That is the whole reason the
   board can be panned and zoomed over a demo without any of it going wrong at
   the node's edge: the demo was never in the path.

   VIEW MODE. The shield stays up, and the demo is kept interactive from the
   other direction: the board sends the cursor's position and any press that
   turned out to be a tap INTO the document, where the script baked in at ingest
   (INPUT_BRIDGE in html-bridge.js) replays them as real DOM events at that
   point. Hover states, clicks, links and form fields all work, with nothing to
   activate first. Two things can't be replayed and don't need to be: CSS
   `:hover` (it follows the real cursor, which is on the shield) and a demo's own
   dragging and scrolling. Hold SHIFT for those — the shield drops, the iframe
   takes the pointer, and the document behaves exactly as it would standalone.

   EDIT MODE. Authoring needs the whole gesture (marquee, move, resize), so
   nothing is forwarded either way: the shield is simply a hit surface until the
   node is made "live" by a double-click, when it drops and the demo is directly
   interactive. A press outside or Escape deactivates. */

/* Theme: the host's `.dark` class (and its tokens) stop at the iframe
   boundary, and browsers don't let an embedder flip a child document's
   `prefers-color-scheme` (it tracks the OS alone). So the theme crosses by
   message instead: on load and on every host theme flip, post
   { type: 'canvas-theme', theme } into the frame — the sync script baked into
   the document at ingest (see addHtmlFromFile) applies it by rewriting the
   document's prefers-color-scheme media rules. targetOrigin '*' because the
   sandboxed document's origin is opaque. */
function useThemeSync(frameRef) {
  const post = useCallback(() => {
    const f = frameRef.current;
    if (!f || !f.contentWindow) return;
    const dark = !!(f.closest && f.closest('.dark'));
    // Mirror the scheme onto the iframe ELEMENT: when it differs from the
    // embedded document's, the browser forces an opaque canvas — which would
    // break the transparent background documents rely on to sit on the board.
    f.style.colorScheme = dark ? 'dark' : 'light';
    f.contentWindow.postMessage({ type: 'canvas-theme', theme: dark ? 'dark' : 'light' }, '*');
  }, [frameRef]);
  useEffect(() => {
    // The portfolio's switcher (like most) toggles the class on <html>/<body>;
    // watch both. A theme class on a deeper wrapper would need its own signal.
    const mo = new MutationObserver(post);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, [post]);
  return post;
}

/* What the document sends back. Only two things, both of which need the host to
   act on the document's behalf. */
function useFrameMessages(frameRef, active, eng) {
  useEffect(() => {
    if (!active) return undefined;
    /* Identified by source rather than origin: a sandboxed document has an
       opaque one, and there is no window to compare against but the frame's. */
    const onMessage = (e) => {
      const f = frameRef.current;
      if (!f || !f.contentWindow || e.source !== f.contentWindow || !e.data) return;
      /* A replayed tap landed on something you type into. Keystrokes follow the
         focused FRAME, and this one has never been focused — the press that
         would have done it landed on the shield. Focusing it here is what lets
         real typing reach the field, with no synthetic key events involved (an
         untrusted one inserts nothing). While the frame holds focus the host
         window stops receiving keydown, so the board's own shortcuts stand
         aside for as long as the user is typing. */
      if (e.data.type === 'canvas-input-focus') { f.focus({ preventScroll: true }); return; }
      /* Shift, seen from inside because focus is in there (the user is typing in
         a demo). The board owns the shield, so it has to be told. */
      if (e.data.type === 'canvas-input-shift') eng.setHtmlPassThrough(!!e.data.on);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [frameRef, active, eng]);
}

function HtmlNode({ node }) {
  const { htmlActiveId, readOnly, eng } = useCanvas();
  const { setRef, dataProps, style } = useRegister(node);
  const src = useMediaSrc(node.src);
  // Activation is an edit-mode idea only: in view mode the shield stays up and
  // the demo is kept interactive from the inside, so there is nothing to
  // activate — and a node left live when the board flipped to view mode must not
  // stay exempt from that.
  const live = htmlActiveId === node.id && !readOnly;
  const frameRef = useRef(null);
  const postTheme = useThemeSync(frameRef);
  useFrameMessages(frameRef, readOnly, eng);
  /* On load, hand the document both pieces of host state it can't infer: the
     theme, and the board's current zoom (which decides whether its
     backdrop-filters render — see ZOOM_OPTS). The zoom broadcast only fires on
     gesture edges, so without this seed a document on a board nobody zooms
     never hears anything. */
  const onLoad = useCallback(() => {
    postTheme();
    eng.postZoomStateTo(frameRef.current);
  }, [postTheme, eng]);

  /* The cursor, forwarded so the document can light up under it. Throttled to a
     frame: a demo that recomputes on every mousemove would otherwise be driven
     harder than a real cursor drives it. Skipped while a gesture is running —
     mid-pan the board is moving the content, not pointing at it. */
  const hoverRAF = useRef(0);
  const onShieldMove = useCallback((e) => {
    if (!readOnly || eng.actionRef?.current) return;
    const { clientX, clientY } = e;
    if (hoverRAF.current) return;
    hoverRAF.current = requestAnimationFrame(() => {
      hoverRAF.current = 0;
      postHover(frameRef.current, clientX, clientY);
    });
  }, [readOnly, eng]);
  const onShieldLeave = useCallback(() => {
    if (!readOnly) return;
    if (hoverRAF.current) { cancelAnimationFrame(hoverRAF.current); hoverRAF.current = 0; }
    postHoverEnd(frameRef.current);
  }, [readOnly]);
  useEffect(() => () => { if (hoverRAF.current) cancelAnimationFrame(hoverRAF.current); }, []);

  // Boot theme, carried in the URL hash so the injected sync script can apply
  // it before the document's first paint — the message path only lands after
  // onLoad, which would flash the OS theme first. Captured once: rewriting the
  // src on later theme flips would reload the iframe (the message handles
  // those). data: URLs are left alone (a hash would corrupt the document).
  const bootTheme = useRef(null);
  if (bootTheme.current === null) {
    bootTheme.current = document.documentElement.classList.contains('dark')
      || (document.body && document.body.classList.contains('dark')) ? 'dark' : 'light';
  }
  const frameSrc = src && !src.startsWith('data:') ? `${src}#cv-theme=${bootTheme.current}` : src;

  const w = (node.w || 800) + 'px';
  const h = (node.h || 500) + 'px';
  // Same chrome-bar sizing as MediaNode: the frame (and the node's corner
  // radius) derive from --cv-df-bar set on the node element.
  const barStyle = node.frame
    ? { '--cv-df-bar': `${node.frameScale ? Math.max(1, (node.h || 0) * node.frameScale) : frameBarH(node.frame)}px` }
    : null;

  const cls = `cv-node cv-html${live ? ' cv-live' : ''}${node.frame ? ' cv-framed' : ''}`;
  // The cv-df/cv-df-screen skeleton renders permanently (frameless too, where
  // it's invisible) with the chrome bar as a conditional FIRST child — so
  // toggling a device frame on/off never re-parents the iframe. Re-parenting
  // reloads the document: the demo loses its state and repaints in the OS
  // theme until the sync message lands (a visible flash).
  return (
    <div ref={setRef} className={cls} {...dataProps} style={{ ...style, width: w, height: h, ...barStyle }}>
      <div className={`cv-df cv-df--${node.frame || 'plain'}`}>
        {node.frame ? <FrameBar node={node} /> : null}
        <div className="cv-df-screen">
          {/* The iframe element's color-scheme is seeded to match the boot
              theme the hash hands the document (and kept in sync by postTheme)
              — a mismatch makes the browser force an opaque canvas. */}
          <iframe
            ref={frameRef}
            className="cv-html-frame"
            src={frameSrc || undefined}
            sandbox="allow-scripts"
            title={node.name || 'HTML'}
            loading="lazy"
            onLoad={onLoad}
            style={{ colorScheme: bootTheme.current }}
          />
          {/* The hit surface. Everything the board reserves lands here rather
              than in the iframe, which is what lets a pan or a wheel cross the
              node as if it weren't there. In view mode it also tracks the cursor
              so the document can be told where it is. */}
          {!live && (
            <div
              className="cv-html-shield"
              onPointerMove={onShieldMove}
              onPointerLeave={onShieldLeave}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(HtmlNode);
