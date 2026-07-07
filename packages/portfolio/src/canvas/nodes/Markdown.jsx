import { memo, useEffect, useRef, useState } from 'react';
import { useCanvas } from '../CanvasProvider';
import { useRegister } from './common';
import { mdParse, mdHighlight } from '../markdown';

/* Markdown card — rendered on rest, a live-highlighted source editor while
   editing. The <textarea> is uncontrolled (caret-safe); a mirrored <pre> paints
   the syntax highlight and drives the box height. */
function Markdown({ node }) {
  const { editingId, readOnly, eng } = useCanvas();
  const { setRef, dataProps } = useRegister(node);
  const taRef = useRef(null);
  const [src, setSrc] = useState(node.text || '');
  const editing = editingId === node.id;

  useEffect(() => {
    if (!editing) return;
    const ta = taRef.current;
    if (!ta) return;
    setSrc(ta.value);
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }, [editing]);

  const commit = () => {
    const text = taRef.current ? taRef.current.value : src;
    eng.updateNode(node.id, { text });
    eng.stopEditing();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget, s = ta.selectionStart, en = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en);
      ta.selectionStart = ta.selectionEnd = s + 2;
      setSrc(ta.value);
    }
  };

  const onDoubleClick = (e) => {
    if (readOnly) return;
    e.stopPropagation();
    eng.selectNode(node.id);
    eng.startEditing(node.id);
  };

  const onClickCapture = (e) => {
    const a = e.target.closest && e.target.closest('a');
    const host = e.currentTarget;
    if (a && host.dataset.moved === '1') e.preventDefault();
  };

  const rendered = mdParse(node.text || '') || '<span class="md-empty">Empty — double-click to edit</span>';

  const style = { transform: `translate(${node.x}px,${node.y}px)`, zIndex: node.z, width: (node.w || 340) + 'px' };

  return (
    <div
      ref={setRef}
      className={`node md${editing ? ' md-editing' : ''}`}
      {...dataProps}
      style={style}
      onDoubleClick={onDoubleClick}
      onClick={onClickCapture}
    >
      <div className="md-render" dangerouslySetInnerHTML={{ __html: rendered }} />
      <div className="md-edit">
        <pre className="md-hl" aria-hidden="true"><code dangerouslySetInnerHTML={{ __html: mdHighlight(src) + '\n' }} /></pre>
        <textarea
          className="md-src"
          spellCheck={false}
          ref={taRef}
          defaultValue={node.text || ''}
          onInput={(e) => setSrc(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
        />
      </div>
    </div>
  );
}

export default memo(Markdown);
