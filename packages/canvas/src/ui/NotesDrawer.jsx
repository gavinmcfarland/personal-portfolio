import { useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { sectionNodes, sectionLabel } from '../constants';

/* Speaker notes editor for the section opened from the frame context menu.

   Notes live on the frame node (`notes`), so every keystroke rides the normal
   patch → history → autosave → publish path; there is nothing extra to save.
   Writes are debounced so a sentence lands as one undo step rather than forty.

   The drawer walks the deck: its ← / → step to the neighbouring section and
   fly the board there, which is how a whole talk gets written in one sitting.
   Nothing here is ever painted on the board itself — the board is what the
   room sees, and these are the words that go over it. */

const SAVE_DEBOUNCE = 400;

export default function NotesDrawer() {
  const { notesEditId, nodes, eng, readOnly, EDITABLE } = useCanvas();
  const areaRef = useRef(null);
  const timerRef = useRef(0);
  const pendingRef = useRef(null); // {id, value} not yet committed to the node

  const secs = sectionNodes(nodes);
  const idx = secs.findIndex((n) => n.id === notesEditId);
  const node = idx >= 0 ? secs[idx] : null;

  // Commit whatever is typed but not yet written. Called on the debounce, on
  // close, and before stepping away — a section must never lose its last words
  // because the drawer moved on inside the debounce window.
  const flush = () => {
    clearTimeout(timerRef.current);
    const p = pendingRef.current;
    pendingRef.current = null;
    if (p) eng.setSectionNotes(p.id, p.value);
  };

  // Flush on unmount too: closing the board mid-sentence still keeps the words.
  useEffect(() => flush, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Point the textarea at the section that is open, and put the caret at the
  // end so stepping into a written section continues it rather than replacing.
  useEffect(() => {
    const el = areaRef.current;
    if (!el || !node) return;
    el.value = node.notes || '';
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesEditId]);

  if (!EDITABLE || readOnly || !node) return null;

  const step = (delta) => {
    flush();
    if (secs.length < 2) return;
    const next = secs[(idx + delta + secs.length) % secs.length];
    eng.goToSection(null, next.id);
    eng.openSectionNotes(next.id);
  };

  const close = () => { flush(); eng.closeSectionNotes(); };

  return (
    <div className="cv-ui cv-panel cv-notes" data-cv-part="notes-drawer" onPointerDown={(e) => e.stopPropagation()}>
      <div className="cv-notes-head">
        <span className="cv-notes-count">{idx + 1}/{secs.length}</span>
        <span className="cv-notes-title" title={sectionLabel(node)}>{sectionLabel(node)}</span>
        <button className="cv-notes-btn" onClick={() => step(-1)} disabled={secs.length < 2} aria-label="Previous section">
          <ChevronLeft />
        </button>
        <button className="cv-notes-btn" onClick={() => step(1)} disabled={secs.length < 2} aria-label="Next section">
          <ChevronRight />
        </button>
        <button className="cv-notes-btn" onClick={close} aria-label="Close speaker notes">
          <X />
        </button>
      </div>
      <textarea
        ref={areaRef}
        className="cv-notes-area"
        placeholder="What you'll say over this section…"
        defaultValue={node.notes || ''}
        // The canvas binds bare letters to tools at the window; typing notes
        // must not draw on the board behind the drawer.
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') { e.preventDefault(); close(); }
        }}
        onChange={(e) => {
          pendingRef.current = { id: node.id, value: e.target.value };
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(flush, SAVE_DEBOUNCE);
        }}
        onBlur={flush}
      />
    </div>
  );
}
