import { useEffect, useId } from 'react';
import { useCanvas } from './CanvasProvider';
import { ZOOM, PAN, DRAW_TOOLS, FILLABLE_SHAPES } from './constants';
import World from './World';
import Chrome from './Chrome';
import TopBar from './ui/TopBar';
import Toolbar from './ui/Toolbar';
import ZoomControls from './ui/ZoomControls';
import ContextMenu from './ui/ContextMenu';
import SaveStatus from './ui/SaveStatus';
import Recorder from './ui/Recorder';
import Lightbox from './ui/Lightbox';

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
    rules.push(`${sel}{--accent:${light};--cur-edit:${c.edit};--cur-edit-hover:${c.hover};}`);
  }
  if (dark) {
    const c = editCursor(dark, '#0C0C0E');
    rules.push(`.dark ${sel},${sel}.dark{--accent:${dark};--cur-edit:${c.edit};--cur-edit-hover:${c.hover};}`);
  }
  return rules.join('');
}

export default function Canvas() {
  const ctx = useCanvas();
  const { rootRef, hoverInsideRef, activeInsideRef, viewportRef, eng, actionRef, S, nodeEls, shapeEls, panKey, setDraft, setCtxMenu, EDITABLE, fit, ui, bgColor, accent } = ctx;

  /* A chosen board colour is exposed as `--bg-pick`; canvas.css blends it a
     short way into the base (`--bg-base`) the way a shape fill composites over
     the board, so the same value reads soft in light mode and dark-tinted (no
     light hue) in dark mode. See the `[data-cv-bg="custom"]` rule. */
  const bgStyle = bgColor ? { '--bg-pick': bgColor } : undefined;

  /* Per-instance accent override. A unique attribute scopes the injected rules to
     this board so several canvases with different accents can share a page. */
  const accentId = useId().replace(/:/g, '');
  const accentCss = accent ? buildAccentCss(`.canvas-root[data-cv-accent="${accentId}"]`, accent) : '';

  /* Toggle a state class on the scoped root (not document.body) so multiple
     canvases stay independent and nothing leaks onto the host page. */
  const rootClass = (name, on) => { const el = rootRef.current; if (el) el.classList.toggle(name, on); };

  /* Pointerdown is a React handler (correct simulated bubbling so chrome / node
     handlers can stopPropagation). Move/up are native window listeners so
     gestures keep tracking off-viewport; wheel/keys are scoped to this canvas. */
  const onPointerDown = (e) => {
    if (e.button === 2) return;
    const vp = viewportRef.current;

    if (S.readOnly) {
      // Only genuine interactive controls (in read-only, just the code card's
      // copy button) swallow the gesture so a tap operates them. Everything else —
      // crucially link cards, which are a full <a> — still starts a pan; a
      // stationary tap opens the link (handled in onUp), mirroring how an image
      // tap opens full-screen. Bailing on <a> here left link (and code button)
      // cards un-pannable on touch, where cards fill the screen and there's little
      // bare board to grab.
      if (e.target.closest && e.target.closest('button, select')) return;
      eng.freezeView();
      // Remember media / links under the pointer so a stationary tap opens them.
      const imgEl = e.target.closest && e.target.closest('.node.image,.node.video');
      const linkEl = e.target.closest && e.target.closest('.node.link');
      actionRef.current = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: eng.viewRef.x, oy: eng.viewRef.y, imgId: imgEl ? imgEl.dataset.id : null, linkId: linkEl ? linkEl.dataset.id : null };
      rootClass('panning', true);
      vp.setPointerCapture(e.pointerId);
      return;
    }

    if (S.editingId) {
      const editingEl = nodeEls.get(S.editingId);
      if (editingEl && editingEl.contains(e.target)) return; // let text editing work
    }
    eng.freezeView();

    const nodeEl = e.target.closest('.node');
    const shapeEl = e.target.closest('.shape');
    const spacePan = e.button === 1 || panKey.current;
    const tool = S.tool;

    if (spacePan || tool === 'hand') {
      actionRef.current = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: eng.viewRef.x, oy: eng.viewRef.y };
      rootClass('panning', true);
      vp.setPointerCapture(e.pointerId);
      return;
    }
    if (tool === 'select' && (nodeEl || shapeEl)) {
      const kind = nodeEl ? 'node' : 'shape';
      const id = (nodeEl || shapeEl).dataset.id;
      // Shift-click adds/removes the object from the selection without dragging.
      if (e.shiftKey) { eng.toggleSelect(kind, id); return; }
      // Grabbing an object inside a multi-selection drags the whole group;
      // anything else collapses the selection to the grabbed object.
      const items = eng.moveItemsFor({ kind, id });
      if (!eng.isSelected(kind, id)) (kind === 'node' ? eng.selectNode : eng.selectShape)(id);
      if (nodeEl) { nodeEl.dataset.moved = ''; nodeEl.classList.add('dragging'); }
      // A stationary click on a link card opens it (a drag still just moves it);
      // remembered here, acted on in onUp when the gesture turns out not to move.
      const linkId = nodeEl && nodeEl.dataset.type === 'link' ? id : null;
      // Alt-drag leaves the originals in place and drops a copy at the release point.
      actionRef.current = { type: 'move', sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, items, clickItem: { kind, id }, dup: e.altKey && !S.readOnly, linkId };
      vp.setPointerCapture(e.pointerId);
      return;
    }
    if (tool === 'select') {
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
  const onDrop = (e) => {
    if (!dropActive() || !e.dataTransfer) return;
    const w = eng.screenToWorld(e.clientX, e.clientY);
    const media = Array.from(e.dataTransfer.files || []).filter((f) => eng.isImageFile(f) || eng.isVideoFile(f) || eng.isAudioFile(f));
    if (media.length) {
      e.preventDefault();
      media.forEach((file, i) => {
        const add = eng.isVideoFile(file) ? eng.addVideoFromFile : eng.isAudioFile(file) ? eng.addAudioFromFile : eng.addImageFromFile;
        add(file, w.x + i * 24, w.y + i * 24);
      });
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
    const nodeEl = el && el.closest && el.closest('.node');
    if (!nodeEl) return;
    const type = nodeEl.dataset.type;
    const id = nodeEl.dataset.id;
    if (type === 'image' || type === 'video') { eng.openFullscreen(id); return; }
    if (type === 'link') { eng.openLink(id); return; }
    if (type !== 'sticky' && type !== 'tblock' && type !== 'md' && type !== 'code' && type !== 'sound') return;
    eng.setTool('select'); eng.selectNode(id); eng.startEditing(id);
  };

  const onContextMenu = (e) => {
    if (S.readOnly) return;
    e.preventDefault();
    const nodeEl = e.target.closest('.node');
    const shapeEl = e.target.closest('.shape');
    if (!nodeEl && !shapeEl) { setCtxMenu(null); return; }
    const kind = nodeEl ? 'node' : 'shape';
    const id = (nodeEl || shapeEl).dataset.id;
    // Right-clicking inside a multi-selection keeps it and targets the group.
    const inMulti = S.selected.length > 1 && eng.isSelected(kind, id);
    if (!inMulti) (kind === 'node' ? eng.selectNode : eng.selectShape)(id);
    setCtxMenu({ x: e.clientX, y: e.clientY, target: inMulti ? { kind: 'multi' } : { kind, id } });
  };

  /* Native window listeners: move / up / wheel / keyboard. */
  useEffect(() => {
    const scale = () => eng.viewRef.scale;

    const onMove = (e) => {
      const a = actionRef.current;
      if (!a) {
        // No gesture in progress → track the node under the cursor for the hover hint.
        const nodeEl = e.target.closest && e.target.closest('.node');
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
        const dx = (e.clientX - a.sx) / scale(), dy = (e.clientY - a.sy) / scale();
        a.dx = dx; a.dy = dy;
        if (Math.abs(dx) + Math.abs(dy) > 2) a.moved = 1;
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
            it.el.style.transform = `translate(${nx}px,${ny}px)`;
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
        // Cmd-drag on a text block scales the font instead of the box width. The
        // scale tracks how far the handle would have stretched the box: font grows
        // in proportion to (ow + dx) / ow, keeping the stored width untouched.
        if (a.mdType === 'tblock' && (e.metaKey || e.ctrlKey)) {
          const dx = (e.clientX - a.sx) / scale();
          const f = Math.max(8, Math.round(a.ofs * (a.ow + dx) / a.ow));
          el.style.fontSize = f + 'px'; a.fontSize = f;
          eng.syncChrome(); return;
        }
        const minW = a.mdType === 'md' ? 160 : a.mdType === 'code' ? 200 : a.mdType === 'tblock' ? 120 : a.mdType === 'link' ? 200 : 60;
        const w = Math.max(minW, a.ow + (e.clientX - a.sx) / scale());
        el.style.width = w + 'px'; el.dataset.w = w; a.w = w;
        if (a.mdType === 'image' || a.mdType === 'video') {
          const h = Math.max(1, Math.round(w * (a.oh / a.ow))); // lock aspect ratio
          el.style.height = h + 'px'; el.dataset.h = h; a.h = h;
        } else if (a.mdType !== 'md' && a.mdType !== 'tblock' && a.mdType !== 'code' && a.mdType !== 'link') {
          const h = Math.max(40, a.oh + (e.clientY - a.sy) / scale());
          el.style.height = h + 'px'; el.dataset.h = h; a.h = h;
        }
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
        rootClass('panning', false);
        if (a.imgId && !a.moved) eng.openFullscreen(a.imgId); // tap an image/video → full-screen
        if (a.linkId && !a.moved) eng.openLink(a.linkId);      // tap a link card → open it
      }
      if (a.type === 'move') {
        const nodePatches = {}, shapePatches = {};
        for (const it of a.items) {
          if (it.kind === 'node') {
            it.el.classList.remove('dragging');
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
        const patch = {};
        if (a.w != null) patch.w = a.w;
        if (a.h != null) patch.h = a.h;
        if (a.fontSize != null) patch.fontSize = a.fontSize;
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
      if (S.fullscreenId) { e.preventDefault(); return; } // lightbox covers the board
      setCtxMenu(null);
      const zoomKey = e.ctrlKey || e.metaKey;
      if (!zoomKey && e.target.closest) {
        if (e.target.closest('.ui.panel')) return;
        // Defer to a textarea only if it can actually scroll — the markdown
        // source editor is overflow:hidden, so the wheel should pan the canvas.
        const ta = e.target.closest('textarea');
        if (ta) {
          const oy = getComputedStyle(ta).overflowY;
          if ((oy === 'auto' || oy === 'scroll') && ta.scrollHeight > ta.clientHeight) return;
        }
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
      if (e.code === 'Space') { panKey.current = true; rootClass('tool-hand', true); return; }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (S.selected.length) { e.preventDefault(); eng.deleteSelected(); }
        return;
      }
      if (e.metaKey || e.ctrlKey) {
        const mk = e.key.toLowerCase();
        if (mk === '0') { e.preventDefault(); eng.zoomTo(1); return; }
        if (mk === 'c') { if (S.selected.length) { e.preventDefault(); eng.copySelected(); } return; }
        // Paste is handled by the native `paste` event (below) so it can also
        // pull image/gif/svg/video off the system clipboard — don't preventDefault
        // here or that event never fires.
        if (mk === 'v') return;
        if (mk === 'd') { if (!S.readOnly && S.selected.length) { e.preventDefault(); eng.duplicateSelected(); } return; }
      }
      const map = S.readOnly
        ? { v: 'select', h: 'hand' }
        : { v: 'select', h: 'hand', n: 'note', t: 'text', m: 'md', c: 'code', p: 'pen', l: 'line', a: 'arrow', r: 'rect', o: 'ellipse', f: 'frame' };
      const k = e.key.toLowerCase();
      if (map[k] && !e.metaKey && !e.ctrlKey) eng.setTool(map[k]);
      // Record is an action, not a placement tool: `S` starts a capture (Esc /
      // the recorder panel stop it), and never fires while already recording.
      if (k === 's' && !e.metaKey && !e.ctrlKey && !S.readOnly && !S.recording) eng.startRecording();
      if (e.key === 'Escape') {
        if (S.recording) eng.cancelRecording();
        eng.deselect(); setCtxMenu(null); eng.stopEditing();
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') { panKey.current = false; if (S.tool !== 'hand') rootClass('tool-hand', false); }
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
    const twoPoints = () => { const [a, b] = [...touches.values()]; return [a, b]; };
    const pinchMetrics = () => {
      const [a, b] = twoPoints();
      return { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    };
    const onTouchDown = (e) => {
      if (e.pointerType !== 'touch') return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        // Drop the single-finger gesture so it can't fight the pinch. onUp would
        // normally clean these up, but nulling actionRef means it bails — so undo
        // the single-finger visuals here or a tiny marquee/draft is left frozen
        // on screen (looks like a stray pixel after a two-finger pan).
        const prev = actionRef.current;
        actionRef.current = null;
        if (prev && prev.type === 'marquee') eng.hideMarquee();
        if (prev && prev.type === 'draw') setDraft(null);
        rootClass('panning', false);
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
      activeInsideRef.current = !!(rootRef.current && rootRef.current.contains(e.target));
    };

    const vp = rootRef.current;
    window.addEventListener('pointerdown', onDocDown, true);
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

  return (
    <div
      className="canvas-root"
      ref={rootRef}
      data-fit={fit}
      data-cv-accent={accent ? accentId : undefined}
      data-cv-bg={bgColor ? 'custom' : undefined}
      style={bgStyle}
      onPointerEnter={() => { hoverInsideRef.current = true; }}
      onPointerLeave={() => { hoverInsideRef.current = false; }}
    >
      {accentCss && <style dangerouslySetInnerHTML={{ __html: accentCss }} />}
      <div className="cv-viewport" ref={viewportRef} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick} onContextMenu={onContextMenu} onDragOver={onDragOver} onDrop={onDrop}>
        <World />
      </div>
      <Chrome />
      {ui && (
        <>
          <TopBar className="ui panel pl-[8px]" />
          {EDITABLE && <Toolbar />}
          {EDITABLE && <Recorder />}
          <ZoomControls />
          <ContextMenu />
          <SaveStatus />
        </>
      )}
      <Lightbox />
    </div>
  );
}
