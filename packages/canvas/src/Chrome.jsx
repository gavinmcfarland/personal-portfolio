import { useCallback, useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
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
    if (e.shiftKey) { eng.toggleSelect('node', node.id); return; }
    // Part of a multi-selection → drag the whole group, same as grabbing the frame body.
    const items = eng.moveItemsFor({ kind: 'node', id: node.id });
    if (!eng.isSelected('node', node.id)) eng.selectNode(node.id);
    const el = nodeEls.get(node.id);
    if (el) { el.dataset.moved = ''; el.classList.add('dragging'); }
    actionRef.current = { type: 'move', sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, items, clickItem: { kind: 'node', id: node.id } };
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
  const { nodes, selected, eng, actionRef, nodeEls } = useCanvas();

  const selRef = useCallback((el) => eng.setChrome('sel', el), [eng]);
  const hovRef = useCallback((el) => eng.setChrome('hov', el), [eng]);
  const editRef = useCallback((el) => eng.setChrome('edit', el), [eng]);
  const rzRef = useCallback((el) => eng.setChrome('rz', el), [eng]);
  const marqRef = useCallback((el) => eng.setChrome('marq', el), [eng]);

  // Edit / resize affordances only apply to a single selected node.
  const single = selected.length === 1 && selected[0].kind === 'node' ? selected[0] : null;

  const onResizeDown = (e) => {
    if (e.button !== 0 || !single) return;
    e.stopPropagation();
    eng.freezeView();
    const n = nodes.find((x) => x.id === single.id);
    if (!n) return;
    // A never-resized text block has no stored width — measure its element.
    const el = nodeEls.get(n.id);
    const ow = n.w != null ? +n.w : el ? el.offsetWidth : 0;
    // Original font size, for cmd-drag text scaling (falls back to the rendered CSS size).
    const ofs = n.fontSize != null ? +n.fontSize : el ? parseFloat(getComputedStyle(el).fontSize) : 24;
    actionRef.current = { type: 'resize', id: n.id, sx: e.clientX, sy: e.clientY, ow, oh: +n.h, ofs, mdType: n.type };
  };

  return (
    <div className="cv-chrome">
      <div className="cv-hov" ref={hovRef} />
      <div className="cv-sel" ref={selRef} />
      <div className="cv-marquee" ref={marqRef} />
      <div
        className="cbtn"
        title="Edit markdown"
        ref={editRef}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); if (single) eng.startEditing(single.id); }}
      >
        <Pencil />
      </div>
      <div className="cv-rz" ref={rzRef} onPointerDown={onResizeDown} />
      {nodes.filter((n) => n.type === 'frame').map((n) => <FrameLabel key={n.id} node={n} />)}
    </div>
  );
}
