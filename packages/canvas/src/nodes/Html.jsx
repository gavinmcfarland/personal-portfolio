import { memo, useCallback, useEffect, useRef } from 'react';
import { useCanvas } from '../CanvasProvider';
import { useRegister, useMediaSrc } from './common';
import { frameBarH } from '../constants';
import { FrameBar } from './DeviceFrame';

/* A dropped/pasted HTML document rendered live in a sandboxed iframe. The
   iframe is the whole point: the document's styles and scripts are fully
   isolated from the host page (and vice versa). `sandbox="allow-scripts"` —
   deliberately without allow-same-origin — runs the demo's JS as an opaque
   origin, so even a same-origin /canvas-assets file can't touch the parent.

   Pointer events: an iframe swallows them, which would kill drag/pan/select
   over the node. So the iframe sits inert (pointer-events:none) behind a
   transparent shield until the node is "live" (htmlActiveId — double-click in
   edit mode, a stationary tap in view mode); then the shield drops and the
   demo is directly interactive. A press outside or Escape deactivates. */

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

function HtmlNode({ node }) {
  const { htmlActiveId } = useCanvas();
  const { setRef, dataProps, style } = useRegister(node);
  const src = useMediaSrc(node.src);
  const live = htmlActiveId === node.id;
  const frameRef = useRef(null);
  const postTheme = useThemeSync(frameRef);

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
            onLoad={postTheme}
            style={{ colorScheme: bootTheme.current }}
          />
          {!live && <div className="cv-html-shield" />}
        </div>
      </div>
    </div>
  );
}

export default memo(HtmlNode);
