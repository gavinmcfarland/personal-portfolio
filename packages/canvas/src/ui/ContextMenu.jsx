import { useEffect } from 'react';
import { useCanvas } from '../CanvasProvider';

export default function ContextMenu() {
  const { ctxMenu, setCtxMenu, nodes, eng } = useCanvas();

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
  const { target } = ctxMenu;
  const node = target.kind === 'node' ? nodes.find((n) => n.id === target.id) : null;
  const anchorable = node && node.type !== 'frame';
  const x = Math.min(ctxMenu.x, innerWidth - 190);
  const y = Math.min(ctxMenu.y, innerHeight - 190);

  const run = (fn) => () => { fn(); setCtxMenu(null); };

  return (
    <div className="panel show" id="ctxmenu" style={{ left: x, top: y }}>
      {node && node.type === 'image' && (
        <>
          <button onClick={run(() => eng.openFullscreen(node.id))}>
            <svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3m13 5h3a2 2 0 0 0 2-2v-3" /></svg>
            View full screen
          </button>
          <div className="ctxsep" />
        </>
      )}
      <button onClick={run(() => eng.bringFront(target))}>
        <svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a1 1 0 0 1 1-1h9" /></svg>
        Bring to front
      </button>
      <button onClick={run(() => eng.sendBack(target))}>
        <svg viewBox="0 0 24 24"><rect x="4" y="4" width="11" height="11" rx="2" /><path d="M19 9v9a1 1 0 0 1-1 1H9" /></svg>
        Send to back
      </button>
      {anchorable && (
        <>
          <div className="ctxsep" />
          <button onClick={run(() => eng.toggleAnchor(node.id))}>
            <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" /><path d="M12 7v13M5 12a7 7 0 0 0 14 0M5 12H3m16 0h2" /></svg>
            {node.anchor ? 'Remove anchor' : 'Add anchor'}
          </button>
        </>
      )}
      <div className="ctxsep" />
      <button className="danger" onClick={run(() => eng.deleteTarget(target))}>
        <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7" /></svg>
        Delete
      </button>
    </div>
  );
}
