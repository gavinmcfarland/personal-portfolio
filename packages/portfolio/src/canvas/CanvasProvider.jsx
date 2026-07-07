/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useRef, useState, useEffect } from 'react';
import { STORE, ZOOM, PAN, RASTER, GRID, DRAW_TOOLS, clampScale } from './constants';
import { buildInitialState } from '../data/canvasLayout';
import publishedState from '../data/canvasState.json';

export const EDITABLE = import.meta.env.DEV;
export const HOME_ID = 'home'; // the first page; carries the data-driven portfolio cards

const CanvasContext = createContext(null);
export const useCanvas = () => {
  const c = useContext(CanvasContext);
  if (!c) throw new Error('useCanvas must be used within CanvasProvider');
  return c;
};

const defaultView = () => ({ x: 0, y: 0, scale: 1 });

/* Normalise a persisted (serialised) annotation node back into the live model. */
function normalizeSaved(n) {
  const base = { id: n.id, type: n.type, x: n.x, y: n.y, z: n.z, anchor: !!n.anchor };
  if (n.type === 'frame') return { ...base, w: n.w || 200, h: n.h || 140, name: n.text || 'Section' };
  if (n.type === 'md') return { ...base, w: n.w || 340, text: n.text || '' };
  if (n.type === 'sticky') return { ...base, color: n.color || 'yellow', text: n.text || '' };
  if (n.type === 'image') return { ...base, w: n.w || 200, h: n.h || 150, src: n.src || '', alt: n.alt || '' };
  return { ...base, text: n.text || '' }; // tblock
}

/* Merge a saved node list over the data-derived base for the HOME page: cards
   keep their content but take saved position/z/anchor, while free annotations
   come straight from the snapshot. */
function mergeHomeNodes(base, savedNodes) {
  const savedById = Object.fromEntries(savedNodes.map((n) => [n.id, n]));
  const cards = base.nodes
    .filter((n) => n.type === 'card')
    .map((c) => {
      const s = savedById[c.id];
      return s ? { ...c, x: s.x, y: s.y, z: s.z, anchor: !!s.anchor } : c;
    });
  const others = savedNodes.filter((n) => n.type !== 'card').map(normalizeSaved);
  return [...cards, ...others];
}

/* Expand one persisted page into live page data. The first (home) page re-merges
   the portfolio cards; extra pages are free-form annotation boards. */
function normalizePage(raw, base, isHome) {
  const view = raw.view || defaultView();
  if (isHome) {
    return { name: raw.name || 'Home', view, nodes: mergeHomeNodes(base, raw.nodes || []), shapes: raw.shapes || [] };
  }
  return { name: raw.name || 'Page', view, nodes: (raw.nodes || []).map(normalizeSaved), shapes: raw.shapes || [] };
}

/* Accept either the legacy single-board snapshot ({view,nodes,shapes}) or the
   multi-page shape ({activePage,pages:[…]}) and expand it into live pages. */
function buildFromSaved(base, raw) {
  const rawPages = Array.isArray(raw.pages)
    ? raw.pages
    : [{ id: HOME_ID, name: 'Home', view: raw.view, nodes: raw.nodes, shapes: raw.shapes }];
  const pagesMeta = [];
  const pagesData = {};
  rawPages.forEach((rp, i) => {
    const id = i === 0 ? HOME_ID : rp.id || `pg${i}`;
    const p = normalizePage(rp, base, i === 0);
    pagesMeta.push({ id, name: p.name });
    pagesData[id] = { nodes: p.nodes, shapes: p.shapes, view: p.view };
  });
  const activePageId = raw.activePage && pagesData[raw.activePage] ? raw.activePage : pagesMeta[0].id;
  return { pagesMeta, pagesData, activePageId, brand: base.brand, hadSaved: true };
}

function freshState(base) {
  return {
    pagesMeta: [{ id: HOME_ID, name: 'Home' }],
    pagesData: { [HOME_ID]: { nodes: base.nodes, shapes: base.shapes, view: defaultView() } },
    activePageId: HOME_ID,
    brand: base.brand,
    hadSaved: false,
  };
}

/* Initial board. Priority: dev-only in-progress edits (localStorage) win, then
   the committed published snapshot (applies in dev AND production), then the
   fresh data-file layout with its seed annotations. */
function loadInitial() {
  const base = buildInitialState();
  const usable = (s) => s && (Array.isArray(s.nodes) || Array.isArray(s.pages));

  // Unpublished dev edits take precedence so you can keep iterating.
  if (EDITABLE) {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (usable(saved)) return buildFromSaved(base, saved);
    } catch {
      /* ignore corrupt storage */
    }
  }

  // The published snapshot ships in the bundle and drives the live site.
  if (usable(publishedState)) return buildFromSaved(base, publishedState);

  return freshState(base);
}

export function CanvasProvider({ children }) {
  const init = useMemo(loadInitial, []);
  const active0 = init.pagesData[init.activePageId];

  /* ── React state (discrete data model) ──────────────────────── */
  const [pages, setPages] = useState(init.pagesMeta);       // [{id,name}] — drives the page switcher
  const [activePageId, setActivePageId] = useState(init.activePageId);
  const [nodes, setNodes] = useState(active0.nodes);        // active page's nodes
  const [shapes, setShapes] = useState(active0.shapes);     // active page's shapes
  const [draft, setDraft] = useState(null); // in-progress drawing
  const [tool, setToolState] = useState('select');
  const [selected, setSelectedState] = useState(null); // {kind:'node'|'shape', id}
  const [readOnly, setReadOnlyState] = useState(!EDITABLE);
  const [editingId, setEditingId] = useState(null);
  const [noteColor, setNoteColor] = useState('yellow');
  const [strokeColor, setStrokeColor] = useState('#7C2D91');
  const [hintHidden, setHintHidden] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null); // {x,y,target:{kind,id}}
  const [fullscreenId, setFullscreenId] = useState(null); // image node shown in the lightbox
  const [publishState, setPublishState] = useState('idle'); // idle|saving|done|error
  const publishT = useRef(0);

  /* ── Refs (imperative engine state) ─────────────────────────── */
  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const zoomLabelRef = useRef(null);
  const chromeRef = useRef({ sel: null, del: null, edit: null, rz: null });
  const chrome = chromeRef.current;
  const nodeEls = useRef(new Map()).current; // id → element
  const shapeEls = useRef(new Map()).current; // id → shape svg child (.shape)
  const frameLabelEls = useRef(new Map()).current; // id → label element

  /* Full per-page data for every board. The active page's live data lives in the
     React state above; the others are parked here until switched to. */
  const pageData = useRef(init.pagesData).current;

  const viewRef = useRef({ ...active0.view }).current;
  const targetRef = useRef({ ...active0.view }).current;
  const actionRef = useRef(null);
  const zoomRAF = useRef(0);
  const waTimer = useRef(0);
  const saveT = useRef(0);
  const lastRasterScale = useRef(active0.view.scale || 1);
  const repromotePending = useRef(false);
  const panKey = useRef(false);

  const allNodes = Object.values(init.pagesData).flatMap((p) => p.nodes);
  const allShapes = Object.values(init.pagesData).flatMap((p) => p.shapes);
  const seedZ = [...active0.nodes, ...active0.shapes].map((o) => o.z).filter((v) => typeof v === 'number');
  const zTop = useRef(seedZ.length ? Math.max(...seedZ) : 0);
  const zBot = useRef(seedZ.length ? Math.min(0, ...seedZ) : 0);
  // Seed id counters across ALL pages so generated ids never collide after reload.
  const nodeSeq = useRef(
    Math.max(0, ...allNodes.map((n) => { const m = /^n(\d+)-/.exec(String(n.id)); return m ? +m[1] : 0; }))
  );
  const shapeSeq = useRef(
    Math.max(0, ...allShapes.map((s) => parseInt(String(s.id).replace(/\D/g, ''), 10) || 0))
  );
  const pageSeq = useRef(
    Math.max(0, ...init.pagesMeta.map((p) => parseInt(String(p.id).replace(/\D/g, ''), 10) || 0))
  );

  /* Live snapshot of state for the imperative gesture handlers. Written during
     render so window listeners always read current values without re-binding. */
  const S = useRef({}).current;
  S.tool = tool;
  S.readOnly = readOnly;
  S.selected = selected;
  S.editingId = editingId;
  S.noteColor = noteColor;
  S.strokeColor = strokeColor;
  S.nodes = nodes;
  S.shapes = shapes;
  S.fullscreenId = fullscreenId;
  S.pages = pages;
  S.activePageId = activePageId;

  /* ── Engine (defined once; reads fresh state via refs/S) ─────── */
  const eng = useMemo(() => {
    const nextZ = () => ++zTop.current;
    const backZ = () => --zBot.current;

    function applyView() {
      const w = worldRef.current, vp = viewportRef.current;
      if (!w || !vp) return;
      w.style.transform = `translate(${viewRef.x}px,${viewRef.y}px) scale(${viewRef.scale})`;
      const step = GRID * viewRef.scale;
      vp.style.setProperty('--gx', (viewRef.x % step) + 'px');
      vp.style.setProperty('--gy', (viewRef.y % step) + 'px');
      vp.style.backgroundSize = step + 'px ' + step + 'px';
      if (zoomLabelRef.current) zoomLabelRef.current.textContent = Math.round(viewRef.scale * 100) + '%';
      syncChrome();
      scheduleSave();
    }
    function screenToWorld(sx, sy) {
      const r = viewportRef.current.getBoundingClientRect();
      return { x: (sx - r.left - viewRef.x) / viewRef.scale, y: (sy - r.top - viewRef.y) / viewRef.scale };
    }

    /* smooth zoom glide */
    function markActive() {
      const w = worldRef.current; if (!w) return;
      w.style.willChange = 'transform';
      clearTimeout(waTimer.current);
      waTimer.current = setTimeout(() => { w.style.willChange = 'auto'; }, 280);
    }
    function stopZoomLoop() {
      if (zoomRAF.current) { cancelAnimationFrame(zoomRAF.current); zoomRAF.current = 0; }
      repromotePending.current = false;
      if (worldRef.current) worldRef.current.style.willChange = 'auto';
    }
    function snapView() { viewRef.x = targetRef.x; viewRef.y = targetRef.y; viewRef.scale = targetRef.scale; applyView(); }
    function zoomLoop() {
      const w = worldRef.current; if (!w) return;
      const L = ZOOM.lerp;
      viewRef.scale += (targetRef.scale - viewRef.scale) * L;
      viewRef.x += (targetRef.x - viewRef.x) * L;
      viewRef.y += (targetRef.y - viewRef.y) * L;
      const done = Math.abs(targetRef.scale - viewRef.scale) < ZOOM.doneScale &&
        Math.abs(targetRef.x - viewRef.x) < ZOOM.donePan && Math.abs(targetRef.y - viewRef.y) < ZOOM.donePan;
      if (done) { snapView(); stopZoomLoop(); return; }
      if (repromotePending.current) { w.style.willChange = 'transform'; repromotePending.current = false; }
      applyView();
      const blur = Math.max(viewRef.scale / lastRasterScale.current, lastRasterScale.current / viewRef.scale);
      if (blur >= RASTER.blur) { w.style.willChange = 'auto'; lastRasterScale.current = viewRef.scale; repromotePending.current = true; }
      else if (!repromotePending.current) { w.style.willChange = 'transform'; }
      zoomRAF.current = requestAnimationFrame(zoomLoop);
    }
    function startZoomLoop() {
      clearTimeout(waTimer.current);
      if (worldRef.current) worldRef.current.style.willChange = 'transform';
      lastRasterScale.current = viewRef.scale; repromotePending.current = false;
      if (!zoomRAF.current) zoomRAF.current = requestAnimationFrame(zoomLoop);
    }
    function freezeView() { stopZoomLoop(); targetRef.x = viewRef.x; targetRef.y = viewRef.y; targetRef.scale = viewRef.scale; }
    function zoomAt(sx, sy, factor) {
      const r = viewportRef.current.getBoundingClientRect(), px = sx - r.left, py = sy - r.top;
      const old = targetRef.scale, ns = clampScale(old * factor); if (ns === old) return;
      const k = ns / old;
      targetRef.x = px * (1 - k) + targetRef.x * k; targetRef.y = py * (1 - k) + targetRef.y * k; targetRef.scale = ns;
      startZoomLoop();
    }
    function zoomTo(scale, sx, sy) {
      const r = viewportRef.current.getBoundingClientRect();
      const px = (sx == null ? innerWidth / 2 : sx) - r.left, py = (sy == null ? innerHeight / 2 : sy) - r.top;
      const old = targetRef.scale, ns = clampScale(scale), k = ns / old;
      targetRef.x = px * (1 - k) + targetRef.x * k; targetRef.y = py * (1 - k) + targetRef.y * k; targetRef.scale = ns;
      startZoomLoop();
    }
    function panBy(dx, dy) { viewRef.x += dx; viewRef.y += dy; targetRef.x += dx; targetRef.y += dy; applyView(); markActive(); }

    /* ── Chrome (screen-space selection UI) ───────────────────── */
    function worldRectOf(sel) {
      if (sel.kind === 'node') {
        const n = nodeEls.get(sel.id); if (!n) return null;
        return [+n.dataset.x, +n.dataset.y, n.offsetWidth, n.offsetHeight];
      }
      const el = shapeEls.get(sel.id); if (!el) return null;
      const bb = el.getBBox(); return [bb.x, bb.y, bb.width, bb.height];
    }
    function hideSelChrome() {
      for (const k of ['sel', 'del', 'edit', 'rz']) if (chrome[k]) chrome[k].style.display = 'none';
    }
    function placeSel(x, y, w, h) {
      const s = viewRef.scale, sx = viewRef.x + x * s, sy = viewRef.y + y * s, sw = w * s, sh = h * s;
      chrome.sel.style.display = 'block';
      chrome.sel.style.left = (sx - 3) + 'px'; chrome.sel.style.top = (sy - 3) + 'px';
      chrome.sel.style.width = (sw + 6) + 'px'; chrome.sel.style.height = (sh + 6) + 'px';
      const nodeEl = S.selected && S.selected.kind === 'node' ? nodeEls.get(S.selected.id) : null;
      const type = nodeEl ? nodeEl.dataset.type : null;
      const editing = type && S.editingId === S.selected.id;
      chrome.del.style.display = editing ? 'none' : 'flex';
      chrome.del.style.left = (sx + sw - 11) + 'px'; chrome.del.style.top = (sy - 11) + 'px';
      if (type === 'md' && !editing) {
        chrome.edit.style.display = 'flex'; chrome.edit.style.left = (sx + sw - 11 - 26) + 'px'; chrome.edit.style.top = (sy - 11) + 'px';
      } else chrome.edit.style.display = 'none';
      if ((type === 'frame' || type === 'md' || type === 'image') && !editing) {
        chrome.rz.style.display = 'block'; chrome.rz.style.left = (sx + sw - 7) + 'px'; chrome.rz.style.top = (sy + sh - 7) + 'px';
        chrome.rz.style.cursor = type === 'md' ? 'ew-resize' : 'nwse-resize';
      } else chrome.rz.style.display = 'none';
    }
    function syncChrome() {
      const s = viewRef.scale;
      frameLabelEls.forEach((label, id) => {
        const f = nodeEls.get(id); if (!f) return;
        label.style.left = (viewRef.x + +f.dataset.x * s) + 'px';
        label.style.top = (viewRef.y + +f.dataset.y * s - 28) + 'px';
      });
      if (!S.selected || !chrome.sel) { hideSelChrome(); return; }
      const rect = worldRectOf(S.selected);
      if (!rect) { hideSelChrome(); return; }
      placeSel(rect[0], rect[1], rect[2], rect[3]);
    }

    /* ── Selection ────────────────────────────────────────────── */
    function selectNode(id) { setSelectedState({ kind: 'node', id }); }
    function selectShape(id) { setSelectedState({ kind: 'shape', id }); }
    function deselect() { setSelectedState(null); }

    /* ── Node / shape mutations ───────────────────────────────── */
    function newId(type) { return `n${++nodeSeq.current}-${type}`; }
    function newShapeId() { return 's' + ++shapeSeq.current; }
    function addNode(node) {
      const z = node.z != null ? node.z : nextZ();
      const full = { anchor: false, ...node, z };
      setNodes((ns) => [...ns, full]);
      return full;
    }
    function updateNode(id, patch) { setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n))); }
    function removeNode(id) {
      nodeEls.delete(id); frameLabelEls.delete(id);
      setNodes((ns) => ns.filter((n) => n.id !== id));
    }
    function addShape(shape) {
      const z = shape.z != null ? shape.z : nextZ();
      setShapes((ss) => [...ss, { ...shape, z }]);
    }
    function updateShape(id, patch) { setShapes((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s))); }
    function removeShape(id) { shapeEls.delete(id); setShapes((ss) => ss.filter((s) => s.id !== id)); }

    function setZ(target, z) {
      if (target.kind === 'node') updateNode(target.id, { z });
      else updateShape(target.id, { z });
    }
    function bringFront(target) { setZ(target, nextZ()); }
    function sendBack(target) { setZ(target, backZ()); }
    function toggleAnchor(id) {
      const n = S.nodes.find((x) => x.id === id); if (!n) return;
      updateNode(id, { anchor: !n.anchor });
    }
    function deleteSelected() {
      if (!S.selected) return;
      if (S.selected.kind === 'node') removeNode(S.selected.id);
      else removeShape(S.selected.id);
      deselect();
    }
    function deleteTarget(target) {
      if (target.kind === 'node') removeNode(target.id);
      else removeShape(target.id);
      deselect();
    }

    /* ── Tools / mode ─────────────────────────────────────────── */
    function setTool(t) { setToolState(t); deselect(); }
    function setMode(ro) {
      setReadOnlyState(ro);
      if (ro) { deselect(); setCtxMenu(null); setToolState((t) => (t === 'select' || t === 'hand' ? t : 'select')); }
      if (EDITABLE) localStorage.setItem(STORE + '-mode', ro ? 'view' : 'edit');
    }

    /* ── Fit / fly-to ─────────────────────────────────────────── */
    function bounds() {
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, any = false;
      nodeEls.forEach((n) => {
        any = true;
        const x = +n.dataset.x, y = +n.dataset.y, w = n.offsetWidth, h = n.offsetHeight;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
      });
      S.shapes.forEach((s) => {
        any = true;
        const xs = s.type === 'pen' ? s.points.map((p) => p[0]) : [s.x1, s.x2];
        const ys = s.type === 'pen' ? s.points.map((p) => p[1]) : [s.y1, s.y2];
        minX = Math.min(minX, ...xs); maxX = Math.max(maxX, ...xs); minY = Math.min(minY, ...ys); maxY = Math.max(maxY, ...ys);
      });
      return any ? { minX, minY, maxX, maxY } : null;
    }
    function fitAll(animate = true) {
      const b = bounds(); if (!b) return;
      const pad = 90, bw = b.maxX - b.minX + pad * 2, bh = b.maxY - b.minY + pad * 2;
      const s = clampScale(Math.min(innerWidth / bw, innerHeight / bh));
      targetRef.scale = s;
      targetRef.x = (innerWidth - (b.maxX + b.minX) * s) / 2;
      targetRef.y = (innerHeight - (b.maxY + b.minY) * s) / 2;
      if (animate) startZoomLoop(); else snapView();
    }
    function flyTo(id) {
      const el = nodeEls.get(id); if (!el) return;
      const x = +el.dataset.x, y = +el.dataset.y, w = el.offsetWidth, h = el.offsetHeight;
      const pad = 90;
      const s = clampScale(Math.min(innerWidth / (w + pad * 2), innerHeight / (h + pad * 2)));
      targetRef.scale = s; targetRef.x = innerWidth / 2 - (x + w / 2) * s; targetRef.y = innerHeight / 2 - (y + h / 2) * s;
      startZoomLoop();
    }

    /* ── Persistence ──────────────────────────────────────────── */
    function serializeNode(n) {
      const o = { id: n.id, type: n.type, x: +n.x, y: +n.y, z: n.z };
      if (n.anchor) o.anchor = 1;
      if (n.type === 'sticky') { o.color = n.color; o.text = n.text; }
      else if (n.type === 'tblock') { o.text = n.text; }
      else if (n.type === 'frame') { o.w = n.w; o.h = n.h; o.text = n.name; }
      else if (n.type === 'md') { o.w = n.w; o.text = n.text; }
      else if (n.type === 'image') { o.w = n.w; o.h = n.h; o.src = n.src; if (n.alt) o.alt = n.alt; }
      return o;
    }
    function serializeShape(s) {
      const o = { id: s.id, type: s.type, stroke: s.stroke, width: s.width, z: s.z };
      if (s.type === 'pen') o.points = s.points; else { o.x1 = s.x1; o.y1 = s.y1; o.x2 = s.x2; o.y2 = s.y2; }
      return o;
    }
    /* Copy the live active-page data back into pageData so a serialise sees it. */
    function snapshotActive() {
      pageData[S.activePageId] = {
        nodes: S.nodes,
        shapes: S.shapes,
        view: { x: viewRef.x, y: viewRef.y, scale: viewRef.scale },
      };
    }
    /* Serialise every page into the compact multi-page snapshot shared by the dev
       localStorage autosave and the committed canvasState.json. */
    function serialize() {
      snapshotActive();
      const out = S.pages.map((meta) => {
        const d = pageData[meta.id] || { nodes: [], shapes: [], view: defaultView() };
        return {
          id: meta.id,
          name: meta.name,
          view: d.view,
          nodes: d.nodes.map(serializeNode),
          shapes: d.shapes.map(serializeShape),
        };
      });
      return { version: 2, activePage: S.activePageId, pages: out };
    }
    function scheduleSave() { if (!EDITABLE) return; clearTimeout(saveT.current); saveT.current = setTimeout(saveNow, 400); }
    function saveNow() {
      if (!EDITABLE) return;
      localStorage.setItem(STORE, JSON.stringify(serialize()));
    }
    /* Bake the current board into the committed data file via the dev-server
       endpoint, so `git commit` + deploy makes it the live portfolio. */
    async function publish() {
      if (!EDITABLE) return;
      clearTimeout(publishT.current);
      setPublishState('saving');
      try {
        const res = await fetch('/__canvas/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(serialize()),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out.ok) throw new Error(out.error || `HTTP ${res.status}`);
        setPublishState('done');
      } catch (err) {
        console.error('[canvas] publish failed', err);
        setPublishState('error');
      }
      publishT.current = setTimeout(() => setPublishState('idle'), 2200);
    }
    function resetBoard() {
      if (!EDITABLE) return;
      localStorage.removeItem(STORE); location.reload();
    }

    /* ── Pages (separate boards) ──────────────────────────────── */
    function reseedZ(page) {
      const zs = [...page.nodes, ...page.shapes].map((o) => o.z).filter((v) => typeof v === 'number');
      zTop.current = zs.length ? Math.max(...zs) : 0;
      zBot.current = zs.length ? Math.min(0, ...zs) : 0;
    }
    /* Park the active page, load another one's nodes/shapes/view. Works in view
       mode too — this is how the reader flips between boards. */
    function switchPage(id) {
      if (!pageData[id] || id === S.activePageId) return;
      freezeView();
      snapshotActive();
      const t = pageData[id];
      deselect(); setEditingId(null); setCtxMenu(null); setFullscreenId(null);
      setNodes(t.nodes); setShapes(t.shapes);
      viewRef.x = t.view.x; viewRef.y = t.view.y; viewRef.scale = t.view.scale;
      targetRef.x = viewRef.x; targetRef.y = viewRef.y; targetRef.scale = viewRef.scale;
      setActivePageId(id);
      reseedZ(t);
      applyView();
    }
    function newPageId() { return 'pg' + ++pageSeq.current; }
    function addPage(name) {
      if (!EDITABLE) return;
      const id = newPageId();
      // A blank board with world-origin roughly centred on screen.
      const view = { x: Math.round(innerWidth / 2), y: Math.round(innerHeight / 2), scale: 1 };
      pageData[id] = { nodes: [], shapes: [], view };
      const label = (name && name.trim()) || `Page ${S.pages.length + 1}`;
      setPages((ps) => [...ps, { id, name: label }]);
      switchPage(id);
    }
    function renamePage(id, name) {
      const v = (name || '').trim();
      if (!v) return;
      setPages((ps) => ps.map((p) => (p.id === id ? { ...p, name: v } : p)));
    }
    function removePage(id) {
      if (!EDITABLE || id === HOME_ID) return; // the home board (portfolio cards) is permanent
      const remaining = S.pages.filter((p) => p.id !== id);
      if (!remaining.length) return;
      if (S.activePageId === id) switchPage(remaining[0].id);
      delete pageData[id];
      setPages((ps) => ps.filter((p) => p.id !== id));
    }

    /* ── Dropped images ───────────────────────────────────────── */
    const readDataUrl = (file) => new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
    const measure = (src) => new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve({ w: im.naturalWidth || 200, h: im.naturalHeight || 150 });
      im.onerror = () => reject(new Error('could not decode image'));
      im.src = src;
    });
    /* Read the file, persist it as a committed asset via the dev endpoint, then
       drop an image node (centred on the cursor, scaled to a sane default). */
    async function addImageFromFile(file, wx, wy) {
      if (!EDITABLE || !file || !file.type.startsWith('image/')) return;
      try {
        const dataUrl = await readDataUrl(file);
        const nat = await measure(dataUrl);
        const res = await fetch('/__canvas/asset', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dataUrl }),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out.ok) throw new Error(out.error || `HTTP ${res.status}`);
        const MAX = 360;
        const k = nat.w > MAX || nat.h > MAX ? MAX / Math.max(nat.w, nat.h) : 1;
        const w = Math.round(nat.w * k), h = Math.round(nat.h * k);
        const n = addNode({ id: newId('image'), type: 'image', x: wx - w / 2, y: wy - h / 2, w, h, src: out.url, alt: file.name || '' });
        setToolState('select'); selectNode(n.id);
      } catch (err) {
        console.error('[canvas] image drop failed', err);
      }
    }

    /* ── Image lightbox (full-screen viewing) ─────────────────── */
    function openFullscreen(id) {
      const n = S.nodes.find((x) => x.id === id);
      if (n && n.type === 'image') setFullscreenId(id);
    }
    function closeFullscreen() { setFullscreenId(null); }

    /* ── Editing text nodes ───────────────────────────────────── */
    function startEditing(id) { setEditingId(id); }
    function stopEditing() { setEditingId(null); }

    /* Chrome elements register themselves here (avoids mutating context). */
    function setChrome(name, el) { chromeRef.current[name] = el; }

    return {
      viewRef, targetRef, applyView, screenToWorld, freezeView,
      zoomAt, zoomTo, panBy, markActive, startZoomLoop, snapView, syncChrome, hideSelChrome, placeSel,
      selectNode, selectShape, deselect,
      newId, newShapeId, addNode, updateNode, removeNode, addShape, updateShape, removeShape,
      bringFront, sendBack, toggleAnchor, deleteSelected, deleteTarget,
      setTool, setMode, fitAll, flyTo, scheduleSave, saveNow, serialize, publish, resetBoard,
      switchPage, addPage, renamePage, removePage,
      addImageFromFile, openFullscreen, closeFullscreen, startEditing, stopEditing, setChrome,
      nextZ, backZ,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Body classes (tool / mode) ─────────────────────────────── */
  useEffect(() => {
    const b = document.body;
    [...b.classList].forEach((c) => { if (c.startsWith('tool-')) b.classList.remove(c); });
    b.classList.add('tool-' + tool);
    b.classList.toggle('read-only', readOnly);
  }, [tool, readOnly]);

  /* ── Keep chrome + persistence in sync with the model ───────── */
  useEffect(() => { eng.syncChrome(); eng.scheduleSave(); }, [nodes, shapes, selected, editingId, pages, activePageId, eng]);

  /* ── Boot: apply the initial view (fit if nothing was saved) ── */
  useEffect(() => {
    eng.applyView();
    if (!init.hadSaved) {
      const id = requestAnimationFrame(() => { eng.fitAll(false); eng.saveNow(); });
      return () => cancelAnimationFrame(id);
    }
    if (EDITABLE && localStorage.getItem(STORE + '-mode') === 'view') setReadOnlyState(true);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => eng.syncChrome();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [eng]);

  const value = {
    // state
    nodes, shapes, draft, tool, selected, readOnly, editingId, noteColor, strokeColor, hintHidden, ctxMenu,
    publishState, fullscreenId, pages, activePageId,
    brand: init.brand, EDITABLE,
    // setters used by UI
    setDraft, setNoteColor, setStrokeColor, setHintHidden, setCtxMenu, setSelectedState,
    // refs
    viewportRef, worldRef, zoomLabelRef, nodeEls, shapeEls, frameLabelEls, actionRef, panKey, S,
    // engine
    eng,
  };

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}
