import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { cx } from '../constants';

const RENAME_ICON = <Pencil />;
const DELETE_ICON = <Trash2 />;

/* Display name for a section anchor: frame name, first markdown heading, or the
   node's text/type as a fallback. */
function sectionLabel(node) {
  if (node.type === 'frame') return (node.name || '').trim() || 'Untitled';
  if (node.type === 'md') {
    const first = (node.text || '')
      .split('\n')
      .map((l) => l.replace(/^#+\s*/, '').trim())
      .find(Boolean);
    return first ? first.slice(0, 32) : 'Markdown';
  }
  if (node.type === 'code') {
    const first = (node.text || '').split('\n').map((l) => l.trim()).find(Boolean);
    return first ? first.slice(0, 32) : 'Code';
  }
  const txt = (node.text || '').replace(/\s+/g, ' ').trim();
  return txt ? txt.slice(0, 32) : node.type.charAt(0).toUpperCase() + node.type.slice(1);
}

/* Page + section navigator rendered as a dropdown inside the top bar. The trigger
   shows the active page; the menu lists every page with its sections nested
   beneath it. Clicking a page switches boards; clicking a section flies to it
   (switching boards first if it lives elsewhere). In edit mode, right-clicking a
   page opens a menu to rename or delete it, and right-clicking a frame section
   opens a menu to rename it. New pages are added from the footer button. */
export default function PageTabs() {
  const { pages, activePageId, nodes, pageData, readOnly, EDITABLE, homeId: HOME_ID, eng, rootRef, classNames } = useCanvas();
  const editing = EDITABLE && !readOnly;
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(null); // {scope:'page'|'section', id}
  const [menu, setMenu] = useState(null); // {x, y, scope:'page'|'section', id, canDelete}
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click / Escape. Clicks inside the (portaled) context menu
  // must not collapse the dropdown, so they're excluded here.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (e.target.closest && e.target.closest('.cv-page-ctx')) return;
      setMenu(null);
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setRenaming(null);
      }
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (menu) setMenu(null);
      else if (!renaming) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, renaming, menu]);

  useEffect(() => {
    if (renaming && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [renaming]);

  /* Section anchors for a page. The active page uses live state; parked pages
     read their last-snapshotted nodes (they can't be edited while inactive). */
  const sectionsFor = (pageId) => {
    const src = pageId === activePageId ? nodes : (pageData[pageId] ? pageData[pageId].nodes : []);
    return src
      .filter((n) => n.type === 'frame' || n.anchor)
      .sort((a, b) => a.y - b.y || a.x - b.x);
  };

  const active = pages.find((p) => p.id === activePageId) || pages[0];

  // Viewers can't add pages, so a single-page board only has something to
  // navigate if that page has sections to jump to.
  if (!editing && pages.length <= 1 && sectionsFor(active ? active.id : activePageId).length === 0) return null;

  const commitRename = () => {
    const v = inputRef.current ? inputRef.current.value : '';
    if (renaming.scope === 'page') eng.renamePage(renaming.id, v);
    else eng.updateNode(renaming.id, { name: v.trim() || 'Section' });
    setRenaming(null);
  };

  const openMenu = (e, cfg) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, ...cfg });
  };

  const renameInput = (defaultValue, className) => (
    <input
      ref={inputRef}
      className={className}
      defaultValue={defaultValue}
      onBlur={commitRename}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commitRename();
        if (e.key === 'Escape') setRenaming(null);
      }}
    />
  );

  return (
    <div className={cx('cv-page-nav', classNames?.pages)} data-cv-part="pages" ref={wrapRef}>
      <button
        className="cv-chip cv-page-nav-trigger"
        data-on={open ? '' : undefined}
        title="Pages & sections"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="cv-page-nav-current">{active ? active.name : 'Page'}</span>
        <ChevronDown className="cv-page-nav-chev" />
      </button>

      {open && (
        <div className="cv-page-menu cv-panel">
          {pages.map((p) => {
            const secs = sectionsFor(p.id);
            return (
              <div key={p.id} className="cv-page-group">
                <div className="cv-page-menu-item" data-active={p.id === activePageId ? '' : undefined}>
                  {renaming && renaming.scope === 'page' && renaming.id === p.id ? (
                    renameInput(p.name, 'page-rename')
                  ) : (
                    <button
                      className="cv-page-menu-btn"
                      title={editing ? 'Click to switch · right-click for options' : p.name}
                      onClick={() => { eng.switchPage(p.id); setOpen(false); }}
                      onContextMenu={editing ? (e) => openMenu(e, { scope: 'page', id: p.id, canDelete: p.id !== HOME_ID }) : undefined}
                    >
                      {p.name}
                    </button>
                  )}
                </div>

                {secs.map((n, i) => {
                  // Renaming only works on the active page (updateNode targets it).
                  const canRename = editing && p.id === activePageId && n.type === 'frame';
                  if (renaming && renaming.scope === 'section' && renaming.id === n.id) {
                    return (
                      <div key={n.id} className="cv-section-item">
                        <span className="cv-section-num">{i + 1}</span>
                        {renameInput(n.name || '', 'section-rename')}
                      </div>
                    );
                  }
                  return (
                    <button
                      key={n.id}
                      className="cv-section-item"
                      title={canRename ? 'Click to go · right-click to rename' : sectionLabel(n)}
                      onClick={() => { eng.goToSection(p.id, n.id); setOpen(false); }}
                      onContextMenu={canRename ? (e) => openMenu(e, { scope: 'section', id: n.id }) : undefined}
                    >
                      <span className="cv-section-num">{i + 1}</span>
                      <span className="cv-section-name">{sectionLabel(n)}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {editing && (
            <button className="cv-page-menu-add" title="New page" onClick={() => eng.addPage()}>
              <span className="cv-page-add-plus">+</span> New page
            </button>
          )}
        </div>
      )}

      {menu && createPortal(
        <div
          className="cv-panel cv-page-ctx"
          style={{ left: Math.min(menu.x, innerWidth - 170), top: Math.min(menu.y, innerHeight - 90) }}
        >
          <button onClick={() => { setRenaming({ scope: menu.scope, id: menu.id }); setMenu(null); }}>
            {RENAME_ICON}
            Rename
          </button>
          {menu.canDelete && (
            <button className="cv-danger" onClick={() => { eng.removePage(menu.id); setMenu(null); }}>
              {DELETE_ICON}
              Delete
            </button>
          )}
        </div>,
        rootRef.current || document.body
      )}
    </div>
  );
}
