import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Maximize, Scaling, AppWindow, Puzzle, Terminal, Smartphone, SquareX, Expand, ExternalLink, Copy, Scissors, CopyPlus, ClipboardPaste, Grid2x2, BringToFront, SendToBack, Anchor, Pencil, Trash2, Sun, Moon, MessageSquareText, RectangleHorizontal, ChevronRight } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { FRAME_RATIOS, atRatio } from '../constants';

export default function ContextMenu() {
  const { ctxMenu, setCtxMenu, nodes, selected, gridHidden, eng, rootRef } = useCanvas();
  // Which row's flyout is open. Only one ever is, so a single id is enough.
  const [submenu, setSubmenu] = useState(null);
  const menuRef = useRef(null);
  // Close any flyout when the menu itself opens somewhere new — a stale one
  // would otherwise be hanging open the moment the new menu appears.
  useEffect(() => { setSubmenu(null); }, [ctxMenu]);

  /* Pull the menu back inside the board if it hangs off the bottom.
     `place()` below clamps against a GUESSED height, because where the menu
     goes has to be decided before it exists — and the guess is short for the
     longer menus (a frame's, a media node's), which then run past the board
     edge with their last items unreachable. Measuring once it is on screen is
     the only way to know, so this corrects the guess rather than replacing it:
     the first paint is already in the right place for every menu that fits. */
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el || !ctxMenu) return;
    const board = rootRef?.current;
    const bottom = board ? board.clientHeight : window.innerHeight;
    const over = el.offsetTop + el.offsetHeight - bottom;
    if (over > 0) el.style.top = `${Math.max(0, el.offsetTop - over)}px`;
  }, [ctxMenu, submenu, rootRef]);

  useEffect(() => {
    if (!ctxMenu) return undefined;
    const close = (e) => { if (!e.target.closest || !e.target.closest('[data-cv-part="context-menu"]')) setCtxMenu(null); };
    const onBlur = () => setCtxMenu(null);
    window.addEventListener('pointerdown', close, true);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointerdown', close, true);
      window.removeEventListener('blur', onBlur);
    };
  }, [ctxMenu, setCtxMenu]);

  if (!ctxMenu) return null;
  const { target } = ctxMenu; // {kind:'node'|'shape', id}, {kind:'multi'} → whole selection, or {kind:'canvas'} → empty space
  const run = (fn) => () => { fn(); setCtxMenu(null); };

  // ctxMenu.x/y are the viewport click point (clientX/clientY). The menu is
  // positioned relative to `.canvas-root` (position: absolute), so map the point
  // into root-local space and clamp within the board. This keeps the menu glued to
  // the cursor even when the board isn't maximised — a transformed host-page
  // ancestor would otherwise offset a viewport-`fixed` menu away from the click.
  const rect = rootRef?.current?.getBoundingClientRect();
  const localX = ctxMenu.x - (rect ? rect.left : 0);
  const localY = ctxMenu.y - (rect ? rect.top : 0);
  const bw = rect ? rect.width : innerWidth;
  const bh = rect ? rect.height : innerHeight;
  const place = (w, h) => ({ left: Math.max(0, Math.min(localX, bw - w)), top: Math.max(0, Math.min(localY, bh - h)) });
  // A flyout opens to the right of the menu unless there isn't room for it
  // there, in which case it opens to the left. Both widths are the CSS ones.
  const MENU_W = 190;
  const SUB_W = 168;
  const flipSub = place(MENU_W, MENU_W).left + MENU_W + SUB_W > bw;

  // Right-click on empty canvas: the only action is Paste, dropped at the click
  // point captured when the menu opened.
  if (target.kind === 'canvas') {
    return (
      <div ref={menuRef} className="cv-panel" data-open="" data-cv-part="context-menu" style={place(190, 120)}>
        <button onClick={run(() => eng.pasteFromMenu(target.wx, target.wy))}>
          <ClipboardPaste />
          Paste here
        </button>
        <div className="cv-ctxsep" />
        <button data-active={!gridHidden ? '' : undefined} onClick={run(() => eng.toggleGrid())}>
          <Grid2x2 />
          {gridHidden ? 'Show dot grid' : 'Hide dot grid'}
        </button>
      </div>
    );
  }

  const node = target.kind === 'node' ? nodes.find((n) => n.id === target.id) : null;
  const anchorable = node && node.type !== 'frame';
  // A frame is a section: its label is the name shown in the page/section menu,
  // so renaming it inline is the first thing on offer here.
  const isFrame = node && node.type === 'frame';
  // Speaker notes hang off anything the presenter can navigate to, which is a
  // frame or any anchored node — the same test sectionNodes() walks.
  const isSection = node && (node.type === 'frame' || node.anchor);
  const count = target.kind === 'multi' ? selected.length : 1;
  // A media node opens full-screen unless it's a lone SVG (vector art shown full
  // size on the board already); a grid of two+ assets always opens the gallery.
  const isMedia = node && (node.type === 'image' || node.type === 'video');
  const singleAsset = isMedia && node.assets && node.assets.length === 1;
  const loneSvg = singleAsset && node.assets[0].svg;
  // The image asset the theme-variant actions target: the right-clicked grid
  // cell (captured as target.mediaIdx when the menu opened), or a lone asset.
  const mediaIdx = target.mediaIdx || 0;
  const themeAsset = isMedia && node.assets && node.assets[mediaIdx] && node.assets[mediaIdx].kind === 'image'
    ? node.assets[mediaIdx]
    : null;
  const isHtml = node && node.type === 'html';

  // Device-frame toggles, shared by single-asset photos/videos and html nodes.
  const frameButtons = node && (
    <>
      <button data-active={node.frame === 'browser' ? '' : undefined} onClick={run(() => eng.toggleFrame(node.id, 'browser'))}>
        <AppWindow />
        Browser frame
      </button>
      <button data-active={node.frame === 'plugin' ? '' : undefined} onClick={run(() => eng.toggleFrame(node.id, 'plugin'))}>
        <Puzzle />
        Plugin frame
      </button>
      <button data-active={node.frame === 'terminal' ? '' : undefined} onClick={run(() => eng.toggleFrame(node.id, 'terminal'))}>
        <Terminal />
        Terminal frame
      </button>
      <button data-active={node.frame === 'ios' ? '' : undefined} onClick={run(() => eng.toggleFrame(node.id, 'ios'))}>
        <Smartphone />
        iOS frame
      </button>
      <button data-active={node.frame === 'android' ? '' : undefined} onClick={run(() => eng.toggleFrame(node.id, 'android'))}>
        <Smartphone />
        Android frame
      </button>
      {node.frame && (
        <button data-active={node.frameScale ? '' : undefined} onClick={run(() => eng.toggleFrameScale(node.id))}>
          <Expand />
          Scale with object
        </button>
      )}
      {node.frame && (
        <button onClick={run(() => eng.toggleFrame(node.id, node.frame))}>
          <SquareX />
          Remove frame
        </button>
      )}
    </>
  );

  return (
    <div ref={menuRef} className="cv-panel" data-open="" data-cv-part="context-menu" style={place(190, 190)}>
      {isFrame && (
        <button onClick={run(() => eng.startRenameFrame(node.id))}>
          <Pencil />
          Rename
        </button>
      )}
      {/* Reshape the section to a screen ratio. A flyout rather than eight rows
          inline: the ratios are one decision, and unfolded they would be most
          of the menu. Opens on hover like a native submenu, and on click too,
          so it also works from a touch device where there is no hover. */}
      {isFrame && (
        <div
          className="cv-ctxsub"
          onPointerEnter={() => setSubmenu('aspect')}
          onPointerLeave={() => setSubmenu(null)}
        >
          <button
            data-active={submenu === 'aspect' ? '' : undefined}
            // Opens, never toggles. On a hover device the pointer entering the
            // row has already opened it, so a toggle here would close it on the
            // very click meant to open it; leaving the row is how it closes.
            onClick={() => setSubmenu('aspect')}
          >
            <RectangleHorizontal />
            Aspect ratio
            <ChevronRight className="cv-ctxsub-caret" />
          </button>
          {submenu === 'aspect' && (
            <div className="cv-panel cv-ctxsub-menu" data-flip={flipSub ? '' : undefined}>
              {FRAME_RATIOS.map((r) => (
                <button
                  key={r.label}
                  // Marks the ratio the frame is already at, so the menu says
                  // what shape it currently is as well as what it could be.
                  data-active={atRatio(node, r.ratio) ? '' : undefined}
                  onClick={run(() => eng.setFrameAspect(node.id, r.ratio))}
                >
                  {/* A box drawn at the ratio itself — quicker to read at a
                      glance than the numbers, and unambiguous about which way
                      round 9:16 goes. */}
                  <span className="cv-ratio-slot" aria-hidden="true">
                    <span
                      className="cv-ratio-box"
                      style={
                        r.ratio >= 1
                          ? { width: '100%', height: `${100 / r.ratio}%` }
                          : { height: '100%', width: `${100 * r.ratio}%` }
                      }
                    />
                  </span>
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {isSection && (
        <>
          <button onClick={run(() => eng.openSectionNotes(node.id))}>
            <MessageSquareText />
            {node.notes ? 'Edit speaker notes…' : 'Add speaker notes…'}
          </button>
          <div className="cv-ctxsep" />
        </>
      )}
      {isMedia && (!loneSvg || singleAsset) && (
        <>
          {!loneSvg && (
            <button onClick={run(() => eng.openFullscreen(node.id))}>
              <Maximize />
              View full screen
            </button>
          )}
          {singleAsset && (
            <button onClick={run(() => eng.resetMediaSize(node.id))}>
              <Scaling />
              Set to original size
            </button>
          )}
          {singleAsset && !loneSvg && frameButtons}
          {themeAsset && (
            <>
              <button onClick={run(() => eng.pickThemeImage(node.id, mediaIdx, 'light'))}>
                <Sun />
                Set light image…
              </button>
              <button onClick={run(() => eng.pickThemeImage(node.id, mediaIdx, 'dark'))}>
                <Moon />
                {themeAsset.srcDark ? 'Replace dark image…' : 'Set dark image…'}
              </button>
              {themeAsset.srcDark && (
                <button onClick={run(() => eng.removeDarkImage(node.id, mediaIdx))}>
                  <SquareX />
                  Remove dark image
                </button>
              )}
            </>
          )}
          <div className="cv-ctxsep" />
        </>
      )}
      {isHtml && (
        <>
          <button onClick={run(() => eng.openHtml(node.id))}>
            <ExternalLink />
            Open in new tab
          </button>
          {frameButtons}
          <div className="cv-ctxsep" />
        </>
      )}
      {node && (
        <>
          <div className="cv-ctxscale" onPointerDown={(e) => e.stopPropagation()}>
            <Scaling />
            <span>Scale</span>
            <input
              className="cv-ctxscale-input"
              type="number"
              min="0.05"
              step="0.1"
              defaultValue={node.scale ?? 1}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') { const v = parseFloat(e.currentTarget.value); if (v > 0) eng.setNodeScale(node.id, v); setCtxMenu(null); }
                if (e.key === 'Escape') setCtxMenu(null);
              }}
              onBlur={(e) => { const v = parseFloat(e.currentTarget.value); if (v > 0 && v !== (node.scale ?? 1)) eng.setNodeScale(node.id, v); }}
            />
          </div>
          <div className="cv-ctxsep" />
        </>
      )}
      <button onClick={run(() => { eng.copySelected(); })}>
        <Copy />
        {count > 1 ? `Copy ${count} objects` : 'Copy'}
      </button>
      <button onClick={run(() => eng.cutTarget(target))}>
        <Scissors />
        {count > 1 ? `Cut ${count} objects` : 'Cut'}
      </button>
      <button onClick={run(() => eng.duplicateTarget(target))}>
        <CopyPlus />
        {count > 1 ? `Duplicate ${count} objects` : 'Duplicate'}
      </button>
      <button onClick={run(() => eng.pasteFromMenu(ctxMenu.wx, ctxMenu.wy))}>
        <ClipboardPaste />
        Paste here
      </button>
      <div className="cv-ctxsep" />
      <button onClick={run(() => eng.bringFront(target))}>
        <BringToFront />
        Bring to front
      </button>
      <button onClick={run(() => eng.sendBack(target))}>
        <SendToBack />
        Send to back
      </button>
      {anchorable && (
        <>
          <div className="cv-ctxsep" />
          <button onClick={run(() => eng.toggleAnchor(node.id))}>
            <Anchor />
            {node.anchor ? 'Remove anchor' : 'Add anchor'}
          </button>
        </>
      )}
      <div className="cv-ctxsep" />
      <button className="cv-danger" onClick={run(() => eng.deleteTarget(target))}>
        <Trash2 />
        {count > 1 ? `Delete ${count} objects` : 'Delete'}
      </button>
    </div>
  );
}
