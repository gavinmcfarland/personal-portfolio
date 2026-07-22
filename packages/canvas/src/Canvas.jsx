import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCanvas } from './CanvasProvider';
import { ZOOM, PAN, DRAW_TOOLS, FILLABLE_SHAPES, cx } from './constants';
import World from './World';
import Chrome from './Chrome';
import DefaultTopBar from './ui/TopBar';
import DefaultToolbar from './ui/Toolbar';
import DefaultZoomControls from './ui/ZoomControls';
import DefaultContextMenu from './ui/ContextMenu';
import DefaultSaveStatus from './ui/SaveStatus';
import DefaultRecorder from './ui/Recorder';
import DefaultLightbox from './ui/Lightbox';

/* Recolour the custom edit caret (the inline-SVG cursor) to a given accent, with
   a contrasting outline so it stays legible over the board — white on light
   themes, the dark backdrop on dark ones. Mirrors the two --cur-edit* tokens in
   canvas.css. Returns ready-to-use `cursor` values (url + hotspot). */
function editCursor(accent, outline) {
  const a = encodeURIComponent(accent);
  const o = encodeURIComponent(outline);
  const head = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 26 26'%3E";
  const caret = "%3Cpath d='M5 3 L5 21 L10 16 L13.5 23.5 L16.5 22.2 L13 14.8 L20 14.8 Z'";
  const edit = `url("${head}${caret} fill='${a}' stroke='${o}' stroke-width='1.5' stroke-linejoin='round'/%3E%3C/svg%3E") 5 3`;
  const hover = `url("${head}${caret} fill='${o}' stroke='${a}' stroke-width='1.5' stroke-linejoin='round'/%3E%3Ccircle cx='19.5' cy='6.5' r='3' fill='${a}'/%3E%3C/svg%3E") 5 3`;
  return { edit, hover };
}

/* Build a small stylesheet that overrides the accent token (and the derived edit
   caret) for one canvas instance, scoped by `sel` so multiple boards stay
   independent. `accent` is a single CSS colour applied to both themes, or
   `{ light, dark }` to vary by theme. Everything else accent-derived
   (--accent-soft, selection tints, frames, active tool…) cascades from --accent
   automatically — see canvas.css. */
function buildAccentCss(sel, accent) {
  const light = typeof accent === 'string' ? accent : accent && accent.light;
  const dark = typeof accent === 'string' ? accent : accent && (accent.dark || accent.light);
  const rules = [];
  if (light) {
    const c = editCursor(light, '#fff');
    rules.push(`${sel}{--cv-accent:${light};--cv-cur-edit:${c.edit};--cv-cur-edit-hover:${c.hover};}`);
  }
  if (dark) {
    const c = editCursor(dark, '#0C0C0E');
    rules.push(`.dark ${sel},${sel}.dark{--cv-accent:${dark};--cv-cur-edit:${c.edit};--cv-cur-edit-hover:${c.hover};}`);
  }
  return rules.join('');
}

export default function Canvas() {
  const ctx = useCanvas();
  const { rootRef, hoverInsideRef, activeInsideRef, engagedRef, viewportRef, eng, actionRef, S, nodeEls, shapeEls, panKey, setDraft, setCtxMenu, setEngaged, EDITABLE, COOP, CLICK_TO_INTERACT, engaged, readOnly, fit, ui, bgColor, gridHidden, accent, classNames, components, fullscreenButton, fullBleed, maximized, maximizedRef } = ctx;
  // Chrome slots: a consumer's `components` entry replaces the built-in piece;
  // an explicit `null` hides it. Each piece reads state via useCanvas(), so a
  // replacement needs no props. `key in obj` (not truthiness) so `null` hides.
  const cmp = components || {};
  const slot = (key, Def) => (key in cmp ? cmp[key] : Def);
  const TopBar = slot('TopBar', DefaultTopBar);
  const Toolbar = slot('Toolbar', DefaultToolbar);
  const ZoomControls = slot('ZoomControls', DefaultZoomControls);
  const ContextMenu = slot('ContextMenu', DefaultContextMenu);
  const SaveStatus = slot('SaveStatus', DefaultSaveStatus);
  const Recorder = slot('Recorder', DefaultRecorder);
  const Lightbox = slot('Lightbox', DefaultLightbox);
  // Cooperative gestures only apply in view mode; while editing the board keeps
  // full gesture control. `readOnly` (reactive) drives the CSS attribute/render;
  // the imperative handlers read the live `S.readOnly` instead. Suspended while
  // maximised — the board owns the screen, so there's no page to scroll past and
  // scroll-to-pan should just work (matching the imperative handlers below).
  const coopView = COOP && readOnly && !maximized;

  // Touch-primary devices phrase things differently ("tap" vs "click", etc.).
  const coarsePointer = typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches;
  const interactLabel = coarsePointer ? 'Tap to interact' : 'Click to interact';
  /* Cooperative-gesture lock control (bottom-left). While locked the page scrolls
     past the board instead of the board hijacking the wheel/touch; the message
     says so and the lock button toggles it. `engaged` = unlocked = scroll (or a
     single finger) pans the board directly. */
  const lockMsg = coarsePointer ? 'Use two fingers to pan' : 'Drag to pan';
  /* The message only surfaces when the user actually tries to scroll the locked
     board (the lock button stays put); it then fades. Toggling a class keeps it
     off React's render path during a scroll storm. */
  const msgRef = useRef(null);
  const msgTimer = useRef(null);
  const flashMsg = () => {
    const el = msgRef.current;
    if (!el) return;
    el.setAttribute('data-open', '');
    clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => el.removeAttribute('data-open'), 1400);
  };
  const hideMsg = () => {
    const el = msgRef.current;
    if (el) el.removeAttribute('data-open');
    clearTimeout(msgTimer.current);
  };

  /* Unlock the click-to-interact overlay only on a genuine tap, never on a
     scroll. Neither `click` nor pointer-move tracking is reliable on touch: the
     browser may fire `click` for gestures it didn't scroll, and during a native
     scroll it often withholds `pointermove` (firing `pointercancel` instead) —
     and clientX/Y is viewport-relative, so a momentum scroll where the finger is
     fairly still registers no movement at all. The one unambiguous signal is
     whether the PAGE scrolled: a tap never moves the scroll position, a scroll
     always does. So remember the scroll offset on pointerdown and only engage on
     pointerup if it hasn't changed (and pointercancel — the scroll's own signal —
     hasn't already dropped the gesture). */
  const lockTapRef = useRef(null);
  const LOCK_TAP_SLOP = 10;
  const scrollPos = () => [window.scrollX || window.pageXOffset || 0, window.scrollY || window.pageYOffset || 0];
  const onLockDown = (e) => { const [sx, sy] = scrollPos(); lockTapRef.current = { x: e.clientX, y: e.clientY, sx, sy, scrolled: false }; };
  const onLockUp = (e) => {
    const t = lockTapRef.current;
    lockTapRef.current = null;
    if (!t) return; // gesture was cancelled (native scroll took over)
    const [x, y] = scrollPos();
    // Engage only for a real tap — the finger came up within ~10px of where it
    // went down (pointerup carries the final position even when the browser
    // withheld pointermove during a scroll), and nothing scrolled. The last two
    // checks also catch a flick, whose momentum scroll lands after touchend.
    const moved = Math.abs(e.clientX - t.x) + Math.abs(e.clientY - t.y) > LOCK_TAP_SLOP;
    if (!moved && !t.scrolled && x === t.sx && y === t.sy) setEngaged(true);
  };
  const onLockCancel = () => { lockTapRef.current = null; };
  // Keyboard activation (Enter/Space) — pointer handlers don't cover it.
  const onLockKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEngaged(true); } };

  /* A chosen board colour is exposed as `--bg-pick`; canvas.css blends it a
     short way into the base (`--bg-base`) the way a shape fill composites over
     the board, so the same value reads soft in light mode and dark-tinted (no
     light hue) in dark mode. See the `[data-cv-bg="custom"]` rule. */
  const bgStyle = bgColor ? { '--cv-bg-pick': bgColor } : undefined;

  /* Per-instance accent override. A unique attribute scopes the injected rules to
     this board so several canvases with different accents can share a page. */
  const accentId = useId().replace(/:/g, '');
  const accentCss = accent ? buildAccentCss(`.canvas-root[data-cv-accent="${accentId}"]`, accent) : '';

  /* Toggle a state class on the scoped root (not document.body) so multiple
     canvases stay independent and nothing leaks onto the host page. */
  // Root state as data-* attributes (data-panning during a drag-pan, data-space
   // while the space bar is held for a temporary pan) — see the cursor rules.
  const rootState = (name, on) => { const el = rootRef.current; if (!el) return; if (on) el.setAttribute('data-' + name, ''); else el.removeAttribute('data-' + name); };

  /* Pointerdown is a React handler (correct simulated bubbling so chrome / node
     handlers can stopPropagation). Move/up are native window listeners so
     gestures keep tracking off-viewport; wheel/keys are scoped to this canvas. */
  const onPointerDown = (e) => {
    if (e.button === 2) return;
    const vp = viewportRef.current;

    // A press outside the live html node re-shields it (presses inside land in
    // the iframe and never reach us). Applies in both edit and view mode.
    if (S.htmlActiveId) {
      const hEl = nodeEls.get(S.htmlActiveId);
      if (!(hEl && hEl.contains(e.target))) eng.setHtmlActive(null);
    }

    if (S.readOnly) {
      // Only genuine interactive controls (in read-only, just the code card's
      // copy button) swallow the gesture so a tap operates them. Everything else —
      // crucially link cards, which are a full <a> — still starts a pan; a
      // stationary tap opens the link (handled in onUp), mirroring how an image
      // tap opens full-screen. Bailing on <a> here left link (and code button)
      // cards un-pannable on touch, where cards fill the screen and there's little
      // bare board to grab.
      if (e.target.closest && e.target.closest('button, select')) return;
      // Cooperative gestures: a single finger belongs to the page (native
      // scroll). Don't start a board pan on touch — two fingers pan/zoom via the
      // pinch handler. Mouse drag-pan is left alone (a drag never traps scroll).
      // In click-to-interact mode this branch only runs once unlocked (the
      // overlay swallows touches while locked), where touch-pan is wanted — so
      // exclude it here. When unlocked via the lock button (engaged), a single
      // finger pans the board too. (The "use two fingers" hint is flashed from the
      // touch tracker below, which knows the finger count, so a real two-finger
      // pan doesn't trigger it.)
      if (COOP && !CLICK_TO_INTERACT && !engagedRef.current && !maximizedRef.current && e.pointerType === 'touch') return;
      eng.freezeView();
      // Remember media / links under the pointer so a stationary tap opens them.
      // For a grid, the specific cell (data-media-idx) decides which asset opens.
      const nodeUnder = e.target.closest && e.target.closest('.cv-node');
      const isMedia = nodeUnder && (nodeUnder.dataset.type === 'image' || nodeUnder.dataset.type === 'video');
      const cellEl = e.target.closest && e.target.closest('[data-media-idx]');
      const linkEl = e.target.closest && e.target.closest('.cv-node.cv-link');
      const htmlEl = e.target.closest && e.target.closest('.cv-node.cv-html');
      actionRef.current = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: eng.viewRef.x, oy: eng.viewRef.y, imgId: isMedia ? nodeUnder.dataset.id : null, imgIdx: cellEl ? +cellEl.dataset.mediaIdx : 0, linkId: linkEl ? linkEl.dataset.id : null, htmlId: htmlEl ? htmlEl.dataset.id : null };
      rootState('panning', true);
      vp.setPointerCapture(e.pointerId);
      return;
    }

    if (S.editingId) {
      const editingEl = nodeEls.get(S.editingId);
      if (editingEl && editingEl.contains(e.target)) return; // let text editing work
    }
    // A press outside the grid being proportion-edited leaves that mode (a press
    // inside — on a divider or cell — keeps it; dividers stop propagation anyway).
    if (S.gridEditId) {
      const gEl = nodeEls.get(S.gridEditId);
      if (!(gEl && gEl.contains(e.target))) eng.exitGridEdit();
    }
    eng.freezeView();

    const nodeEl = e.target.closest('.cv-node');
    const shapeEl = e.target.closest('.cv-shape');
    const spacePan = e.button === 1 || panKey.current;
    const tool = S.tool;

    if (spacePan || tool === 'hand') {
      actionRef.current = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: eng.viewRef.x, oy: eng.viewRef.y };
      rootState('panning', true);
      vp.setPointerCapture(e.pointerId);
      return;
    }
    // Scale mode (K) behaves like select for picking / moving objects; the only
    // difference is that its resize handles scale instead of resize (see Chrome).
    const selectLike = tool === 'select' || tool === 'scale';
    if (selectLike && (nodeEl || shapeEl)) {
      const kind = nodeEl ? 'node' : 'shape';
      const id = (nodeEl || shapeEl).dataset.id;
      // Shift-click adds/removes the object from the selection without dragging.
      if (e.shiftKey) { eng.toggleSelect(kind, id); return; }
      // Grabbing an object inside a multi-selection drags the whole group;
      // anything else collapses the selection to the grabbed object.
      const items = eng.moveItemsFor({ kind, id });
      if (!eng.isSelected(kind, id)) (kind === 'node' ? eng.selectNode : eng.selectShape)(id);
      if (nodeEl) { nodeEl.dataset.moved = ''; nodeEl.dataset.dragging = ''; }
      // A stationary click on a link card opens it (a drag still just moves it);
      // remembered here, acted on in onUp when the gesture turns out not to move.
      const linkId = nodeEl && nodeEl.dataset.type === 'link' ? id : null;
      // Alt-drag leaves the originals in place and drops a copy at the release point.
      actionRef.current = { type: 'move', sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, items, clickItem: { kind, id }, dup: e.altKey && !S.readOnly, linkId };
      vp.setPointerCapture(e.pointerId);
      return;
    }
    if (selectLike) {
      /* Empty canvas: rubber-band selection. (Drag-to-pan on empty space is
         gone in edit mode — panning lives on space / middle-click / the hand
         tool / the wheel.) Shift keeps the existing selection as the base. */
      const base = e.shiftKey ? [...S.selected] : [];
      if (!e.shiftKey) eng.deselect();
      actionRef.current = { type: 'marquee', sx: e.clientX, sy: e.clientY, base };
      vp.setPointerCapture(e.pointerId);
      return;
    }

    /* Creation tools: cancel the pointerdown so the compat mousedown never
       runs its focus-change default. Otherwise the browser blurs the freshly
       focused text of the new node mid-click, and the empty-on-blur cleanup
       deletes it in the same gesture that created it. */
    e.preventDefault();
    const w = eng.screenToWorld(e.clientX, e.clientY);
    if (tool === 'note') {
      const n = eng.addNode({ id: eng.newId('sticky'), type: 'sticky', x: w.x - 105, y: w.y - 90, color: S.noteColor, text: '' });
      eng.setTool('select'); eng.selectNode(n.id); eng.startEditing(n.id); return;
    }
    if (tool === 'text') {
      const n = eng.addNode({ id: eng.newId('tblock'), type: 'tblock', x: w.x, y: w.y - 18, text: '', font: S.textFont });
      eng.setTool('select'); eng.selectNode(n.id); eng.startEditing(n.id); return;
    }
    if (tool === 'md') {
      const n = eng.addNode({ id: eng.newId('md'), type: 'md', x: w.x, y: w.y, w: 340, text: '' });
      eng.setTool('select'); eng.selectNode(n.id); eng.startEditing(n.id); return;
    }
    if (tool === 'code') {
      const n = eng.addNode({ id: eng.newId('code'), type: 'code', x: w.x, y: w.y, w: 420, text: '', lang: 'js' });
      eng.setTool('select'); eng.selectNode(n.id); eng.startEditing(n.id); return;
    }
    if (tool === 'frame') {
      const count = S.nodes.filter((x) => x.type === 'frame').length + 1;
      const n = eng.addNode({ id: eng.newId('frame'), type: 'frame', x: w.x, y: w.y, w: 1, h: 1, name: 'Section ' + count });
      actionRef.current = { type: 'frameDraw', id: n.id, ox: w.x, oy: w.y };
      vp.setPointerCapture(e.pointerId);
      return;
    }
    if (DRAW_TOOLS.includes(tool)) {
      const s = { id: eng.newShapeId(), type: tool, stroke: S.strokeColor, width: 3 };
      if (FILLABLE_SHAPES.includes(tool)) s.fill = S.fillColor;
      if (tool === 'pen') s.points = [[w.x, w.y]];
      else { s.x1 = w.x; s.y1 = w.y; s.x2 = w.x; s.y2 = w.y; }
      actionRef.current = { type: 'draw', s };
      setDraft({ ...s });
      vp.setPointerCapture(e.pointerId);
    }
  };

  /* Drag-and-drop media onto the board (dev editing only). Accepts local files
     (images incl. animated GIFs, and videos — both play as-is) and media dragged
     straight from another browser tab, which arrives as a URL rather than a file. */
  const dropActive = () => EDITABLE && !S.readOnly;
  const onDragOver = (e) => {
    if (!dropActive() || !e.dataTransfer) return;
    const types = Array.from(e.dataTransfer.types || []);
    if (types.includes('Files') || types.includes('text/uri-list')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };
  /* Cross-tab media drags carry the <img>/<video> markup in text/html (most
     reliable — uri-list can point at the page rather than the media) and/or a
     plain URL. */
  const droppedMediaUrl = (dt) => {
    const html = dt.getData('text/html');
    const m = html && /<(?:img|video|source)[^>]+src\s*=\s*["']?([^"'\s>]+)/i.exec(html);
    if (m) return m[1].replace(/&amp;/g, '&');
    const uri = (dt.getData('text/uri-list') || '').split('\n').find((l) => l.trim() && !l.startsWith('#'));
    return uri ? uri.trim() : '';
  };
  /* The media node under the drop point (if any) — dropping onto it appends the
     files to its grid rather than making a new object. Resolved via
     elementFromPoint since the drop lands on the viewport. */
  const mediaNodeAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const nodeEl = el && el.closest && el.closest('.cv-node');
    return nodeEl && (nodeEl.dataset.type === 'image' || nodeEl.dataset.type === 'video') ? nodeEl.dataset.id : null;
  };
  const onDrop = (e) => {
    if (!dropActive() || !e.dataTransfer) return;
    const w = eng.screenToWorld(e.clientX, e.clientY);
    const files = Array.from(e.dataTransfer.files || []);
    const audio = files.filter((f) => eng.isAudioFile(f) && !eng.isVideoFile(f));
    const visual = files.filter((f) => eng.isImageFile(f) || eng.isVideoFile(f));
    const html = files.filter((f) => eng.isHtmlFile(f));
    if (audio.length || visual.length || html.length) {
      e.preventDefault();
      // Audio drops stay individual player cards; images/videos become (or join)
      // a grid; HTML documents each become their own live iframe node.
      audio.forEach((file, i) => eng.addAudioFromFile(file, w.x + i * 24, w.y + i * 24));
      html.forEach((file, i) => eng.addHtmlFromFile(file, w.x + i * 24, w.y + i * 24));
      if (visual.length) eng.addMediaFiles(visual, w.x, w.y, mediaNodeAt(e.clientX, e.clientY));
      return;
    }
    const url = droppedMediaUrl(e.dataTransfer);
    if (url) {
      e.preventDefault();
      eng.addMediaFromUrl(url, w.x, w.y);
    }
  };

  /* Double-click an editable object (sticky / text / markdown) to edit it, or
     media (image / video) to open it full-screen. The viewport captures the
     pointer while dragging, which retargets the dblclick event to the viewport
     itself — so resolve the real node under the cursor via elementFromPoint
     rather than e.target. */
  const onDoubleClick = (e) => {
    if (S.readOnly) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const nodeEl = el && el.closest && el.closest('.cv-node');
    if (!nodeEl) return;
    const type = nodeEl.dataset.type;
    const id = nodeEl.dataset.id;
    if (type === 'image' || type === 'video') {
      // A multi-asset grid edits its proportions on double-click; a single asset
      // still opens full-screen. (Full-screen for a grid stays on the context menu.)
      const n = S.nodes.find((x) => x.id === id);
      if (n && n.assets && n.assets.length > 1) { eng.enterGridEdit(id); return; }
      const cellEl = el.closest('[data-media-idx]');
      eng.openFullscreen(id, cellEl ? +cellEl.dataset.mediaIdx : 0);
      return;
    }
    if (type === 'link') { eng.openLink(id); return; }
    if (type === 'html') { eng.setHtmlActive(id); return; } // go live: the iframe takes the pointer
    if (type !== 'sticky' && type !== 'tblock' && type !== 'md' && type !== 'code' && type !== 'sound') return;
    eng.setTool('select'); eng.selectNode(id); eng.startEditing(id);
  };

  const onContextMenu = (e) => {
    if (S.readOnly) return;
    e.preventDefault();
    const nodeEl = e.target.closest('.cv-node');
    const shapeEl = e.target.closest('.cv-shape');
    // Empty space → a canvas menu whose only action is Paste, dropped at the
    // click point (world coords captured now so a later paste lands where the
    // user right-clicked, not the viewport centre).
    if (!nodeEl && !shapeEl) {
      const w = eng.screenToWorld(e.clientX, e.clientY);
      setCtxMenu({ x: e.clientX, y: e.clientY, target: { kind: 'canvas', wx: w.x, wy: w.y } });
      return;
    }
    const kind = nodeEl ? 'node' : 'shape';
    const id = (nodeEl || shapeEl).dataset.id;
    // Right-clicking inside a multi-selection keeps it and targets the group.
    const inMulti = S.selected.length > 1 && eng.isSelected(kind, id);
    if (!inMulti) (kind === 'node' ? eng.selectNode : eng.selectShape)(id);
    // World coords under the cursor so "Paste here" lands at the click point.
    const w = eng.screenToWorld(e.clientX, e.clientY);
    // In a media grid, remember which cell was clicked so per-asset actions
    // (theme-variant images) target it; single-asset nodes resolve to 0.
    const cellEl = e.target.closest && e.target.closest('[data-media-idx]');
    setCtxMenu({ x: e.clientX, y: e.clientY, wx: w.x, wy: w.y, target: inMulti ? { kind: 'multi' } : { kind, id, mediaIdx: cellEl ? +cellEl.dataset.mediaIdx : 0 } });
  };

  /* Native window listeners: move / up / wheel / keyboard. */
  useEffect(() => {
    const scale = () => eng.viewRef.scale;

    const onMove = (e) => {
      const a = actionRef.current;
      if (!a) {
        // No gesture in progress → track the node under the cursor for the hover hint.
        const nodeEl = e.target.closest && e.target.closest('.cv-node');
        eng.setHover(nodeEl ? nodeEl.dataset.id : null);
        return;
      }
      if (a.type === 'pan') {
        if (Math.abs(e.clientX - a.sx) + Math.abs(e.clientY - a.sy) > 4) a.moved = 1;
        eng.viewRef.x = a.ox + (e.clientX - a.sx);
        eng.viewRef.y = a.oy + (e.clientY - a.sy);
        eng.targetRef.x = eng.viewRef.x; eng.targetRef.y = eng.viewRef.y;
        eng.applyView(); eng.markActive(); return;
      }
      if (a.type === 'move') {
        let dx = (e.clientX - a.sx) / scale(), dy = (e.clientY - a.sy) / scale();
        if (Math.abs(dx) + Math.abs(dy) > 2) a.moved = 1;
        // Snap to nearby objects' edges/centres once the drag is real (guides
        // draw in the chrome layer); holding Cmd/Ctrl drags freely.
        if (a.moved && !(e.metaKey || e.ctrlKey)) {
          const snapped = eng.snapMoveDelta(a.items, dx, dy);
          dx = snapped.dx; dy = snapped.dy;
          eng.setSnapGuides(snapped.guides);
        } else eng.setSnapGuides(null);
        a.dx = dx; a.dy = dy;
        // Alt-drag: the instant the drag begins, drop a copy at the origin so the
        // original stays visible while the dragged items carry on. Selection stays
        // on the dragged items (select:false) so they remain the ones being moved.
        if (a.dup && a.moved && !a.duplicated) {
          a.duplicated = 1;
          eng.duplicateItemsAt(a.items.map((it) => ({ kind: it.kind, id: it.id })), 0, 0);
        }
        for (const it of a.items) {
          if (it.kind === 'node') {
            const nx = it.ox + dx, ny = it.oy + dy;
            // Preserve the node's own scale — dropping it here would snap a
            // scaled object back to 1× mid-drag.
            it.el.style.transform = `translate(${nx}px,${ny}px) scale(${+it.el.dataset.scale || 1})`;
            it.el.dataset.x = nx; it.el.dataset.y = ny;
            if (a.moved) it.el.dataset.moved = '1';
          } else {
            it.el.setAttribute('transform', `translate(${dx},${dy})`);
          }
        }
        eng.syncChrome(); return;
      }
      if (a.type === 'marquee') {
        const r = viewportRef.current.getBoundingClientRect();
        eng.placeMarquee(
          Math.min(a.sx, e.clientX) - r.left, Math.min(a.sy, e.clientY) - r.top,
          Math.abs(e.clientX - a.sx), Math.abs(e.clientY - a.sy)
        );
        const w1 = eng.screenToWorld(a.sx, a.sy), w2 = eng.screenToWorld(e.clientX, e.clientY);
        eng.marqueeSelect(
          { x: Math.min(w1.x, w2.x), y: Math.min(w1.y, w2.y), w: Math.abs(w2.x - w1.x), h: Math.abs(w2.y - w1.y) },
          a.base
        );
        return;
      }
      if (a.type === 'draw') {
        const w = eng.screenToWorld(e.clientX, e.clientY), s = a.s;
        if (s.type === 'pen') s.points.push([w.x, w.y]); else { s.x2 = w.x; s.y2 = w.y; }
        setDraft({ ...s, points: s.points ? [...s.points] : undefined }); return;
      }
      if (a.type === 'resize') {
        const el = nodeEls.get(a.id); if (!el) return;
        // Which edges this handle drags; the opposite edge stays anchored. Corners
        // (nw/ne/sw/se) drive both axes; the side handles (n/s/e/w — grabbable
        // anywhere along an edge, Figma-style) drive a single axis, so the other
        // axis is pinned (its delta forced to 0 below).
        const fromLeft = a.corner === 'nw' || a.corner === 'sw' || a.corner === 'w';
        const fromTop = a.corner === 'nw' || a.corner === 'ne' || a.corner === 'n';
        const activeX = a.corner !== 'n' && a.corner !== 's';
        const activeY = a.corner !== 'e' && a.corner !== 'w';
        const edgeOnly = activeX !== activeY; // a single-axis side handle
        let dx = activeX ? (e.clientX - a.sx) / scale() : 0;
        let dy = activeY ? (e.clientY - a.sy) / scale() : 0;
        const R = a.ox + a.ow, B = a.oy + a.oh; // fixed right/bottom edges when dragging left/top
        // Scale mode (K tool): a corner drag multiplies the node's `scale`
        // uniformly, anchoring the opposite corner. The box's width/height stay
        // put — only the transform's scale (and x/y, to hold the anchor) change.
        if (a.scaleMode) {
          const footW = a.natW * a.scale0, footH = a.natH * a.scale0; // current on-board size
          const rW = footW ? (footW + (fromLeft ? -dx : dx)) / footW : 1;
          const rH = footH ? (footH + (fromTop ? -dy : dy)) / footH : 1;
          // Uniform: follow whichever axis the pointer pushed further.
          const r = Math.abs(rW - 1) >= Math.abs(rH - 1) ? rW : rH;
          const newScale = Math.max(0.05, Math.min(20, a.scale0 * r));
          const Wp = a.natW * newScale, Hp = a.natH * newScale; // new on-board size
          const x = fromLeft ? (a.ox + footW) - Wp : a.ox;
          const y = fromTop ? (a.oy + footH) - Hp : a.oy;
          el.style.transform = `translate(${x}px,${y}px) scale(${newScale})`;
          el.dataset.x = x; el.dataset.y = y; el.dataset.scale = newScale;
          a.x = x; a.y = y; a.scale = newScale;
          eng.setSnapGuides(null); eng.syncChrome(); return;
        }
        // Cmd-drag on a text block scales the font instead of the box width. The
        // scale tracks how far the handle would have stretched the box: font grows
        // in proportion to the stretched width / ow, keeping the stored width untouched.
        if (a.mdType === 'tblock' && (e.metaKey || e.ctrlKey)) {
          const f = Math.max(8, Math.round(a.ofs * (a.ow + (fromLeft ? -dx : dx)) / a.ow));
          el.style.fontSize = f + 'px'; a.fontSize = f;
          eng.setSnapGuides(null); eng.syncChrome(); return;
        }
        // Cmd-drag on a single image/video crops instead of scaling: the media
        // freezes at its rendered extent (captured in Chrome.jsx) while the box
        // follows the pointer and clips it, so each handle trims — or re-reveals —
        // the edges it drags. Modifiers compose (and apply live mid-drag):
        // Alt crops from the center (both sides move symmetrically) and Shift
        // keeps the box's aspect ratio, following the dominant drag axis.
        // Clamped to the media's extent: growing past it is a normal
        // (aspect-locked) resize. Releasing Cmd mid-drag snaps back to that.
        if ((a.mdType === 'image' || a.mdType === 'video') && a.crop && (e.metaKey || e.ctrlKey)) {
          const c = a.crop;
          // The media's world origin — the box slides over this fixed rect.
          const MX = a.ox - c.x0 * c.cw, MY = a.oy - c.y0 * c.ch;
          const minW = Math.min(60, c.cw), minH = Math.min(40, c.ch);
          const center = e.altKey, aspect = e.shiftKey;
          const CX = a.ox + a.ow / 2, CY = a.oy + a.oh / 2;
          // Pointer-driven target sizes, and the media-extent ceiling for each
          // axis: centered growth stops at the nearer media edge, anchored
          // growth at the edge the handle drags toward.
          let w = center ? a.ow + 2 * (fromLeft ? -dx : dx) : fromLeft ? R - (a.ox + dx) : a.ow + dx;
          let h = center ? a.oh + 2 * (fromTop ? -dy : dy) : fromTop ? B - (a.oy + dy) : a.oh + dy;
          const availW = center ? 2 * Math.min(CX - MX, MX + c.cw - CX) : fromLeft ? R - MX : MX + c.cw - a.ox;
          const availH = center ? 2 * Math.min(CY - MY, MY + c.ch - CY) : fromTop ? B - MY : MY + c.ch - a.oy;
          if (aspect) {
            const k = Math.abs(dx) >= Math.abs(dy) ? w / a.ow : h / a.oh;
            const kMin = Math.max(minW / a.ow, minH / a.oh);
            const kMax = Math.min(availW / a.ow, availH / a.oh);
            const kk = Math.min(kMax, Math.max(kMin, k));
            w = a.ow * kk; h = a.oh * kk;
          } else {
            w = Math.min(availW, Math.max(minW, w));
            h = Math.min(availH, Math.max(minH, h));
          }
          const x = center ? CX - w / 2 : fromLeft ? R - w : a.ox;
          const y = center ? CY - h / 2 : fromTop ? B - h : a.oy;
          // Footprint → natural: the box lives inside the node's scale(fx)
          // transform, so its own width/height (and the media inside it) are
          // divided by fx; the transform re-applies the scale. Crop fractions
          // are scale-invariant. fx is 1 for unscaled media (the usual case).
          el.style.transform = `translate(${x}px,${y}px) scale(${a.fx})`; el.dataset.x = x; el.dataset.y = y; a.x = x; a.y = y;
          el.style.width = w / a.fx + 'px'; el.dataset.w = w / a.fx; a.w = w / a.fx;
          el.style.height = h / a.fx + 'px'; el.dataset.h = h / a.fx; a.h = h / a.fx;
          c.el.style.width = c.cw / a.fx + 'px'; c.el.style.height = c.ch / a.fx + 'px';
          c.el.style.transform = `translate(${(MX - x) / a.fx}px,${(MY - y) / a.fx}px)`;
          a.cropRect = { x: (x - MX) / c.cw, y: (y - MY) / c.ch, w: w / c.cw, h: h / c.ch };
          eng.setSnapGuides(null); eng.syncChrome(); return;
        }
        if (a.crop && a.cropRect) {
          // Cmd released mid-drag: undo the freeze so the media re-fits the box.
          a.cropRect = null;
          a.crop.el.style.width = a.crop.mw0; a.crop.el.style.height = a.crop.mh0;
          a.crop.el.style.transform = a.crop.mt0;
        }
        const minW = a.mdType === 'md' ? 160 : a.mdType === 'code' ? 200 : a.mdType === 'tblock' ? 120 : a.mdType === 'link' ? 200 : a.mdType === 'html' ? 200 : 60;
        // Snap the dragged edge(s) to nearby objects' edges/centres — the same
        // pull and guide lines a move gets. Only centered (Alt) resizes opt out;
        // the crop and font-scale gestures (Cmd on a single image / text block)
        // returned above, so a Cmd held here is just a free resize — which still
        // snaps. Media/html keep their aspect while snapping unless it's been
        // freed (Shift, or Cmd freeing a grid / html / non-lone-SVG with no crop).
        const metaKey = e.metaKey || e.ctrlKey;
        const mediaLike = a.mdType === 'image' || a.mdType === 'video' || a.mdType === 'html';
        // A side handle stretches one axis, so media isn't aspect-locked (there's
        // no second axis to scale) — same as Shift or a Cmd free-resize.
        const aspectFree = e.shiftKey || edgeOnly || (metaKey && mediaLike && !a.loneSvg && !a.crop);
        if (!e.altKey) {
          const box = { x: a.ox, y: a.oy, w: a.ow, h: a.oh };
          const guides = [];
          // Aspect-locked media scales as one: snapping either the vertical or the
          // horizontal edge sets a target width; we take whichever pulls least and
          // scale the whole box to it, so the bottom/side lines up even though only
          // one axis is "dragged".
          const aspectLocked = mediaLike && !aspectFree;
          if (aspectLocked) {
            const bar = a.frameBar || 0;
            const w0 = Math.max(minW, a.ow + (fromLeft ? -dx : dx));
            const hOf = (w) => bar + w * (a.oh - bar) / a.ow; // box height at width w
            const snap = eng.snapResize(a.id,
              { x: fromLeft ? R - w0 : a.ox + w0, y: fromTop ? B - hOf(w0) : a.oy + hOf(w0) }, box);
            const cands = [];
            if (snap.x) cands.push({ w: fromLeft ? R - snap.x.v : snap.x.v - a.ox, d: Math.abs(snap.x.d), guide: snap.x.guide });
            if (snap.y) { const h = fromTop ? B - snap.y.v : snap.y.v - a.oy; cands.push({ w: (h - bar) * a.ow / (a.oh - bar), d: Math.abs(snap.y.d), guide: snap.y.guide }); }
            cands.sort((p, q) => p.d - q.d);
            if (cands.length && cands[0].w >= minW) {
              dx = fromLeft ? a.ow - cands[0].w : cands[0].w - a.ow;
              guides.push(cands[0].guide);
            }
          } else {
            // Independent edges. A text block's height is auto (no vertical edge);
            // a Shift-locked non-media box scales on its dominant axis only; a side
            // handle only snaps the axis it actually drags (activeX/activeY).
            let freeX = activeX, freeY = activeY;
            if (a.mdType === 'md' || a.mdType === 'tblock' || a.mdType === 'code' || a.mdType === 'link') freeY = false;
            else if (e.shiftKey && a.mdType !== 'image' && a.mdType !== 'video') {
              if (Math.abs(dx) >= Math.abs(dy)) freeY = false; else freeX = false;
            }
            const ex = (fromLeft ? a.ox : R) + dx; // dragged vertical edge, world x
            const ey = (fromTop ? a.oy : B) + dy;  // dragged horizontal edge, world y
            const snap = eng.snapResize(a.id, { x: freeX ? ex : null, y: freeY ? ey : null }, box);
            if (snap.x) { dx += snap.x.d; guides.push(snap.x.guide); }
            if (snap.y) { dy += snap.y.d; guides.push(snap.y.guide); }
          }
          eng.setSnapGuides(guides);
        } else eng.setSnapGuides(null);
        // Plain-resize modifiers (live, like the crop ones): Alt mirrors the
        // drag around the box center, Shift flips the aspect default — freeing
        // images/videos, locking everything else.
        const center = e.altKey;
        const wRaw = a.ow + (center ? 2 : 1) * (fromLeft ? -dx : dx);
        const hRaw = a.oh + (center ? 2 : 1) * (fromTop ? -dy : dy);
        let w = Math.max(minW, wRaw);
        let h = null;
        if (a.mdType === 'image' || a.mdType === 'video' || a.mdType === 'html') {
          // Aspect-locked unless freed. Multi-asset grids (no crop context)
          // also free-resize under Cmd — their cover-cropped cells absorb the
          // aspect change (html nodes likewise: no crop, so Cmd frees them).
          // A freed lone SVG letterboxes (it renders `contain`).
          // A device frame's chrome bar (a.frameBar) is fixed height, so lock the
          // media's ratio — box minus bar — and add the bar back, else the media
          // gets clipped as the box ratio drifts from the media's. `aspectFree`
          // (computed above for snapping) is the single source of truth.
          const free = aspectFree;
          const bar = a.frameBar || 0;
          h = free
            ? Math.max(40, hRaw)
            : bar + Math.max(1, Math.round(w * ((a.oh - bar) / a.ow)));
        } else if (a.mdType !== 'md' && a.mdType !== 'tblock' && a.mdType !== 'code' && a.mdType !== 'link') {
          if (e.shiftKey) {
            // Shift locks the box aspect, following the dominant drag axis.
            const k = Math.abs(dx) >= Math.abs(dy) ? wRaw / a.ow : hRaw / a.oh;
            w = Math.max(minW, a.ow * k);
            h = Math.max(40, Math.round(w * (a.oh / a.ow)));
          } else {
            h = Math.max(40, hRaw);
          }
        }
        // The math above is in footprint units; the element's own width/height
        // (and stored w/h) are natural, so divide the node's scale (fx) back out.
        // The transform re-applies scale(fx) to reach the footprint on screen.
        const wN = w / a.fx, hN = h != null ? h / a.fx : null;
        el.style.width = wN + 'px'; el.dataset.w = wN; a.w = wN;
        if (hN != null) { el.style.height = hN + 'px'; el.dataset.h = hN; a.h = hN; }
        // Scale-mode frame: grow the chrome bar (and thus the whole chrome + the
        // node's corner radius, which derive from --cv-df-bar on the node) live
        // with the box — React only recomputes it on release.
        if (a.frameScale && hN != null) el.style.setProperty('--cv-df-bar', hN * a.frameScale + 'px');
        // Anchor: centered resizes mirror around the box middle; otherwise
        // left/top handles pin the opposite corner. Height-auto nodes keep
        // their top edge.
        const x = center ? a.ox + (a.ow - w) / 2 : fromLeft ? R - w : a.ox;
        const y = h == null ? a.oy : center ? a.oy + (a.oh - h) / 2 : fromTop ? B - h : a.oy;
        el.style.transform = `translate(${x}px,${y}px) scale(${a.fx})`; el.dataset.x = x; el.dataset.y = y; a.x = x; a.y = y;
        eng.syncChrome(); return;
      }
      if (a.type === 'frameDraw') {
        const w = eng.screenToWorld(e.clientX, e.clientY), el = nodeEls.get(a.id); if (!el) return;
        const x = Math.min(a.ox, w.x), y = Math.min(a.oy, w.y), ww = Math.abs(w.x - a.ox), hh = Math.abs(w.y - a.oy);
        el.style.transform = `translate(${x}px,${y}px)`; el.dataset.x = x; el.dataset.y = y;
        el.style.width = ww + 'px'; el.style.height = hh + 'px'; el.dataset.w = ww; el.dataset.h = hh;
        a.x = x; a.y = y; a.w = ww; a.h = hh;
        eng.syncChrome();
      }
    };

    const onUp = () => {
      const a = actionRef.current;
      if (!a) return;
      if (a.type === 'pan') {
        rootState('panning', false);
        if (a.imgId && !a.moved) eng.openFullscreen(a.imgId, a.imgIdx || 0); // tap an image/video → full-screen
        if (a.linkId && !a.moved) eng.openLink(a.linkId);      // tap a link card → open it
        if (a.htmlId && !a.moved) eng.setHtmlActive(a.htmlId); // tap an html demo → make it interactive
      }
      if (a.type === 'move') {
        eng.setSnapGuides(null);
        const nodePatches = {}, shapePatches = {};
        for (const it of a.items) {
          if (it.kind === 'node') {
            delete it.el.dataset.dragging;
            if (a.moved) nodePatches[it.id] = { x: it.ox + a.dx, y: it.oy + a.dy };
          } else {
            it.el.removeAttribute('transform');
            if (a.moved) {
              const s = S.shapes.find((x) => x.id === it.id);
              if (s) {
                shapePatches[it.id] = s.type === 'pen'
                  ? { points: s.points.map((p) => [p[0] + a.dx, p[1] + a.dy]) }
                  : { x1: s.x1 + a.dx, y1: s.y1 + a.dy, x2: s.x2 + a.dx, y2: s.y2 + a.dy };
              }
            }
          }
        }
        if (a.moved) {
          eng.patchMany(nodePatches, shapePatches);
        } else {
          // A plain click on one object of a multi-selection collapses to just it.
          if (a.clickItem && S.selected.length > 1) {
            (a.clickItem.kind === 'node' ? eng.selectNode : eng.selectShape)(a.clickItem.id);
          }
          // Tap a link card (no drag) → open it.
          if (a.linkId) eng.openLink(a.linkId);
          eng.saveNow();
        }
      }
      if (a.type === 'marquee') eng.hideMarquee();
      if (a.type === 'draw') {
        const s = a.s;
        const tiny = (s.type === 'pen' && s.points.length < 2) ||
          (s.type !== 'pen' && Math.abs(s.x2 - s.x1) < 4 && Math.abs(s.y2 - s.y1) < 4);
        setDraft(null);
        if (!tiny) {
          eng.addShape(s);
          // All draw tools except the pen snap back to select after one shape.
          if (s.type !== 'pen') { eng.setTool('select'); eng.selectShape(s.id); }
        }
      }
      if (a.type === 'resize') {
        eng.setSnapGuides(null);
        const patch = {};
        if (a.x != null) patch.x = a.x;
        if (a.y != null) patch.y = a.y;
        if (a.w != null) patch.w = a.w;
        if (a.h != null) patch.h = a.h;
        if (a.scale != null) patch.scale = a.scale; // scale-mode drag (no w/h change)
        if (a.fontSize != null) patch.fontSize = a.fontSize;
        if (a.cropRect) {
          // Commit the crop as fractions of the media's extent (relative, so
          // later aspect-locked scaling keeps the same framing). Dragged back
          // out to the full media → drop the crop entirely.
          const r4 = (v) => Math.round(Math.max(0, v) * 10000) / 10000;
          patch.crop = a.cropRect.w >= 0.999 && a.cropRect.h >= 0.999
            ? null
            : { x: r4(a.cropRect.x), y: r4(a.cropRect.y), w: r4(a.cropRect.w), h: r4(a.cropRect.h) };
          // Swap the drag's px freeze for the same geometry in relative units:
          // React may skip re-writing a value-identical style prop, and stale
          // px sizing wouldn't track later box resizes.
          const m = a.crop.el;
          m.style.width = patch.crop ? `${100 / patch.crop.w}%` : '';
          m.style.height = patch.crop ? `${100 / patch.crop.h}%` : '';
          m.style.transform = patch.crop ? `translate(${-patch.crop.x * 100}%,${-patch.crop.y * 100}%)` : '';
        }
        if (Object.keys(patch).length) eng.updateNode(a.id, patch);
      }
      if (a.type === 'frameDraw') {
        if ((a.w ?? 0) < 24 || (a.h ?? 0) < 24) eng.removeNode(a.id);
        else { eng.updateNode(a.id, { x: a.x, y: a.y, w: a.w, h: a.h }); eng.setTool('select'); eng.selectNode(a.id); }
      }
      actionRef.current = null;
      eng.syncChrome();
    };

    const onWheel = (e) => {
      if (S.fullscreen) { e.preventDefault(); return; } // lightbox covers the board
      setCtxMenu(null);
      const zoomKey = e.ctrlKey || e.metaKey;
      if (!zoomKey && e.target.closest) {
        if (e.target.closest('.cv-ui.cv-panel')) return;
        // Defer to a textarea only if it can actually scroll — the markdown
        // source editor is overflow:hidden, so the wheel should pan the canvas.
        const ta = e.target.closest('textarea');
        if (ta) {
          const oy = getComputedStyle(ta).overflowY;
          if ((oy === 'auto' || oy === 'scroll') && ta.scrollHeight > ta.clientHeight) return;
        }
      }
      // Click-to-interact: while locked the wheel belongs to the page; once
      // unlocked the board behaves greedily (normal pan + ⌘/Ctrl zoom). The
      // overlay is the affordance, so no wheel hint here.
      if (CLICK_TO_INTERACT) {
        if (!engagedRef.current && !maximizedRef.current) return; // locked → page scrolls past (but maximised owns the screen)
      } else if (COOP && S.readOnly && !engagedRef.current && !maximizedRef.current && !zoomKey) {
        // Cooperative gestures (view mode, locked): a plain wheel scrolls the host
        // page (don't preventDefault). Surface the "scroll to pan is disabled"
        // message since the user just tried to scroll the board. Unlocking via the
        // lock button (engaged) or editing lets the wheel pan the board instead.
        flashMsg();
        return;
      }
      e.preventDefault();
      if (zoomKey) {
        const d = Math.max(-ZOOM.deltaClamp, Math.min(ZOOM.deltaClamp, e.deltaY));
        eng.zoomAt(e.clientX, e.clientY, Math.exp(-d * ZOOM.sensitivity));
      } else {
        eng.panBy(-e.deltaX * PAN.wheelSpeed, -e.deltaY * PAN.wheelSpeed);
      }
    };

    const onKeyDown = (e) => {
      // Only act when this canvas is engaged — the pointer is over it, or it was
      // the last thing the user interacted with (clicked a tool / the board) and
      // they haven't since clicked elsewhere on the host page. That keeps an
      // embedded board from stealing keystrokes meant for the rest of the page
      // while letting shortcuts fire without babysitting the cursor over the canvas.
      if (!hoverInsideRef.current && !activeInsideRef.current) return;
      if (S.editingId) return;
      // Don't hijack keys while typing in a field (e.g. renaming a page/frame).
      const ae = document.activeElement;
      if (ae && (ae.isContentEditable || ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') { panKey.current = true; rootState('space', true); return; }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (S.selected.length) { e.preventDefault(); eng.deleteSelected(); }
        return;
      }
      if (e.metaKey || e.ctrlKey) {
        const mk = e.key.toLowerCase();
        if (mk === '0') { e.preventDefault(); eng.zoomTo(1); return; }
        // Undo / redo (⌘Z / ⇧⌘Z, plus Ctrl+Y for redo on Windows). Only in edit
        // mode; while a field/text node is focused this handler has already
        // bailed above, so the browser's native field undo still wins there.
        if (mk === 'z') { if (!S.readOnly) { e.preventDefault(); if (e.shiftKey) eng.redo(); else eng.undo(); } return; }
        if (mk === 'y') { if (!S.readOnly) { e.preventDefault(); eng.redo(); } return; }
        if (mk === 'c') { if (S.selected.length) { e.preventDefault(); eng.copySelected(); } return; }
        if (mk === 'x') { if (!S.readOnly && S.selected.length) { e.preventDefault(); eng.cutSelected(); } return; }
        // Paste is handled by the native `paste` event (below) so it can also
        // pull image/gif/svg/video off the system clipboard — don't preventDefault
        // here or that event never fires.
        if (mk === 'v') return;
        if (mk === 'd') { if (!S.readOnly && S.selected.length) { e.preventDefault(); eng.duplicateSelected(); } return; }
      }
      const map = S.readOnly
        ? { v: 'select', h: 'hand' }
        : { v: 'select', h: 'hand', k: 'scale', n: 'note', t: 'text', m: 'md', c: 'code', p: 'pen', l: 'line', a: 'arrow', r: 'rect', o: 'ellipse', f: 'frame' };
      const k = e.key.toLowerCase();
      if (map[k] && !e.metaKey && !e.ctrlKey) eng.setTool(map[k]);
      // Record is an action, not a placement tool: `S` starts a capture (Esc /
      // the recorder panel stop it), and never fires while already recording.
      if (k === 's' && !e.metaKey && !e.ctrlKey && !S.readOnly && !S.recording) eng.startRecording();
      if (e.key === 'Escape') {
        if (S.recording) eng.cancelRecording();
        eng.exitGridEdit();
        eng.setHtmlActive(null);
        eng.deselect(); setCtxMenu(null); eng.stopEditing();
        if (CLICK_TO_INTERACT && engagedRef.current) setEngaged(false);
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') { panKey.current = false; if (S.tool !== 'hand') rootState('space', false); }
    };
    // Cmd/Ctrl+V. Gated like keydown so an embedded board never steals a paste
    // meant for the host page or a focused field. Media off the system clipboard
    // (image / gif / svg / video) drops at the viewport centre; otherwise fall
    // back to the internal node clipboard.
    const onPaste = (e) => {
      if ((!hoverInsideRef.current && !activeInsideRef.current) || S.editingId || S.readOnly) return;
      const ae = document.activeElement;
      if (ae && (ae.isContentEditable || ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
      const r = viewportRef.current && viewportRef.current.getBoundingClientRect();
      const w = eng.screenToWorld(r ? r.left + r.width / 2 : 0, r ? r.top + r.height / 2 : 0);
      e.preventDefault();
      // An in-canvas Copy stamps the OS clipboard with our marker — when it's
      // there, paste the internal node clipboard, never a stale OS image/link.
      if (eng.systemClipIsMine(e.clipboardData)) { eng.paste(); return; }
      // Media file → link URL → internal node clipboard, in that order.
      if (eng.pasteMedia(e.clipboardData, w.x, w.y)) return;
      if (eng.pasteLink(e.clipboardData, w.x, w.y)) return;
      eng.paste();
    };

    /* Pinch-to-zoom (touch): track the active touch pointers and drive zoom +
       two-finger pan off the distance/midpoint between them. A second finger
       cancels whatever single-finger action (pan / marquee / draw) was underway
       so it can't fight the pinch. */
    const touches = new Map(); // pointerId -> { x, y }
    let pinch = null;          // { dist, cx, cy } baseline from the previous move
    // "Use two fingers to pan" hint is a teaching nudge, not a per-gesture label:
    // suppress it until this time. Showing it, and every two-finger gesture, pushes
    // the window out — so once the user demonstrates the two-finger pan it goes
    // quiet, and only resurfaces after a stretch of single-finger-only use.
    let hintQuietUntil = 0;
    const HINT_COOLDOWN = 8000;
    const twoPoints = () => { const [a, b] = [...touches.values()]; return [a, b]; };
    const pinchMetrics = () => {
      const [a, b] = twoPoints();
      return { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    };
    const onTouchDown = (e) => {
      if (e.pointerType !== 'touch') return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // Cooperative locked: a lone finger is a page-scroll attempt → hint to use
      // two fingers, unless we're in the quiet window.
      if (touches.size === 1 && COOP && S.readOnly && !engagedRef.current && !maximizedRef.current && !CLICK_TO_INTERACT) {
        if (performance.now() >= hintQuietUntil) { flashMsg(); hintQuietUntil = performance.now() + HINT_COOLDOWN; }
      }
      if (touches.size === 2) {
        // Two fingers → it's a pan, not a scroll: hide the hint the first finger
        // may have just flashed, and dampen it (they clearly know the gesture).
        hideMsg(); hintQuietUntil = performance.now() + HINT_COOLDOWN;
        // Drop the single-finger gesture so it can't fight the pinch. onUp would
        // normally clean these up, but nulling actionRef means it bails — so undo
        // the single-finger visuals here or a tiny marquee/draft is left frozen
        // on screen (looks like a stray pixel after a two-finger pan).
        const prev = actionRef.current;
        actionRef.current = null;
        if (prev && prev.type === 'marquee') eng.hideMarquee();
        if (prev && prev.type === 'draw') setDraft(null);
        rootState('panning', false);
        eng.freezeView();
        const m = pinchMetrics();
        pinch = { dist: m.dist, cx: m.cx, cy: m.cy };
      }
    };
    const onTouchMove = (e) => {
      if (e.pointerType !== 'touch' || !touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size !== 2 || !pinch) return;
      e.preventDefault();
      const m = pinchMetrics();
      const factor = pinch.dist > 0 ? m.dist / pinch.dist : 1;
      eng.pinchBy(m.cx, m.cy, factor, m.cx - pinch.cx, m.cy - pinch.cy);
      pinch = { dist: m.dist, cx: m.cx, cy: m.cy };
    };
    const onTouchUp = (e) => {
      if (!touches.has(e.pointerId)) return;
      touches.delete(e.pointerId);
      if (touches.size < 2) pinch = null;
    };

    // Gesture tracking stays on window so drags continue off-viewport. The wheel
    // is bound to the canvas root (not just the viewport) so it also fires over
    // screen-space chrome like frame labels, while scrolling elsewhere on the
    // host page is never hijacked; keys are on window but gated by
    // pointer-inside (above).
    // Track engagement: a pointerdown inside this canvas makes it "active" (so
    // keyboard shortcuts keep working once the cursor moves off the board);
    // clicking anywhere else on the host page releases it.
    const onDocDown = (e) => {
      const inside = !!(rootRef.current && rootRef.current.contains(e.target));
      activeInsideRef.current = inside;
      // The board loses focus → relock an unlocked (engaged) board, whether it
      // was unlocked via the cooperative lock button or the click-to-interact
      // overlay. A press on the board's own lock button counts as inside.
      if (engagedRef.current && !inside) setEngaged(false);
    };

    // Scrolling the host page relocks an unlocked board. Guard on the scroll
    // target being the document itself so scrolling an inner card (e.g. a code
    // block) while engaged doesn't relock.
    const onDocScroll = (e) => {
      // A scroll during a click-to-interact overlay press means the finger was
      // scrolling, not tapping — flag the in-progress gesture so pointerup won't
      // engage. Runs for scrolls of any element (capture phase), so it works
      // whether the host scrolls the window or a container.
      if (lockTapRef.current) lockTapRef.current.scrolled = true;
      if (!engagedRef.current) return;
      const t = e.target;
      if (t === document || t === document.documentElement || t === document.body) setEngaged(false);
    };

    const vp = rootRef.current;
    window.addEventListener('pointerdown', onDocDown, true);
    window.addEventListener('scroll', onDocScroll, true);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    // Finalize (and clear actionRef) if the OS/browser cancels the gesture — e.g.
    // a native scroller stealing the touch — so a canceled pan can't leave the
    // board stuck mid-drag.
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('pointerdown', onTouchDown);
    window.addEventListener('pointermove', onTouchMove, { passive: false });
    window.addEventListener('pointerup', onTouchUp);
    window.addEventListener('pointercancel', onTouchUp);
    (vp || window).addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('pointerdown', onDocDown, true);
      window.removeEventListener('scroll', onDocScroll, true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('pointerdown', onTouchDown);
      window.removeEventListener('pointermove', onTouchMove);
      window.removeEventListener('pointerup', onTouchUp);
      window.removeEventListener('pointercancel', onTouchUp);
      (vp || window).removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('paste', onPaste);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Full-bleed (`fullscreenButton="document"`): the board must cover the whole
     document viewport, but `position: fixed` resolves against the nearest
     transformed/filtered/contained ancestor — and a host page often has one
     (an animated section, a scroll-reveal wrapper…), which would trap the
     overlay inside that box. So while full-bleed we relocate the board to
     <body>, escaping every such ancestor.

     To relocate WITHOUT remounting (which would reload live iframes, restart
     videos and reset the camera), we borrow the reverse-portal trick: the board
     always renders into ONE stable container node, and we move that container in
     the DOM between an in-place holder and <body>. React never sees the
     container change, so it only ever moves the existing DOM — refs and state
     survive. */
  // Only opt into the portal indirection when document-mode full-bleed is
  // enabled — every other board renders in place exactly as before.
  const documentFs = fullscreenButton === 'document';
  const holderRef = useRef(null);
  const [portalNode] = useState(() => {
    if (typeof document === 'undefined') return null; // SSR guard (component is client-only)
    const d = document.createElement('div');
    d.style.display = 'contents'; // generates no box, so the board sizes to whichever parent hosts it
    return d;
  });
  // Move the stable container into the right parent (before paint, so no flash),
  // and lock the page behind the overlay from scrolling while full-bleed.
  useLayoutEffect(() => {
    if (!documentFs || !portalNode) return;
    const parent = fullBleed ? document.body : holderRef.current;
    if (parent && portalNode.parentNode !== parent) parent.appendChild(portalNode);
    if (!fullBleed) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [documentFs, fullBleed, portalNode]);
  // Detach the container on unmount so it isn't orphaned in <body>.
  useEffect(() => () => { if (portalNode) portalNode.remove(); }, [portalNode]);

  const root = (
    <div
      className={cx('canvas-root', classNames?.root)}
      ref={rootRef}
      data-fit={fit}
      data-cv-fullbleed={fullBleed ? '' : undefined}
      data-coop={coopView && !engaged ? '' : undefined}
      data-engaged={CLICK_TO_INTERACT && engaged ? '' : undefined}
      data-cv-accent={accent ? accentId : undefined}
      data-cv-bg={bgColor ? 'custom' : undefined}
      data-cv-grid={gridHidden ? 'off' : undefined}
      style={bgStyle}
      onPointerEnter={() => { hoverInsideRef.current = true; }}
      onPointerLeave={() => { hoverInsideRef.current = false; }}
    >
      {accentCss && <style dangerouslySetInnerHTML={{ __html: accentCss }} />}
      <div className={cx('cv-viewport', classNames?.canvas)} data-cv-part="canvas" ref={viewportRef} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick} onContextMenu={onContextMenu} onDragOver={onDragOver} onDrop={onDrop}>
        <World />
      </div>
      <Chrome />
      {ui && (
        <>
          {TopBar && <TopBar />}
          {EDITABLE && Toolbar && <Toolbar />}
          {EDITABLE && Recorder && <Recorder />}
          {ZoomControls && <ZoomControls />}
          {ContextMenu && <ContextMenu />}
          {SaveStatus && <SaveStatus />}
        </>
      )}
      {Lightbox && <Lightbox />}
      {coopView && (
        /* Bottom-left lock control: locked = the page scrolls past the board;
           tapping the lock unlocks scroll/one-finger pan (engaged). */
        <div className="cv-lock" data-unlocked={engaged ? '' : undefined}>
          <button
            type="button"
            className="cv-lock-btn"
            onClick={() => setEngaged(!engaged)}
            aria-label={engaged ? 'Disable scroll to pan' : 'Enable scroll to pan'}
            title={engaged ? 'Disable scroll to pan' : 'Enable scroll to pan'}
          >
            {engaged ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            )}
          </button>
          {!engaged && <span ref={msgRef}>{lockMsg}</span>}
        </div>
      )}
      {CLICK_TO_INTERACT && !engaged && !maximized && (
        /* Locked overlay: swallows board gestures and lets one finger scroll the
           page (touch-action set in CSS). A tap unlocks (tracked via the pointer
           handlers so a scroll-past never engages it); the board relocks on
           page-scroll / off-board click / Esc (handled by the window listeners).
           Hidden while maximised — the board owns the screen, so there's nothing
           to scroll past and it should be interactive immediately. */
        <button
          type="button"
          className="cv-interact-lock"
          onPointerDown={onLockDown}
          onPointerUp={onLockUp}
          onPointerCancel={onLockCancel}
          onKeyDown={onLockKey}
        >
          <span>{interactLabel}</span>
        </button>
      )}
    </div>
  );

  // Default: render in place, unchanged. Document-mode: render into the stable
  // `portalNode` (never changes → no remount) whose DOM position the layout
  // effect above moves between `holderRef`'s spot and <body> on toggle.
  if (!documentFs) return root;
  return (
    <>
      <div ref={holderRef} style={{ display: 'contents' }} />
      {portalNode && createPortal(root, portalNode)}
    </>
  );
}
