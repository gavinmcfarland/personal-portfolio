import { memo, useEffect, useRef } from 'react';
import { useCanvas } from '../CanvasProvider';
import { useRegister } from './common';

/* Sticky notes & free text blocks — uncontrolled contentEditable so React never
   fights the caret. Text commits to the model on blur. Empty text blocks
   self-delete (they'd be invisible); empty stickies stay — the note itself is
   a visible object the user placed. */
function EditableNode({ node }) {
  const { editingId, readOnly, eng, nodeEls } = useCanvas();
  const { setRef, dataProps, style } = useRegister(node);
  const txtRef = useRef(null);
  const editing = editingId === node.id;

  // While editing, keep the selection outline in sync as the text grows/shrinks
  // the node (text isn't committed to state until blur, so nothing else fires).
  useEffect(() => {
    if (!editing || typeof ResizeObserver === 'undefined') return;
    const el = nodeEls.get(node.id);
    if (!el) return;
    const ro = new ResizeObserver(() => eng.syncChrome());
    ro.observe(el);
    return () => ro.disconnect();
  }, [editing, eng, nodeEls, node.id]);

  // Seed the text exactly once; the DOM owns it thereafter.
  useEffect(() => {
    if (txtRef.current) txtRef.current.textContent = node.text || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const txt = txtRef.current;
    if (!txt) return;
    if (editing) {
      txt.contentEditable = 'true';
      txt.focus();
      const r = document.createRange();
      r.selectNodeContents(txt);
      r.collapse(false);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    } else {
      txt.contentEditable = 'false';
    }
  }, [editing]);

  const commit = () => {
    const text = txtRef.current ? txtRef.current.textContent : '';
    if (text.trim() === '' && node.type !== 'sticky') { eng.removeNode(node.id); eng.stopEditing(); return; }
    eng.updateNode(node.id, { text });
    eng.stopEditing();
  };

  const onDoubleClick = (e) => {
    if (readOnly) return;
    e.stopPropagation();
    eng.selectNode(node.id);
    eng.startEditing(node.id);
  };

  const isSticky = node.type === 'sticky';
  const cls = `node ${isSticky ? 'sticky' : 'tblock'}${editing ? ' editing' : ''}`;
  // A text block starts width-less (single line, grows as you type); once the
  // user resizes it, the stored width fixes the box and the text wraps inside.
  const sizedStyle = node.w != null ? { ...style, width: node.w + 'px' } : style;

  return (
    <div
      ref={setRef}
      className={cls}
      {...dataProps}
      {...(isSticky ? { 'data-color': node.color } : {})}
      data-editing={editing ? '1' : ''}
      style={sizedStyle}
      onDoubleClick={onDoubleClick}
    >
      <div className="txt" ref={txtRef} onBlur={commit} suppressContentEditableWarning />
    </div>
  );
}

export default memo(EditableNode);
