import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { cx, sectionNodes, sectionLabel } from '../constants';

const RENAME_ICON = <Pencil />;
const DELETE_ICON = <Trash2 />;

/* Vertical travel (px) before a press on a section row becomes a reorder drag
   rather than a click that jumps to it. */
const DRAG_SLOP = 4;

/* Page + section navigator rendered as a dropdown inside the top bar. The trigger
   shows the active page; the menu lists every page with its sections nested
   beneath it. Clicking a page switches boards; clicking a section flies to it
   (switching boards first if it lives elsewhere). In edit mode, right-clicking a
   page opens a menu to rename or delete it, and right-clicking a frame section
   opens a menu to rename it. Sections on the active page can be dragged up and
   down to set the order the menu lists them in — and that ↑/↓ steps through.
   New pages are added from the footer button. */
export default function PageTabs() {
  const { pages, activePageId, nodes, pageData, focusedSectionId, readOnly, EDITABLE, homeId: HOME_ID, eng, rootRef, classNames } = useCanvas();
  const editing = EDITABLE && !readOnly;
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(null); // {scope:'page'|'section', id}
  const [menu, setMenu] = useState(null); // {x, y, scope:'page'|'section', id, canDelete}
  const [drag, setDrag] = useState(null); // {id, to} — live reorder drag; `to` is the insertion slot (0…n)
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const rowEls = useRef(new Map()).current; // section id → row element, for hit-testing a drag
  const dragRef = useRef(null); // the in-flight gesture, read by the window handlers
  const draggedAt = useRef(0); // when the last drag ended, to swallow the click trailing it

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

  // A reorder drag outlives any single render, so an unmount mid-gesture has to
  // drop its window listeners by hand. (Above the early return below — hooks
  // can't be conditional.)
  useEffect(() => () => { if (dragRef.current) dragRef.current.cleanup(); }, []);

  /* Section anchors for a page. The active page uses live state; parked pages
     read their last-snapshotted nodes (they can't be edited while inactive). */
  const sectionsFor = (pageId) =>
    sectionNodes(pageId === activePageId ? nodes : (pageData[pageId] ? pageData[pageId].nodes : []));

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

  /* ── Drag to reorder sections ────────────────────────────────────
     The rows stay put for the length of the gesture — the drop position shows as
     a line between them — so hit-testing can measure the live DOM and stay right
     even as the menu scrolls. Ordering commits once, on release. */

  /* Insertion slot (0…n) for a pointer at `y`: the first row whose midline it has
     yet to pass, else the end of the list. */
  const slotAt = (ids, y) => {
    for (let i = 0; i < ids.length; i += 1) {
      const el = rowEls.get(ids[i]);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return ids.length;
  };

  const onSectionDown = (e, secs, id) => {
    // Left button only — right-click opens the rename menu. A lone section has
    // nowhere to go.
    if (e.button !== 0 || secs.length < 2) return;
    const d = { id, ids: secs.map((s) => s.id), startY: e.clientY, to: secs.findIndex((s) => s.id === id), moved: false };
    dragRef.current = d;

    const end = (commit) => {
      d.cleanup();
      dragRef.current = null;
      setDrag(null);
      if (!d.moved) return; // never passed the slop: a click, so let it navigate
      // Timestamp rather than a flag: releasing off-row fires no click at all, and
      // a flag left standing would swallow the next real one.
      draggedAt.current = performance.now();
      if (!commit) return;
      const from = d.ids.indexOf(id);
      const next = d.ids.filter((x) => x !== id);
      next.splice(d.to > from ? d.to - 1 : d.to, 0, id);
      if (next.some((x, i) => x !== d.ids[i])) eng.reorderSections(next);
    };
    const onMove = (ev) => {
      if (!d.moved) {
        if (Math.abs(ev.clientY - d.startY) < DRAG_SLOP) return;
        d.moved = true;
      }
      d.to = slotAt(d.ids, ev.clientY);
      setDrag({ id, to: d.to });
    };
    const onUp = () => end(true);
    const onCancel = () => end(false); // gesture taken over (OS scroll, window blur…)
    // Capture phase, so Escape cancels the drag before the menu's own handler
    // sees it and closes the dropdown out from under it.
    const onKey = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); end(false); } };
    d.cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
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
                    renameInput(p.name, 'cv-page-rename')
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
                  // Renaming and reordering only work on the active page
                  // (updateNode / reorderSections both target it).
                  const onActive = editing && p.id === activePageId;
                  const canRename = onActive && n.type === 'frame';
                  const canReorder = onActive && secs.length > 1;
                  if (renaming && renaming.scope === 'section' && renaming.id === n.id) {
                    return (
                      <div key={n.id} className="cv-section-item">
                        <span className="cv-section-num">{i + 1}</span>
                        {renameInput(n.name || '', 'cv-section-rename')}
                      </div>
                    );
                  }
                  // A drag can only be on the active page, so parked pages never
                  // paint a drop line.
                  const dg = onActive ? drag : null;
                  const hints = ['Click to go'];
                  if (canReorder) hints.push('drag to reorder');
                  if (canRename) hints.push('right-click to rename');
                  return (
                    <button
                      key={n.id}
                      ref={canReorder ? (el) => { if (el) rowEls.set(n.id, el); else rowEls.delete(n.id); } : undefined}
                      className="cv-section-item"
                      // The focused section is where the ↑/↓ shortcut steps from,
                      // so the menu marks it.
                      data-focused={p.id === activePageId && n.id === focusedSectionId ? '' : undefined}
                      data-reorderable={canReorder ? '' : undefined}
                      data-dragging={dg && dg.id === n.id ? '' : undefined}
                      // The drop line sits above the row the section would land on
                      // — or below the last one when it's headed for the end.
                      data-drop-before={dg && dg.to === i ? '' : undefined}
                      data-drop-after={dg && dg.to === secs.length && i === secs.length - 1 ? '' : undefined}
                      title={hints.length > 1 ? hints.join(' · ') : sectionLabel(n)}
                      onPointerDown={canReorder ? (e) => onSectionDown(e, secs, n.id) : undefined}
                      onClick={() => {
                        // The click that trails a drag isn't a request to navigate.
                        if (performance.now() - draggedAt.current < 300) return;
                        eng.goToSection(p.id, n.id);
                        setOpen(false);
                      }}
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
