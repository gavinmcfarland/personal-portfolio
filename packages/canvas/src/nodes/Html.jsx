import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
   activate first. Two of them can't be replayed in at all, because they follow
   the REAL pointer and the real pointer is on the shield: CSS `:hover`, which
   the document mirrors onto a class of its own, and the cursor, which it reports
   back out for the shield to wear. What is genuinely left over is a demo's own
   dragging and scrolling. Hold SHIFT for those — the shield drops, the iframe
   takes the pointer, and the document behaves exactly as it would standalone.

   NOT INTERACTIVE. A node carrying `inert` opts out of all of that: nothing is
   forwarded in, the shield never stands down for SHIFT, and a tap is only ever
   a tap on the board. The document still runs — it is a live rendering, with
   its own animations and its own theme sync — it just cannot be driven. For a
   prototype that is on the board to be looked at rather than clicked through,
   that is the whole difference: no stray click walks it off the screen it was
   placed on. Edit mode is deliberately unaffected, since setting a start page
   means navigating there first.

   EDIT MODE. Authoring needs the whole gesture (marquee, move, resize), so
   nothing is forwarded either way: the shield is simply a hit surface until the
   node is made "live" by a double-click, when it drops and the demo is directly
   interactive. A press outside or Escape deactivates — and that press is also
   when the board asks the document which screen it ended up on, so navigating a
   prototype in edit mode is how its start page is set (see captureHtmlPage). */

/* Theme: the host's `.dark` class (and its tokens) stop at the iframe
   boundary, and browsers don't let an embedder flip a child document's
   `prefers-color-scheme` (it tracks the OS alone). So the theme crosses by
   message instead: on load and on every host theme flip, post
   { type: 'canvas-theme', theme } into the frame — the sync script baked into
   the document at ingest (see addHtmlFromFile) applies it by rewriting the
   document's prefers-color-scheme media rules. targetOrigin '*' because the
   sandboxed document's origin is opaque. */
function postThemeTo(f) {
  if (!f || !f.contentWindow) return;
  const dark = !!(f.closest && f.closest('.dark'));
  // Mirror the scheme onto the iframe ELEMENT: when it differs from the
  // embedded document's, the browser forces an opaque canvas — which would
  // break the transparent background documents rely on to sit on the board.
  f.style.colorScheme = dark ? 'dark' : 'light';
  f.contentWindow.postMessage({ type: 'canvas-theme', theme: dark ? 'dark' : 'light' }, '*');
}

/* Posted to every frame the node currently has, which during a reload is two:
   the document on screen and its invisible replacement (see the swap below).
   A flip that lands in that window would otherwise reach only the one about to
   be thrown away, and the new document would arrive in the old theme. */
function useThemeSync(framesOf) {
  const post = useCallback(() => { framesOf().forEach(postThemeTo); }, [framesOf]);
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

/* What the document sends back — each of it something the host has to do on the
   document's behalf, because the thing in question belongs to the real pointer
   and the real pointer is out here. */
function useFrameMessages(frameRef, shieldRef, active, eng) {
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
      /* The cursor the document would be showing under the pointer — a pointer
         over a link or a button, an I-beam over text, a resize handle's arrows.
         Like `:hover`, it follows the REAL cursor, which is on the shield: a
         plain div that knows nothing of what is beneath it, so a demo full of
         controls otherwise reads as flat board under the one signal that says
         it can be clicked.

         So the document computes it (see INPUT_BRIDGE) and the shield wears it.
         A custom property rather than the `cursor` property itself, so the
         board's own cursor still wins where it should: an empty or unusable
         value makes the CSS declaration invalid at computed-value time, and
         `cursor` inherits — so the shield falls back to the board's, which is
         also what the gesture rules in canvas.css rely on (see .cv-html-shield). */
      if (e.data.type === 'canvas-input-cursor') {
        const shield = shieldRef.current;
        if (shield) {
          const c = e.data.cursor;
          if (c && c !== 'default' && c !== 'auto') shield.style.setProperty('--cv-html-cursor', c);
          else shield.style.removeProperty('--cv-html-cursor');
        }
        return;
      }
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
  /* Is a restore coming on this load? Captured once, at mount, for the same
     reason the boot theme is: it decides the frame's URL, and re-deciding it
     later would reload the document. Setting a start page mid-session therefore
     doesn't re-flag the frame — nor should it, since nothing reloads. */
  const bootPage = useRef(null);
  if (bootPage.current === null) bootPage.current = !!node.page;
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
  // Whether to paint the loading indicator: true until the document says it has
  // arrived (canvas-page-ready), and only ever true where a restore is due.
  const [booting, setBooting] = useState(bootPage.current);

  /* THE FRAMES. Normally one — the document on screen. A reload (the reader's
     Reset, "Clear start page", eng.reloadHtmlFrame) adds a SECOND, and for as
     long as it takes the replacement to load and walk back to its start page
     the node holds both: the old document still painted, the new one stacked
     over it and invisible. They swap the moment the new one reports it is ready.

     The alternative — reloading the one frame in place — empties the node for
     the whole of that wait, and an embed is transparent by design (a frameless
     one has no backdrop at all), so what the reader sees is the board straight
     through a hole where the demo was: the flicker this exists to remove.
     Painting something over the gap instead would only trade it for a flash of
     whatever was painted, which is why the boot indicator deliberately fills
     nothing.

     Keyed, and never re-parented: React drops the outgoing entry and leaves the
     incoming element exactly where it already is in the DOM, because moving or
     re-creating an iframe reloads its document — which would put the gap back
     at the one moment it is most visible.

     Each entry carries the theme and start-page flag its URL hash was built
     with, so the outgoing frame keeps the src it loaded (any change to it is a
     navigation) while the incoming one gets today's. */
  const nextKey = useRef(0);
  const [frames, setFrames] = useState(() => [
    { key: 0, theme: bootTheme.current, page: bootPage.current },
  ]);

  const { setRef, dataProps, style } = useRegister(node);
  const src = useMediaSrc(node.src);
  // Activation is an edit-mode idea only: in view mode the shield stays up and
  // the demo is kept interactive from the inside, so there is nothing to
  // activate — and a node left live when the board flipped to view mode must not
  // stay exempt from that.
  const live = htmlActiveId === node.id && !readOnly;
  const rootRef = useRef(null);
  const setRoot = useCallback((el) => { rootRef.current = el; setRef(el); }, [setRef]);
  /* Read off the DOM rather than tracked in a ref, which is also how the board
     and the input bridge find a node's frame (frameOf). Document order is the
     stacking order: [0] is the one on screen, [1] the replacement mid-reload. */
  const framesOf = useCallback(() => (
    rootRef.current ? Array.from(rootRef.current.querySelectorAll('.cv-html-frame')) : []
  ), []);
  // The frame everything else means by "the frame": the one being shown. Kept
  // in a ref because the message handlers and the input bridge read it outside
  // of render, and re-pointed the instant a reload swaps in its replacement.
  const frameRef = useRef(null);
  useEffect(() => { frameRef.current = framesOf()[0] || null; }, [framesOf, frames]);

  // The hit surface over the iframe, held because it is what wears the cursor
  // the document reports (useFrameMessages). Null whenever there isn't one —
  // React clears it when the node goes live and the shield unmounts.
  const shieldRef = useRef(null);

  useThemeSync(framesOf);
  useFrameMessages(frameRef, shieldRef, readOnly, eng);
  /* The page this node was saved on (see captureHtmlPage), read through a ref
     so a later capture never re-runs the seed — the document is already up by
     then, and re-posting the restore would walk it through the trail again. */
  const pageRef = useRef(node.page);
  pageRef.current = node.page;
  /* On load, hand the document both pieces of host state it can't infer: the
     theme, and the board's current zoom (which decides whether its
     backdrop-filters render — see ZOOM_OPTS). The zoom broadcast only fires on
     gesture edges, so without this seed a document on a board nobody zooms
     never hears anything. */
  const onLoad = useCallback((e) => {
    const f = e.currentTarget;
    postThemeTo(f);
    eng.postZoomStateTo(f);
    /* And the screen the board remembers this document on, if any.

       Sent even when there is none, because a document that veiled itself on
       the boot flag is waiting to hear either way — and the two can disagree.
       Clearing a start page reloads the frame, and the URL React put there
       still carries the flag (changing it would mean a second reload), so the
       document that comes back veils itself for a restore that is never
       coming. A null answer is what takes the veil down promptly instead of
       leaving it to the bridge's three-second watchdog. */
    if (f.contentWindow) {
      f.contentWindow.postMessage({ type: 'canvas-page-restore', page: pageRef.current || null }, '*');
    }
  }, [eng]);

  /* A reload, asked for by the board (reloadHtmlFrame dispatches it on the node
     element). Answering marks the event handled, so the board leaves the frame
     alone and the swap below is what puts the new document up. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const onReload = (e) => {
      /* Nothing loaded to replace (a media ref that hasn't resolved yet). Left
         unhandled so the board's own path decides, which bails on the same
         test — the point is that no frame is added for a document that isn't
         there. */
      const front = framesOf()[0];
      if (!front || !front.src || front.src === 'about:blank') return;
      e.preventDefault();
      setFrames((fs) => {
        // One at a time: a second Reset while a replacement is still loading
        // would leave a document on screen that nothing is waiting on.
        if (fs.length > 1) return fs;
        nextKey.current += 1;
        const dark = document.documentElement.classList.contains('dark')
          || (document.body && document.body.classList.contains('dark'));
        return [...fs, { key: nextKey.current, theme: dark ? 'dark' : 'light', page: !!pageRef.current }];
      });
    };
    el.addEventListener('cv-html-reload', onReload);
    return () => el.removeEventListener('cv-html-reload', onReload);
  }, [framesOf]);

  /* The swap. The replacement is up and hidden; this waits for it to say it is
     on the screen it should have opened on — canvas-page-ready, the same signal
     the boot indicator waits on — and then drops the document it replaces.

     Backed by a deadline, because ready only comes from a document carrying the
     page half of the bridge: an older one never answers, and the node would sit
     showing a stale document forever. The wait is invisible either way (the old
     document is still painted), so it can afford to be generous where a restore
     is actually due — the bridge gives itself 2.5s to walk a trail. */
  useEffect(() => {
    if (frames.length < 2) return undefined;
    const incoming = frames[1];
    let timer = 0;
    const swap = () => {
      clearTimeout(timer);
      setFrames((fs) => (fs.length > 1 ? fs.slice(1) : fs));
    };
    const onMessage = (e) => {
      const f = framesOf()[1];
      if (!f || !f.contentWindow || e.source !== f.contentWindow || !e.data) return;
      if (e.data.type === 'canvas-page-ready') swap();
    };
    window.addEventListener('message', onMessage);
    timer = setTimeout(swap, incoming.page ? 3500 : 1200);
    return () => { window.removeEventListener('message', onMessage); clearTimeout(timer); };
  }, [frames, framesOf]);

  /* The cursor, forwarded so the document can light up under it. Throttled to a
     frame: a demo that recomputes on every mousemove would otherwise be driven
     harder than a real cursor drives it. Skipped while a gesture is running —
     mid-pan the board is moving the content, not pointing at it. */
  const hoverRAF = useRef(0);
  const onShieldMove = useCallback((e) => {
    if (!readOnly || node.inert || eng.actionRef?.current) return;
    const { clientX, clientY } = e;
    if (hoverRAF.current) return;
    hoverRAF.current = requestAnimationFrame(() => {
      hoverRAF.current = 0;
      postHover(frameRef.current, clientX, clientY);
    });
  }, [readOnly, node.inert, eng]);
  const onShieldLeave = useCallback((e) => {
    if (!readOnly) return;
    if (hoverRAF.current) { cancelAnimationFrame(hoverRAF.current); hoverRAF.current = 0; }
    // Here as well as on the document's answer: a document carrying an older
    // bridge never reports a cursor, and one that has just been navigated away
    // from is in no position to answer at all. The board's cursor is the right
    // one the moment the pointer is off the node either way.
    e.currentTarget.style.removeProperty('--cv-html-cursor');
    postHoverEnd(frameRef.current);
  }, [readOnly]);
  useEffect(() => () => { if (hoverRAF.current) cancelAnimationFrame(hoverRAF.current); }, []);

  /* The document, veiled since boot, reporting that it has arrived. Backed by a
     deadline of its own: the bridge lifts its veil after 3s whatever happens, so
     the indicator must not outlast a document that is already on screen — and a
     document too old to carry the page half never answers at all. */
  useEffect(() => {
    if (!booting) return undefined;
    const onMessage = (e) => {
      const f = frameRef.current;
      if (!f || !f.contentWindow || e.source !== f.contentWindow || !e.data) return;
      if (e.data.type === 'canvas-page-ready') setBooting(false);
    };
    window.addEventListener('message', onMessage);
    const t = setTimeout(() => setBooting(false), 3500);
    return () => { window.removeEventListener('message', onMessage); clearTimeout(t); };
  }, [booting]);

  /* The document reporting that the reader has driven it off the state the
     board opened it on. The board paints the way back — in the chrome layer, not
     here, so it keeps one size at any zoom and stays on screen over a node taller
     than the window (see placeHtmlResets). View mode only: an author in edit mode
     has the context menu, and a Reset over every embed would be chrome in the way
     of the work. */
  useEffect(() => {
    if (!readOnly) return undefined;
    const onMessage = (e) => {
      const f = frameRef.current;
      if (!f || !f.contentWindow || e.source !== f.contentWindow || !e.data) return;
      if (e.data.type === 'canvas-page-moved') eng.markHtmlMoved(node.id, true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [readOnly, eng, node.id]);
  // A node that leaves the board (or the mode) takes its way back with it.
  useEffect(() => () => eng.markHtmlMoved(node.id, false), [eng, node.id]);

  /* cv-page tells the document a restore is coming, so its page half can veil
     it before its first paint (see PAGE_BRIDGE). Without that the document
     paints the screen it boots into, blinks, and lands on the saved one — the
     restore message only arrives after load, which is far too late to prevent
     it. A flag, not the page itself: the payload can be long, and it comes over
     postMessage a moment later anyway. */
  const srcFor = (f) => (src && !src.startsWith('data:')
    ? `${src}#cv-theme=${f.theme}${f.page ? '&cv-page=1' : ''}`
    : src);

  const w = (node.w || 800) + 'px';
  const h = (node.h || 500) + 'px';
  // Same chrome-bar sizing as MediaNode: the frame (and the node's corner
  // radius) derive from --cv-df-bar set on the node element.
  const barStyle = node.frame
    ? { '--cv-df-bar': `${node.frameScale ? Math.max(1, (node.h || 0) * node.frameScale) : frameBarH(node.frame)}px` }
    : null;

  // cv-html-inert is what the board reads back off the DOM: the CSS keeps the
  // shield up through SHIFT, and Canvas.jsx's pointerdown skips the node when it
  // looks for the html under the cursor, so no press is ever handed back to it.
  const cls = `cv-node cv-html${live ? ' cv-live' : ''}${node.frame ? ' cv-framed' : ''}${node.inert ? ' cv-html-inert' : ''}`;
  // The cv-df/cv-df-screen skeleton renders permanently (frameless too, where
  // it's invisible) with the chrome bar as a conditional FIRST child — so
  // toggling a device frame on/off never re-parents the iframe. Re-parenting
  // reloads the document: the demo loses its state and repaints in the OS
  // theme until the sync message lands (a visible flash).
  return (
    <div ref={setRoot} className={cls} {...dataProps} style={{ ...style, width: w, height: h, ...barStyle }}>
      <div className={`cv-df cv-df--${node.frame || 'plain'}`}>
        {node.frame ? <FrameBar node={node} /> : null}
        <div className="cv-df-screen">
          {/* The iframe element's color-scheme is seeded to match the boot
              theme the hash hands the document (and kept in sync by postTheme)
              — a mismatch makes the browser force an opaque canvas. */}
          {frames.map((f, i) => (
            <iframe
              key={f.key}
              className={`cv-html-frame${i > 0 ? ' cv-html-next' : ''}`}
              src={srcFor(f) || undefined}
              sandbox="allow-scripts"
              title={node.name || 'HTML'}
              /* Lazy only for the frame the node mounts with. A reload's
                 replacement must be eager: the frame sits in the scaled world,
                 where the browser's lazy heuristic cannot see it as visible, and
                 a load asked for there is deferred until something unrelated
                 nudges the page — measured at 217 seconds against 314ms with
                 lazy off, which is a reload that never appears to happen. */
              loading={f.key === 0 ? 'lazy' : 'eager'}
              onLoad={onLoad}
              style={{ colorScheme: f.theme }}
            />
          ))}
          {/* The hit surface. Everything the board reserves lands here rather
              than in the iframe, which is what lets a pan or a wheel cross the
              node as if it weren't there. In view mode it also tracks the cursor
              so the document can be told where it is. */}
          {!live && (
            <div
              ref={shieldRef}
              className="cv-html-shield"
              onPointerMove={onShieldMove}
              onPointerLeave={onShieldLeave}
            />
          )}
          {/* Over a document that is hiding itself while it walks back to its
              saved screen. The spinner fades in on a delay (see the CSS): a
              restore that lands quickly — most do — should show nothing at all,
              or the indicator becomes the flicker it was added to remove. */}
          {booting && (
            <div className="cv-html-boot">
              <Loader2 className="cv-spin" />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default memo(HtmlNode);
