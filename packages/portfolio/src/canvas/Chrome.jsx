import { useCallback, useEffect, useRef } from 'react';
import { useCanvas } from './CanvasProvider';

/* Screen-space frame label: title, drag handle, jump-to button. Positioned by
   the engine's syncChrome() via the frameLabelEls map. */
function FrameLabel({ node }) {
  const { frameLabelEls, readOnly, eng, actionRef, nodeEls, setCtxMenu, viewportRef } = useCanvas();
  const txtRef = useRef(null);
  const labelRef = useRef(null);
  const renaming = useRef(false);

  const setRef = useCallback(
    (el) => {
      labelRef.current = el;
      if (el) frameLabelEls.set(node.id, el); else frameLabelEls.delete(node.id);
    },
    [node.id, frameLabelEls]
  );

  useEffect(() => {
    if (txtRef.current && !renaming.current) txtRef.current.textContent = node.name || 'Section';
  }, [node.name]);

  const onPointerDown = (e) => {
    if (readOnly || e.button !== 0 || renaming.current) return;
    e.stopPropagation();
    eng.freezeView();
    eng.selectNode(node.id);
    const el = nodeEls.get(node.id);
    if (el) el.dataset.moved = '';
    actionRef.current = { type: 'node', id: node.id, sx: e.clientX, sy: e.clientY, ox: +node.x, oy: +node.y };
    if (el) el.classList.add('dragging');
    viewportRef.current?.setPointerCapture?.(e.pointerId);
  };

  const startRename = () => {
    const t = txtRef.current, label = labelRef.current;
    if (!t || !label) return;
    renaming.current = true;
    label.classList.add('editing');
    t.contentEditable = 'true';
    t.focus();
    const r = document.createRange();
    r.selectNodeContents(t);
    r.collapse(false);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  };
  const stopRename = () => {
    const t = txtRef.current, label = labelRef.current;
    renaming.current = false;
    if (label) label.classList.remove('editing');
    if (t) {
      t.contentEditable = 'false';
      const v = t.textContent.trim() || 'Section';
      t.textContent = v;
      eng.updateNode(node.id, { name: v });
    }
  };

  return (
    <div
      ref={setRef}
      className="frame-label"
      onPointerDown={onPointerDown}
      onDoubleClick={(e) => { if (readOnly) return; e.stopPropagation(); startRename(); }}
      onContextMenu={(e) => {
        if (readOnly) return;
        e.preventDefault();
        e.stopPropagation();
        eng.selectNode(node.id);
        setCtxMenu({ x: e.clientX, y: e.clientY, target: { kind: 'node', id: node.id } });
      }}
    >
      <span className="txt" ref={txtRef} onBlur={stopRename} suppressContentEditableWarning />
      <button
        className="frame-go"
        title="Go to this section"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); eng.flyTo(node.id); }}
      >
        →
      </button>
    </div>
  );
}

export default function Chrome() {
  const { nodes, selected, eng, actionRef } = useCanvas();

  const selRef = useCallback((el) => eng.setChrome('sel', el), [eng]);
  const delRef = useCallback((el) => eng.setChrome('del', el), [eng]);
  const editRef = useCallback((el) => eng.setChrome('edit', el), [eng]);
  const rzRef = useCallback((el) => eng.setChrome('rz', el), [eng]);

  const onResizeDown = (e) => {
    if (e.button !== 0 || !selected || selected.kind !== 'node') return;
    e.stopPropagation();
    eng.freezeView();
    const n = nodes.find((x) => x.id === selected.id);
    if (!n) return;
    actionRef.current = { type: 'resize', id: n.id, sx: e.clientX, sy: e.clientY, ow: +n.w, oh: +n.h, mdType: n.type };
  };

  return (
    <div id="chrome">
      <div id="cSel" ref={selRef} />
      <div
        id="cDel"
        className="cbtn"
        title="Delete"
        ref={delRef}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); eng.deleteSelected(); }}
      >
        ✕
      </div>
      <div
        id="cEdit"
        className="cbtn"
        title="Edit markdown"
        ref={editRef}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); if (selected && selected.kind === 'node') eng.startEditing(selected.id); }}
      >
        <svg viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>
      </div>
      <div id="cRz" ref={rzRef} onPointerDown={onResizeDown} />
      {nodes.filter((n) => n.type === 'frame').map((n) => <FrameLabel key={n.id} node={n} />)}
    </div>
  );
}
