import { useEffect } from 'react';
import { Maximize, Scaling, Copy, CopyPlus, BringToFront, SendToBack, Anchor, Trash2 } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';

export default function ContextMenu() {
  const { ctxMenu, setCtxMenu, nodes, selected, eng } = useCanvas();

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
  const { target } = ctxMenu; // {kind:'node'|'shape', id} or {kind:'multi'} → whole selection
  const node = target.kind === 'node' ? nodes.find((n) => n.id === target.id) : null;
  const anchorable = node && node.type !== 'frame';
  const count = target.kind === 'multi' ? selected.length : 1;
  // A media node opens full-screen unless it's a lone SVG (vector art shown full
  // size on the board already); a grid of two+ assets always opens the gallery.
  const isMedia = node && (node.type === 'image' || node.type === 'video');
  const singleAsset = isMedia && node.assets && node.assets.length === 1;
  const loneSvg = singleAsset && node.assets[0].svg;
  const x = Math.min(ctxMenu.x, innerWidth - 190);
  const y = Math.min(ctxMenu.y, innerHeight - 190);

  const run = (fn) => () => { fn(); setCtxMenu(null); };

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
          <div className="ctxsep" />
        </>
      )}
      <button onClick={run(() => { eng.copySelected(); })}>
        <Copy />
        {count > 1 ? `Copy ${count} objects` : 'Copy'}
      </button>
      <button onClick={run(() => eng.duplicateTarget(target))}>
        <CopyPlus />
        {count > 1 ? `Duplicate ${count} objects` : 'Duplicate'}
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
