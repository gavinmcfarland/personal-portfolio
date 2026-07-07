import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCanvas } from '../CanvasProvider';

function anchorName(node) {
  if (node.type === 'frame') return (node.name || '').trim() || 'Untitled';
  if (node.type === 'md') {
    const first = (node.text || '')
      .split('\n')
      .map((l) => l.replace(/^#+\s*/, '').trim())
      .find(Boolean);
    return first ? first.slice(0, 32) : 'Markdown';
  }
  const txt = (node.text || '').replace(/\s+/g, ' ').trim();
  return txt ? txt.slice(0, 32) : node.type.charAt(0).toUpperCase() + node.type.slice(1);
}

/* One entry in the Sections nav. Click flies to it; in edit mode a right-click
   opens a menu to rename frame sections (derived-name anchors can't be renamed). */
function NavItem({ node, index, editing }) {
  const { eng } = useCanvas();
  const [renaming, setRenaming] = useState(false);
  const [menu, setMenu] = useState(null);
  const inputRef = useRef(null);
  const canRename = editing && node.type === 'frame';

  useEffect(() => {
    if (renaming && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [renaming]);

  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => { if (!e.target.closest || !e.target.closest('.nav-ctx')) setMenu(null); };
    window.addEventListener('pointerdown', close, true);
    window.addEventListener('blur', () => setMenu(null));
    return () => window.removeEventListener('pointerdown', close, true);
  }, [menu]);

  const commit = () => {
    const v = inputRef.current ? inputRef.current.value.trim() || 'Section' : '';
    eng.updateNode(node.id, { name: v });
    setRenaming(false);
  };

  if (renaming) {
    return (
      <div className="nav-item">
        <span className="ni-num">{index + 1}</span>
        <input
          ref={inputRef}
          className="ni-rename"
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
    <>
      <button
        className="nav-item"
        title={canRename ? 'Click to go · right-click for options' : undefined}
        onClick={() => eng.flyTo(node.id)}
        onContextMenu={canRename ? (e) => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY }); } : undefined}
      >
        <span className="ni-num">{index + 1}</span>
        <span className="ni-name">{anchorName(node)}</span>
      </button>
      {menu && createPortal(
        <div
          className="panel show nav-ctx"
          style={{ left: Math.min(menu.x, innerWidth - 180), top: Math.min(menu.y, innerHeight - 60) }}
        >
          <button onClick={() => { setMenu(null); setRenaming(true); }}>
            <svg viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>
            Rename
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

export default function SectionsNav() {
  const { nodes, readOnly, EDITABLE } = useCanvas();
  const editing = EDITABLE && !readOnly;
  const items = nodes
    .filter((n) => n.type === 'frame' || n.anchor)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  return (
    <div className={`ui panel${items.length ? ' show' : ''}`} id="nav">
      <div className="nav-head">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" /><path d="M12 7v13M5 12a7 7 0 0 0 14 0" /></svg>
        Sections
      </div>
      <div id="navList">
        {items.map((n, i) => (
          <NavItem key={n.id} node={n} index={i} editing={editing} />
        ))}
      </div>
    </div>
  );
}
