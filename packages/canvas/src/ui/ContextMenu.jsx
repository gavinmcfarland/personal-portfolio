import { useEffect } from 'react';
import { Maximize, Scaling, AppWindow, Puzzle, Terminal, SquareX, Expand, ExternalLink, Copy, Scissors, CopyPlus, ClipboardPaste, Grid2x2, BringToFront, SendToBack, Anchor, Trash2, Sun, Moon } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';

export default function ContextMenu() {
  const { ctxMenu, setCtxMenu, nodes, selected, gridHidden, eng } = useCanvas();

  useEffect(() => {
    if (!ctxMenu) return undefined;
    const close = (e) => { if (!e.target.closest || !e.target.closest('#ctxmenu')) setCtxMenu(null); };
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

  // Right-click on empty canvas: the only action is Paste, dropped at the click
  // point captured when the menu opened.
  if (target.kind === 'canvas') {
    const cx = Math.min(ctxMenu.x, innerWidth - 190);
    const cy = Math.min(ctxMenu.y, innerHeight - 120);
    return (
      <div className="panel show" id="ctxmenu" style={{ left: cx, top: cy }}>
        <button onClick={run(() => eng.pasteFromMenu(target.wx, target.wy))}>
          <ClipboardPaste />
          Paste here
        </button>
        <div className="ctxsep" />
        <button className={!gridHidden ? 'active' : ''} onClick={run(() => eng.toggleGrid())}>
          <Grid2x2 />
          {gridHidden ? 'Show dot grid' : 'Hide dot grid'}
        </button>
      </div>
    );
  }

  const node = target.kind === 'node' ? nodes.find((n) => n.id === target.id) : null;
  const anchorable = node && node.type !== 'frame';
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
  const x = Math.min(ctxMenu.x, innerWidth - 190);
  const y = Math.min(ctxMenu.y, innerHeight - 190);

  // Device-frame toggles, shared by single-asset photos/videos and html nodes.
  const frameButtons = node && (
    <>
      <button className={node.frame === 'browser' ? 'active' : ''} onClick={run(() => eng.toggleFrame(node.id, 'browser'))}>
        <AppWindow />
        Browser frame
      </button>
      <button className={node.frame === 'plugin' ? 'active' : ''} onClick={run(() => eng.toggleFrame(node.id, 'plugin'))}>
        <Puzzle />
        Plugin frame
      </button>
      <button className={node.frame === 'terminal' ? 'active' : ''} onClick={run(() => eng.toggleFrame(node.id, 'terminal'))}>
        <Terminal />
        Terminal frame
      </button>
      {node.frame && (
        <button className={node.frameScale ? 'active' : ''} onClick={run(() => eng.toggleFrameScale(node.id))}>
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
    <div className="panel show" id="ctxmenu" style={{ left: x, top: y }}>
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
          <div className="ctxsep" />
        </>
      )}
      {isHtml && (
        <>
          <button onClick={run(() => eng.openHtml(node.id))}>
            <ExternalLink />
            Open in new tab
          </button>
          {frameButtons}
          <div className="ctxsep" />
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
      <div className="ctxsep" />
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
          <div className="ctxsep" />
          <button onClick={run(() => eng.toggleAnchor(node.id))}>
            <Anchor />
            {node.anchor ? 'Remove anchor' : 'Add anchor'}
          </button>
        </>
      )}
      <div className="ctxsep" />
      <button className="danger" onClick={run(() => eng.deleteTarget(target))}>
        <Trash2 />
        {count > 1 ? `Delete ${count} objects` : 'Delete'}
      </button>
    </div>
  );
}
