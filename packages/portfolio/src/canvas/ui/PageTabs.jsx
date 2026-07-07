import { useEffect, useRef, useState } from 'react';
import { useCanvas, HOME_ID } from '../CanvasProvider';

/* One page tab. Click switches to it (any mode). In edit mode a double-click
   renames it inline and non-home tabs get a delete affordance. */
function PageTab({ page, active, editing }) {
  const { eng } = useCanvas();
  const [renaming, setRenaming] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (renaming && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [renaming]);

  const commit = () => {
    const v = inputRef.current ? inputRef.current.value : '';
    eng.renamePage(page.id, v);
    setRenaming(false);
  };

  if (renaming) {
    return (
      <input
        ref={inputRef}
        className="page-rename"
        defaultValue={page.name}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setRenaming(false);
        }}
      />
    );
  }

  return (
    <div className={`page-tab${active ? ' active' : ''}`}>
      <button
        className="page-tab-btn"
        title={editing ? 'Click to switch · double-click to rename' : page.name}
        onClick={() => eng.switchPage(page.id)}
        onDoubleClick={editing ? () => setRenaming(true) : undefined}
      >
        {page.name}
      </button>
      {editing && page.id !== HOME_ID && (
        <button
          className="page-del"
          title="Delete page"
          onClick={(e) => { e.stopPropagation(); eng.removePage(page.id); }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

/* Page switcher. Hidden in view mode when there's only one page (nothing to
   switch to); always shown in edit mode so pages can be added. */
export default function PageTabs() {
  const { pages, activePageId, readOnly, EDITABLE, eng } = useCanvas();
  const editing = EDITABLE && !readOnly;

  if (!editing && pages.length <= 1) return null;

  return (
    <div className="ui panel" id="pagetabs">
      {pages.map((p) => (
        <PageTab key={p.id} page={p} active={p.id === activePageId} editing={editing} />
      ))}
      {editing && (
        <button className="page-add" title="New page" onClick={() => eng.addPage()}>+</button>
      )}
    </div>
  );
}
