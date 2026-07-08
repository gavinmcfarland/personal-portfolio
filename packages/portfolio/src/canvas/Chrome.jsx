import { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvas } from './CanvasProvider';

/* Screen-space frame label: title, drag handle, jump-to button. Positioned by
   the engine's syncChrome() via the frameLabelEls map. Double-click renames it
   inline with a text input, mirroring the page-tab rename UI. */
function FrameLabel({ node }) {
  const { frameLabelEls, readOnly, eng, actionRef, nodeEls, setCtxMenu } = useCanvas();
  const [renaming, setRenaming] = useState(false);
  const inputRef = useRef(null);

  const setRef = useCallback(
    (el) => {
      if (el) frameLabelEls.set(node.id, el); else frameLabelEls.delete(node.id);
    },
    [node.id, frameLabelEls]
  );

  useEffect(() => {
    if (renaming && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [renaming]);

  const commit = () => {
    const v = inputRef.current ? inputRef.current.value.trim() || 'Section' : '';
    eng.updateNode(node.id, { name: v });
    setRenaming(false);
  };

  const onPointerDown = (e) => {
    if (readOnly || e.button !== 0 || renaming) return;
    e.stopPropagation();
    eng.freezeView();
    eng.selectNode(node.id);
    const el = nodeEls.get(node.id);
    if (el) el.dataset.moved = '';
    actionRef.current = { type: 'node', id: node.id, sx: e.clientX, sy: e.clientY, ox: +node.x, oy: +node.y };
    if (el) el.classList.add('dragging');
    // NB: no setPointerCapture here — capturing the pointer retargets click/dblclick
    // away from the label and breaks double-click-to-rename. The drag is driven by
    // window-level pointermove/up handlers (see Canvas.jsx), so capture isn't needed.
  };

  if (renaming) {
    return (
      <div ref={setRef} className="frame-label editing" onPointerDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="frame-rename"
          defaultValue={node.name || ''}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setRenaming(false);
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={setRef}
      className="frame-label"
      onPointerDown={onPointerDown}
      onDoubleClick={(e) => { if (readOnly) return; e.stopPropagation(); setRenaming(true); }}
      onContextMenu={(e) => {
        if (readOnly) return;
        e.preventDefault();
        e.stopPropagation();
        eng.selectNode(node.id);
        setCtxMenu({ x: e.clientX, y: e.clientY, target: { kind: 'node', id: node.id } });
      }}
    >
      <span className="txt">{node.name || 'Section'}</span>
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
  const hovRef = useCallback((el) => eng.setChrome('hov', el), [eng]);
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
      <div id="cHov" ref={hovRef} />
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
