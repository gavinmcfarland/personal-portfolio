import { useEffect } from 'react';
import { useCanvas } from './CanvasProvider';
import { ZOOM, PAN, DRAW_TOOLS } from './constants';
import World from './World';
import Chrome from './Chrome';
import TopBar from './ui/TopBar';
import Toolbar from './ui/Toolbar';
import ZoomControls from './ui/ZoomControls';
import SectionsNav from './ui/SectionsNav';
import ContextMenu from './ui/ContextMenu';
import Hint from './ui/Hint';

export default function Canvas() {
  const ctx = useCanvas();
  const { viewportRef, eng, actionRef, S, nodeEls, shapeEls, panKey, setDraft, setCtxMenu, EDITABLE } = ctx;

  /* Pointerdown is a React handler (correct simulated bubbling so chrome / node
     handlers can stopPropagation). Move/up/wheel/keys are native window
     listeners so gestures keep tracking off-viewport. */
  const onPointerDown = (e) => {
    if (e.button === 2) return;
    const vp = viewportRef.current;

    if (S.readOnly) {
      if (e.target.closest && e.target.closest('a,button')) return;
      eng.freezeView();
      actionRef.current = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: eng.viewRef.x, oy: eng.viewRef.y };
      document.body.classList.add('panning');
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

    if (spacePan || tool === 'hand' || (tool === 'select' && !nodeEl && !shapeEl)) {
      if (tool === 'select' && !nodeEl && !shapeEl) eng.deselect();
      actionRef.current = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: eng.viewRef.x, oy: eng.viewRef.y };
      document.body.classList.add('panning');
      vp.setPointerCapture(e.pointerId);
      return;
    }
    if (tool === 'select' && nodeEl) {
      const id = nodeEl.dataset.id;
      eng.selectNode(id);
      nodeEl.dataset.moved = '';
      actionRef.current = { type: 'node', id, el: nodeEl, sx: e.clientX, sy: e.clientY, ox: +nodeEl.dataset.x, oy: +nodeEl.dataset.y };
      nodeEl.classList.add('dragging');
      vp.setPointerCapture(e.pointerId);
      return;
    }
    if (tool === 'select' && shapeEl) {
      const id = shapeEl.dataset.id;
      eng.selectShape(id);
      actionRef.current = { type: 'shape', id, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, bb: shapeEl.getBBox() };
      vp.setPointerCapture(e.pointerId);
      return;
    }

    const w = eng.screenToWorld(e.clientX, e.clientY);
    if (tool === 'note') {
      const n = eng.addNode({ id: eng.newId('sticky'), type: 'sticky', x: w.x - 105, y: w.y - 90, color: S.noteColor, text: '' });
      eng.setTool('select'); eng.selectNode(n.id); eng.startEditing(n.id); return;
    }
    if (tool === 'text') {
      const n = eng.addNode({ id: eng.newId('tblock'), type: 'tblock', x: w.x, y: w.y - 18, text: '' });
      eng.setTool('select'); eng.selectNode(n.id); eng.startEditing(n.id); return;
    }
    if (tool === 'md') {
      const n = eng.addNode({ id: eng.newId('md'), type: 'md', x: w.x, y: w.y, w: 340, text: '' });
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
      if (tool === 'pen') s.points = [[w.x, w.y]];
      else { s.x1 = w.x; s.y1 = w.y; s.x2 = w.x; s.y2 = w.y; }
      actionRef.current = { type: 'draw', s };
      setDraft({ ...s });
      vp.setPointerCapture(e.pointerId);
    }
  };

  const onContextMenu = (e) => {
    if (S.readOnly) return;
    e.preventDefault();
    const nodeEl = e.target.closest('.node');
    const shapeEl = e.target.closest('.shape');
    if (nodeEl) {
      const id = nodeEl.dataset.id;
      eng.selectNode(id);
      setCtxMenu({ x: e.clientX, y: e.clientY, target: { kind: 'node', id } });
    } else if (shapeEl) {
      const id = shapeEl.dataset.id;
      eng.selectShape(id);
      setCtxMenu({ x: e.clientX, y: e.clientY, target: { kind: 'shape', id } });
    } else setCtxMenu(null);
  };

  /* Native window listeners: move / up / wheel / keyboard. */
  useEffect(() => {
    const scale = () => eng.viewRef.scale;

    const onMove = (e) => {
      const a = actionRef.current;
      if (!a) return;
      if (a.type === 'pan') {
        eng.viewRef.x = a.ox + (e.clientX - a.sx);
        eng.viewRef.y = a.oy + (e.clientY - a.sy);
        eng.targetRef.x = eng.viewRef.x; eng.targetRef.y = eng.viewRef.y;
        eng.applyView(); eng.markActive(); return;
      }
      if (a.type === 'node') {
        const dx = (e.clientX - a.sx) / scale(), dy = (e.clientY - a.sy) / scale();
        if (Math.abs(dx) + Math.abs(dy) > 2 && a.el) a.el.dataset.moved = '1';
        const nx = a.ox + dx, ny = a.oy + dy;
        const el = a.el || nodeEls.get(a.id);
        if (el) { el.style.transform = `translate(${nx}px,${ny}px)`; el.dataset.x = nx; el.dataset.y = ny; }
        a.nx = nx; a.ny = ny;
        eng.syncChrome(); return;
      }
      if (a.type === 'shape') {
        a.dx = (e.clientX - a.sx) / scale(); a.dy = (e.clientY - a.sy) / scale();
        const el = shapeEls.get(a.id);
        if (el) el.setAttribute('transform', `translate(${a.dx},${a.dy})`);
        eng.placeSel(a.bb.x + a.dx, a.bb.y + a.dy, a.bb.width, a.bb.height); return;
      }
      if (a.type === 'draw') {
        const w = eng.screenToWorld(e.clientX, e.clientY), s = a.s;
        if (s.type === 'pen') s.points.push([w.x, w.y]); else { s.x2 = w.x; s.y2 = w.y; }
        setDraft({ ...s, points: s.points ? [...s.points] : undefined }); return;
      }
      if (a.type === 'resize') {
        const el = nodeEls.get(a.id); if (!el) return;
        const minW = a.mdType === 'md' ? 160 : 60;
        const w = Math.max(minW, a.ow + (e.clientX - a.sx) / scale());
        el.style.width = w + 'px'; el.dataset.w = w; a.w = w;
        if (a.mdType !== 'md') {
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
      if (a.type === 'pan') document.body.classList.remove('panning');
      if (a.type === 'node') {
        const el = a.el || nodeEls.get(a.id);
        if (el) el.classList.remove('dragging');
        if (a.nx != null) eng.updateNode(a.id, { x: a.nx, y: a.ny }); else eng.saveNow();
      }
      if (a.type === 'shape') {
        const el = shapeEls.get(a.id);
        if (el) el.removeAttribute('transform');
        const s = S.shapes.find((x) => x.id === a.id);
        if (s) {
          if (s.type === 'pen') eng.updateShape(a.id, { points: s.points.map((p) => [p[0] + a.dx, p[1] + a.dy]) });
          else eng.updateShape(a.id, { x1: s.x1 + a.dx, y1: s.y1 + a.dy, x2: s.x2 + a.dx, y2: s.y2 + a.dy });
        }
        eng.selectShape(a.id);
      }
      if (a.type === 'draw') {
        const s = a.s;
        const tiny = (s.type === 'pen' && s.points.length < 2) ||
          (s.type !== 'pen' && Math.abs(s.x2 - s.x1) < 4 && Math.abs(s.y2 - s.y1) < 4);
        setDraft(null);
        if (!tiny) eng.addShape(s);
      }
      if (a.type === 'resize') {
        const patch = {};
        if (a.w != null) patch.w = a.w;
        if (a.h != null) patch.h = a.h;
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
      setCtxMenu(null);
      const zoomKey = e.ctrlKey || e.metaKey;
      if (!zoomKey && e.target.closest && e.target.closest('.ui.panel, textarea')) return;
      e.preventDefault();
      if (zoomKey) {
        const d = Math.max(-ZOOM.deltaClamp, Math.min(ZOOM.deltaClamp, e.deltaY));
        eng.zoomAt(e.clientX, e.clientY, Math.exp(-d * ZOOM.sensitivity));
      } else {
        eng.panBy(-e.deltaX * PAN.wheelSpeed, -e.deltaY * PAN.wheelSpeed);
      }
    };

    const onKeyDown = (e) => {
      if (S.editingId) return;
      if (e.code === 'Space') { panKey.current = true; document.body.classList.add('tool-hand'); return; }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (S.selected) { e.preventDefault(); eng.deleteSelected(); }
        return;
      }
      const map = S.readOnly
        ? { v: 'select', h: 'hand' }
        : { v: 'select', h: 'hand', n: 'note', t: 'text', m: 'md', p: 'pen', l: 'line', a: 'arrow', r: 'rect', o: 'ellipse', f: 'frame' };
      const k = e.key.toLowerCase();
      if (map[k] && !e.metaKey && !e.ctrlKey) eng.setTool(map[k]);
      if (e.key === 'Escape') { eng.deselect(); setCtxMenu(null); eng.stopEditing(); }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') { panKey.current = false; if (S.tool !== 'hand') document.body.classList.remove('tool-hand'); }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div id="viewport" ref={viewportRef} onPointerDown={onPointerDown} onContextMenu={onContextMenu}>
        <World />
      </div>
      <Chrome />
      <TopBar />
      <Hint />
      <SectionsNav />
      {EDITABLE && <Toolbar />}
      <ZoomControls />
      <ContextMenu />
    </>
  );
}
