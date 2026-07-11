/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import { ZOOM, PAN, RASTER, GRID, clampScale } from './constants';
import { hasIDB, putMedia, getMedia, listMediaKeys, deleteMedia } from './media-store';

/* Default localStorage key for the dev autosave. Override with the `storageKey`
   prop when embedding more than one editable canvas on a page. */
const DEFAULT_STORE = 'embed-canvas-v1';
const DEFAULT_HOME_ID = 'home'; // id of the first page

/* Edit/view mode is shared across every canvas instance on the page rather than
   stored per-board: toggling one board's mode toggles them all. The mode lives
   under a single global localStorage key, and same-document instances stay in
   sync via a custom event (the native `storage` event only fires cross-tab). */
const GLOBAL_MODE_KEY = 'canvas-global-mode';
const MODE_EVENT = 'canvas:mode';

/* Format-on-type is likewise a single global preference shared by every code
   object on the page (and across tabs), not stored per-node. */
const FORMAT_KEY = 'canvas-format-on-type';
const FORMAT_EVENT = 'canvas:format-on-type';

const CanvasContext = createContext(null);
export const useCanvas = () => {
  const c = useContext(CanvasContext);
  if (!c) throw new Error('useCanvas must be used within CanvasProvider');
  return c;
};

const defaultView = () => ({ x: 0, y: 0, scale: 1 });

/* Normalise a persisted (serialised) annotation node back into the live model. */
/* Recognise an SVG from a node's stored src/alt, so boards saved before the
   `svg` flag existed still render without the photo card chrome. An `idb:` ref
   is opaque here (SVGs rarely exceed the inline threshold anyway), so those fall
   back to a plain image. */
function isSvgSrc(src, alt) {
  if (typeof src === 'string') {
    if (/^data:image\/svg\+xml/i.test(src)) return true;
    if (/\.svg([?#]|$)/i.test(src)) return true;
  }
  return /\.svg$/i.test(alt || '');
}

function normalizeSaved(n) {
  const base = { id: n.id, type: n.type, x: n.x, y: n.y, z: n.z, anchor: !!n.anchor };
  if (n.type === 'frame') return { ...base, w: n.w || 200, h: n.h || 140, name: n.text || 'Section' };
  if (n.type === 'md') return { ...base, w: n.w || 340, text: n.text || '' };
  if (n.type === 'code') return { ...base, w: n.w || 420, text: n.text || '', lang: n.lang || 'js', ...(n.wrap != null ? { wrap: !!n.wrap } : {}) };
  if (n.type === 'sticky') return { ...base, color: n.color || 'yellow', text: n.text || '' };
  if (n.type === 'image') return { ...base, w: n.w || 200, h: n.h || 150, src: n.src || '', alt: n.alt || '', svg: n.svg != null ? !!n.svg : isSvgSrc(n.src, n.alt) };
  if (n.type === 'video') return { ...base, w: n.w || 320, h: n.h || 180, src: n.src || '', alt: n.alt || '' };
  const fs = n.fontSize != null ? { fontSize: n.fontSize } : null; // cmd-drag scaled text
  const ff = n.font ? { font: n.font } : null; // serif | sans | mono | script
  if (n.w != null) return { ...base, w: n.w, text: n.text || '', ...fs, ...ff }; // resized tblock wraps at its width
  return { ...base, text: n.text || '', ...fs, ...ff }; // tblock
}

/* Merge a saved node list over the data-derived base for the home page. Nodes of
   a "managed" type (e.g. the portfolio's data-driven `card`s) keep their content
   from the base but take saved position/z/anchor; everything else comes straight
   from the snapshot. With no managed types this is a plain snapshot restore. */
function mergeBase(base, savedNodes, managedTypes) {
  if (!managedTypes.length) return savedNodes.map(normalizeSaved);
  const savedById = Object.fromEntries(savedNodes.map((n) => [n.id, n]));
  const managed = base.nodes
    .filter((n) => managedTypes.includes(n.type))
    .map((c) => {
      const s = savedById[c.id];
      return s ? { ...c, x: s.x, y: s.y, z: s.z, anchor: !!s.anchor } : c;
    });
  const managedIds = new Set(managed.map((n) => n.id));
  const others = savedNodes.filter((n) => !managedIds.has(n.id)).map(normalizeSaved);
  return [...managed, ...others];
}

/* Expand one persisted page into live page data. The first (home) page re-merges
   the managed base nodes; extra pages are free-form annotation boards. */
function normalizePage(raw, base, isHome, managedTypes) {
  const view = raw.view || defaultView();
  if (isHome) {
    return { name: raw.name || 'Page 1', view, nodes: mergeBase(base, raw.nodes || [], managedTypes), shapes: raw.shapes || [] };
  }
  return { name: raw.name || 'Page', view, nodes: (raw.nodes || []).map(normalizeSaved), shapes: raw.shapes || [] };
}

/* Accept either the legacy single-board snapshot ({view,nodes,shapes}) or the
   multi-page shape ({activePage,pages:[…]}) and expand it into live pages. */
function buildFromSaved(base, raw, homeId, managedTypes) {
  const rawPages = Array.isArray(raw.pages)
    ? raw.pages
    : [{ id: homeId, name: 'Page 1', view: raw.view, nodes: raw.nodes, shapes: raw.shapes }];
  const pagesMeta = [];
  const pagesData = {};
  rawPages.forEach((rp, i) => {
    const id = i === 0 ? homeId : rp.id || `pg${i}`;
    const p = normalizePage(rp, base, i === 0, managedTypes);
    pagesMeta.push({ id, name: p.name });
    pagesData[id] = { nodes: p.nodes, shapes: p.shapes, view: p.view };
  });
  const activePageId = raw.activePage && pagesData[raw.activePage] ? raw.activePage : pagesMeta[0].id;
  const bgColor = typeof raw.bgColor === 'string' ? raw.bgColor : null;
  return { pagesMeta, pagesData, activePageId, bgColor, brand: base.brand, hadSaved: true };
}

function freshState(base, homeId) {
  return {
    pagesMeta: [{ id: homeId, name: 'Page 1' }],
    pagesData: { [homeId]: { nodes: base.nodes, shapes: base.shapes, view: defaultView() } },
    activePageId: homeId,
    bgColor: null,
    brand: base.brand,
    hadSaved: false,
  };
}

/* Resolve the initial board. Priority: editable in-progress edits (localStorage)
   win, then the committed `initialState` snapshot (applies when editable AND
   read-only), then the fresh base layout with its seed content. */
function loadInitial({ base, initialState, editable, storageKey, homeId, managedTypes }) {
  const usable = (s) => s && (Array.isArray(s.nodes) || Array.isArray(s.pages));

  // Unpublished edits take precedence so you can keep iterating in edit mode.
  if (editable) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (usable(saved)) return buildFromSaved(base, saved, homeId, managedTypes);
    } catch {
      /* ignore corrupt storage */
    }
  }

  // The published snapshot ships with the app and drives the live board.
  if (usable(initialState)) return buildFromSaved(base, initialState, homeId, managedTypes);

  return freshState(base, homeId);
}

const EMPTY_BASE = { nodes: [], shapes: [], brand: {} };

export function CanvasProvider({
  children,
  base = EMPTY_BASE,
  managedTypes = [],
  initialState = null,
  editable = false,
  storageKey = DEFAULT_STORE,
  homeId = DEFAULT_HOME_ID,
  nodeTypes = null,
  highlightCode = null, // optional custom code highlighter (src, lang) => html; falls back to the built-in tokeniser
  formatCode = null, // optional code formatter (src, lang, {cursorOffset}) => string | {formatted, cursorOffset}; falls back to the built-in reindenter
  formatOnType: formatOnTypeDefault = true, // initial global default for reformat-on-type (persisted user pref wins)
  onPublish = null,
  onUploadImage = null,
  onUploadVideo = null,
  onChange = null,
  theme = null, // optional { mode, toggle } — renders a theme button in the top bar
  accent = null, // theme/accent colour: a single CSS colour, or { light, dark } per theme (default: purple)
  fit = 'contain', // 'contain' fills the parent box; 'fullscreen' covers the browser viewport
  ui = true, // set false to hide the overlay panels (top bar, toolbar, zoom, context menu)
  initialView = null, // 'fit' frames all content on mount instead of restoring the saved pan/zoom
  saveStatus = true, // show the background-save status indicator (bottom-right) while editing
}) {
  const EDITABLE = editable;
  const HOME_ID = homeId;
  const STORE = storageKey;
  const MEDIA_DB = storageKey + '-media';
  const canPublish = editable && typeof onPublish === 'function';

  const init = useMemo(
    () => loadInitial({ base, initialState, editable, storageKey, homeId, managedTypes }),
    // Config is captured once; changing it requires remounting the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const active0 = init.pagesData[init.activePageId];

  /* ── React state (discrete data model) ──────────────────────── */
  const [pages, setPages] = useState(init.pagesMeta);       // [{id,name}] — drives the page switcher
  const [activePageId, setActivePageId] = useState(init.activePageId);
  const [nodes, setNodes] = useState(active0.nodes);        // active page's nodes
  const [shapes, setShapes] = useState(active0.shapes);     // active page's shapes
  const [draft, setDraft] = useState(null); // in-progress drawing
  const [tool, setToolState] = useState('select');
  const [selected, setSelectedState] = useState([]); // [{kind:'node'|'shape', id}] — multi-select
  const [readOnly, setReadOnlyState] = useState(() => {
    // Seed from the shared global mode so every board mounts in the same
    // edit/view state (and doesn't paint a frame in the wrong mode before a
    // boot effect flips it back).
    if (!EDITABLE) return true;
    try { return localStorage.getItem(GLOBAL_MODE_KEY) === 'view'; } catch { return false; }
  });
  const [editingId, setEditingId] = useState(null);
  // Global format-on-type preference: seeded from the persisted user pref, else
  // the prop default. Toggling it from any code object updates them all.
  const [formatOnType, setFormatOnTypeState] = useState(() => {
    try { const v = localStorage.getItem(FORMAT_KEY); if (v != null) return v === '1'; } catch { /* storage unavailable */ }
    return formatOnTypeDefault !== false;
  });
  const setFormatOnType = (v) => {
    const on = !!v;
    setFormatOnTypeState(on);
    try { localStorage.setItem(FORMAT_KEY, on ? '1' : '0'); } catch { /* storage unavailable */ }
    try { window.dispatchEvent(new CustomEvent(FORMAT_EVENT, { detail: on })); } catch { /* no window */ }
  };
  const [noteColor, setNoteColor] = useState('yellow');
  const [textFont, setTextFont] = useState('serif'); // default font for new text blocks
  const [strokeColor, setStrokeColor] = useState('#7C2D91');
  const [fillColor, setFillColor] = useState('none'); // default fill for new fillable shapes
  const [ctxMenu, setCtxMenu] = useState(null); // {x,y,target:{kind,id}}
  const [fullscreenId, setFullscreenId] = useState(null); // image node shown in the lightbox
  const [bgColor, setBgColor] = useState(init.bgColor || null); // board-wide background override (null = theme default)
  const [publishState, setPublishState] = useState('idle'); // idle|saving|done|error
  const publishT = useRef(0);
  const autoPublishT = useRef(0); // debounce for background auto-publish
  const publishDirty = useRef(false); // a debounced publish is pending / unflushed
  const didAutoPublishMount = useRef(false); // skip the first (mount) auto-publish fire
  const booted = useRef(false); // true once the initial view has been applied, so the
                                // boot-time applyView doesn't trigger a publish

  /* ── Refs (imperative engine state) ─────────────────────────── */
  const rootRef = useRef(null);          // the scoped `.canvas-root` wrapper
  const hoverInsideRef = useRef(false);  // pointer is over this canvas (gates keyboard shortcuts)
  const activeInsideRef = useRef(false); // canvas was the last thing interacted with (also gates shortcuts)
  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const zoomLabelRef = useRef(null);
  const chromeRef = useRef({ sel: null, del: null, edit: null, rz: null, hov: null, marq: null });
  const chrome = chromeRef.current;
  const nodeEls = useRef(new Map()).current; // id → element
  const shapeEls = useRef(new Map()).current; // id → shape svg child (.shape)
  const frameLabelEls = useRef(new Map()).current; // id → label element
  const clipboard = useRef(null); // copied [{kind,data}] items, for paste
  const pasteCount = useRef(0); // cascades each successive paste of the same clipboard

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
  const lastHoverScale = useRef(active0.view.scale || 1); // scale at the last applyView, to tell pan from zoom
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
  S.textFont = textFont;
  S.strokeColor = strokeColor;
  S.fillColor = fillColor;
  S.nodes = nodes;
  S.shapes = shapes;
  S.fullscreenId = fullscreenId;
  S.pages = pages;
  S.activePageId = activePageId;
  S.bgColor = bgColor;

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
      // Panning clears the hover outline (it would otherwise cling to the object
      // as the view slides); zooming keeps it, since placeHover just re-fits it
      // around the same object. A zoom always changes the scale, a pan doesn't.
      if (viewRef.scale === lastHoverScale.current) S.hoverId = null;
      lastHoverScale.current = viewRef.scale;
      syncChrome();
      // View-mode pan/zoom is transient (snapshotActive keeps the saved view),
      // so only edit-mode view changes need to hit the autosave. Also commit the
      // new framing to the published snapshot in the background — but not on the
      // boot-time apply, which would rewrite the board on every load.
      if (!S.readOnly) {
        scheduleSave();
        if (booted.current) schedulePublish();
      }
    }
    function screenToWorld(sx, sy) {
      const r = viewportRef.current.getBoundingClientRect();
      return { x: (sx - r.left - viewRef.x) / viewRef.scale, y: (sy - r.top - viewRef.y) / viewRef.scale };
    }
    /* Viewport dimensions in CSS pixels. Fit/zoom/centering all measure the
       canvas container (not the browser window) so the board behaves correctly
       when embedded in a section rather than owning the whole screen.

       vpRect (screen space, includes ancestor transforms) is only for mapping
       pointer coordinates. Fit/centering math must use the layout size instead:
       the world transform operates in the element's layout box, which an
       ancestor scale (e.g. the hover thumbnail's scale-50 wrapper) doesn't
       change even though it shrinks the on-screen rect. */
    function vpRect() {
      const el = viewportRef.current;
      return el ? el.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    }
    function vpW() { const el = viewportRef.current; return el ? el.clientWidth : 0; }
    function vpH() { const el = viewportRef.current; return el ? el.clientHeight : 0; }

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
    /* Zoom about the viewport's own centre (used by the +/- buttons). */
    function zoomCenter(factor) { const r = vpRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor); }
    function zoomTo(scale, sx, sy) {
      const r = viewportRef.current.getBoundingClientRect();
      // Default centre uses the layout box (vpW/vpH), not the getBoundingClientRect
      // size, so an ancestor transform (e.g. an embedded/scaled board) can't skew it.
      const px = sx == null ? vpW() / 2 : sx - r.left, py = sy == null ? vpH() / 2 : sy - r.top;
      // Pivot about the point on screen NOW (viewRef, the displayed frame), not the
      // target of an in-flight glide — otherwise a reset pressed mid-zoom keeps the
      // wrong point fixed and the object under the cursor jumps away.
      const old = viewRef.scale, ns = clampScale(scale), k = ns / old;
      targetRef.x = px * (1 - k) + viewRef.x * k; targetRef.y = py * (1 - k) + viewRef.y * k; targetRef.scale = ns;
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
      const bb = el.getBBox();
      // getBBox ignores the transient translate a shape carries mid-drag, so add it.
      const a = actionRef.current;
      const moving = a && a.type === 'move' && a.items.some((it) => it.kind === 'shape' && it.id === sel.id);
      return [bb.x + (moving ? a.dx || 0 : 0), bb.y + (moving ? a.dy || 0 : 0), bb.width, bb.height];
    }
    function hideSelChrome() {
      for (const k of ['sel', 'edit', 'rz']) if (chrome[k]) chrome[k].style.display = 'none';
    }
    function placeSel(x, y, w, h) {
      const s = viewRef.scale, sx = viewRef.x + x * s, sy = viewRef.y + y * s, sw = w * s, sh = h * s;
      chrome.sel.style.display = 'block';
      chrome.sel.style.left = (sx - 4) + 'px'; chrome.sel.style.top = (sy - 4) + 'px';
      chrome.sel.style.width = (sw + 8) + 'px'; chrome.sel.style.height = (sh + 8) + 'px';
      /* The edit / resize affordances only make sense for a single selected node. */
      const single = S.selected.length === 1 ? S.selected[0] : null;
      const nodeEl = single && single.kind === 'node' ? nodeEls.get(single.id) : null;
      const type = nodeEl ? nodeEl.dataset.type : null;
      const editing = type && S.editingId === single.id;
      if ((type === 'md' || type === 'code') && !editing) {
        chrome.edit.style.display = 'flex'; chrome.edit.style.left = (sx + sw - 11) + 'px'; chrome.edit.style.top = (sy - 11) + 'px';
      } else chrome.edit.style.display = 'none';
      if ((type === 'frame' || type === 'md' || type === 'code' || type === 'tblock' || type === 'image' || type === 'video') && !editing) {
        chrome.rz.style.display = 'block'; chrome.rz.style.left = (sx + sw - 4) + 'px'; chrome.rz.style.top = (sy + sh - 4) + 'px';
        chrome.rz.style.cursor = type === 'md' || type === 'code' || type === 'tblock' ? 'ew-resize' : 'nwse-resize';
      } else chrome.rz.style.display = 'none';
    }
    /* Faint hover outline for the node under the cursor (edit mode only). Drawn
       in the screen-space chrome layer so its thickness never scales with zoom. */
    function placeHover() {
      const hov = chrome.hov; if (!hov) return;
      const id = S.hoverId;
      const suppressed = !id || actionRef.current || S.readOnly || S.tool !== 'select' ||
        S.selected.some((it) => it.kind === 'node' && it.id === id);
      if (suppressed) { hov.style.display = 'none'; return; }
      const el = nodeEls.get(id);
      if (!el) { hov.style.display = 'none'; return; }
      const x = +el.dataset.x, y = +el.dataset.y, w = el.offsetWidth, h = el.offsetHeight;
      const s = viewRef.scale, sx = viewRef.x + x * s, sy = viewRef.y + y * s;
      hov.style.display = 'block';
      hov.style.left = (sx - 4) + 'px'; hov.style.top = (sy - 4) + 'px';
      hov.style.width = (w * s + 8) + 'px'; hov.style.height = (h * s + 8) + 'px';
    }
    function setHover(id) {
      const next = S.readOnly || S.tool !== 'select' ? null : (id || null);
      S.hoverId = next;
      placeHover();
    }
    function syncChrome() {
      const s = viewRef.scale;
      frameLabelEls.forEach((label, id) => {
        const f = nodeEls.get(id); if (!f) return;
        label.style.left = (viewRef.x + +f.dataset.x * s) + 'px';
        label.style.top = (viewRef.y + +f.dataset.y * s - 28) + 'px';
      });
      placeHover();
      if (!S.selected.length || !chrome.sel) { hideSelChrome(); return; }
      // One box around the union of everything selected.
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, any = false;
      for (const it of S.selected) {
        const r = worldRectOf(it); if (!r) continue;
        any = true;
        x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]);
        x1 = Math.max(x1, r[0] + r[2]); y1 = Math.max(y1, r[1] + r[3]);
      }
      if (!any) { hideSelChrome(); return; }
      placeSel(x0, y0, x1 - x0, y1 - y0);
    }

    /* ── Marquee (rubber-band) selection ──────────────────────── */
    function placeMarquee(x, y, w, h) {
      const m = chrome.marq; if (!m) return;
      m.style.display = 'block';
      m.style.left = x + 'px'; m.style.top = y + 'px';
      m.style.width = w + 'px'; m.style.height = h + 'px';
    }
    function hideMarquee() { if (chrome.marq) chrome.marq.style.display = 'none'; }
    /* Select everything the world-space rect touches, unioned with `base` (the
       pre-existing selection when shift-dragging). Nodes and shapes count on
       intersection; frames only when fully contained, so sweeping a marquee
       inside a large frame doesn't grab the frame itself. Runs per pointermove,
       so skip the state write when membership hasn't changed. */
    function marqueeSelect(rect, base) {
      const rx1 = rect.x + rect.w, ry1 = rect.y + rect.h;
      const hits = [];
      nodeEls.forEach((el, id) => {
        const x = +el.dataset.x, y = +el.dataset.y, w = el.offsetWidth, h = el.offsetHeight;
        const hit = el.dataset.type === 'frame'
          ? x >= rect.x && y >= rect.y && x + w <= rx1 && y + h <= ry1
          : x < rx1 && x + w > rect.x && y < ry1 && y + h > rect.y;
        if (hit) hits.push({ kind: 'node', id });
      });
      shapeEls.forEach((el, id) => {
        const bb = el.getBBox();
        if (bb.x < rx1 && bb.x + bb.width > rect.x && bb.y < ry1 && bb.y + bb.height > rect.y) {
          hits.push({ kind: 'shape', id });
        }
      });
      const baseKeys = new Set(base.map(selKey));
      const items = [...base, ...hits.filter((h) => !baseKeys.has(selKey(h)))];
      const next = items.map(selKey).sort().join('|');
      const cur = S.selected.map(selKey).sort().join('|');
      if (next !== cur) setSelectedState(items);
    }

    /* ── Selection ────────────────────────────────────────────── */
    const selKey = (it) => it.kind + ':' + it.id;
    function selectNode(id) { setSelectedState([{ kind: 'node', id }]); }
    function selectShape(id) { setSelectedState([{ kind: 'shape', id }]); }
    function deselect() { setSelectedState([]); }
    function isSelected(kind, id) { return S.selected.some((it) => it.kind === kind && it.id === id); }
    /* Shift-click: add the object to the selection, or drop it if already in. */
    function toggleSelect(kind, id) {
      setSelectedState(
        isSelected(kind, id)
          ? S.selected.filter((it) => !(it.kind === kind && it.id === id))
          : [...S.selected, { kind, id }]
      );
    }
    /* Build the payload for a move gesture starting on `item`: the whole
       selection when the grabbed object is part of a multi-selection, else just
       the object itself. Captures each element and its start position so the
       pointermove handler can drive them all imperatively. */
    function moveItemsFor(item) {
      const group = S.selected.length > 1 && isSelected(item.kind, item.id) ? S.selected : [item];
      return group
        .map((it) => {
          if (it.kind === 'node') {
            const el = nodeEls.get(it.id); if (!el) return null;
            return { kind: 'node', id: it.id, el, ox: +el.dataset.x, oy: +el.dataset.y };
          }
          const el = shapeEls.get(it.id); if (!el) return null;
          return { kind: 'shape', id: it.id, el };
        })
        .filter(Boolean);
    }

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
    /* Commit a multi-object drag in one state write per collection. */
    function patchMany(nodePatches, shapePatches) {
      if (nodePatches && Object.keys(nodePatches).length) {
        setNodes((ns) => ns.map((n) => (nodePatches[n.id] ? { ...n, ...nodePatches[n.id] } : n)));
      }
      if (shapePatches && Object.keys(shapePatches).length) {
        setShapes((ss) => ss.map((s) => (shapePatches[s.id] ? { ...s, ...shapePatches[s.id] } : s)));
      }
    }
    function deleteItems(items) {
      const nodeIds = new Set(), shapeIds = new Set();
      items.forEach((it) => (it.kind === 'node' ? nodeIds : shapeIds).add(it.id));
      nodeIds.forEach((id) => { nodeEls.delete(id); frameLabelEls.delete(id); });
      shapeIds.forEach((id) => shapeEls.delete(id));
      if (nodeIds.size) setNodes((ns) => ns.filter((n) => !nodeIds.has(n.id)));
      if (shapeIds.size) setShapes((ss) => ss.filter((s) => !shapeIds.has(s.id)));
    }

    function setZ(target, z) {
      if (target.kind === 'node') updateNode(target.id, { z });
      else updateShape(target.id, { z });
    }
    /* Context-menu targets: a single {kind,id}, or {kind:'multi'} meaning the
       whole current selection. */
    function targetsOf(target) { return target.kind === 'multi' ? [...S.selected] : [target]; }
    function bringFront(target) { targetsOf(target).forEach((t) => setZ(t, nextZ())); }
    function sendBack(target) { targetsOf(target).forEach((t) => setZ(t, backZ())); }
    function toggleAnchor(id) {
      const n = S.nodes.find((x) => x.id === id); if (!n) return;
      updateNode(id, { anchor: !n.anchor });
    }
    function deleteSelected() {
      if (!S.selected.length) return;
      deleteItems(S.selected);
      deselect();
    }
    function deleteTarget(target) {
      deleteItems(targetsOf(target));
      deselect();
    }

    /* ── Copy / paste / duplicate ─────────────────────────────────
       Selection holds only {kind,id}; resolve to the live node/shape. */
    function itemData(it) {
      return it.kind === 'node' ? S.nodes.find((n) => n.id === it.id) : S.shapes.find((s) => s.id === it.id);
    }
    /* Add a fresh copy of one node/shape offset by (dx,dy); returns its {kind,id}. */
    function addClone(kind, data, dx, dy) {
      if (kind === 'node') {
        const n = addNode({ ...data, id: newId(data.type), x: +data.x + dx, y: +data.y + dy, z: undefined });
        return { kind: 'node', id: n.id };
      }
      const s = { ...data, id: newShapeId(), z: undefined };
      if (data.type === 'pen') s.points = data.points.map(([px, py]) => [px + dx, py + dy]);
      else { s.x1 = data.x1 + dx; s.y1 = data.y1 + dy; s.x2 = data.x2 + dx; s.y2 = data.y2 + dy; }
      addShape(s);
      return { kind: 'shape', id: s.id };
    }
    /* Clone the given items offset by (dx,dy). Selects the copies unless select
       is false (alt-drag keeps the selection on the items still being dragged). */
    function duplicateItems(items, dx = 24, dy = 24, select = true) {
      const created = items.map((it) => { const d = itemData(it); return d ? addClone(it.kind, d, dx, dy) : null; }).filter(Boolean);
      if (created.length && select) setSelectedState(created);
    }
    function duplicateSelected() { if (S.selected.length) duplicateItems([...S.selected]); }
    function duplicateTarget(target) { duplicateItems(targetsOf(target)); }
    /* Alt-drag: drop a copy at the origin the moment the drag starts, leaving the
       originals (still selected) to be dragged away so nothing appears to vanish. */
    function duplicateItemsAt(items, dx, dy) { duplicateItems(items, dx, dy, false); }
    /* Snapshot the current selection into the clipboard (deep-copied so later
       edits to the originals don't leak into a paste). */
    function copySelected() {
      const items = S.selected.map((it) => { const d = itemData(it); return d ? { kind: it.kind, data: JSON.parse(JSON.stringify(d)) } : null; }).filter(Boolean);
      if (!items.length) return;
      clipboard.current = items;
      pasteCount.current = 0;
    }
    /* Paste the clipboard, cascading each successive paste so copies don't stack. */
    function paste() {
      const clip = clipboard.current;
      if (!clip || !clip.length) return;
      pasteCount.current += 1;
      const off = 24 * pasteCount.current;
      const created = clip.map((it) => addClone(it.kind, it.data, off, off));
      setSelectedState(created);
    }

    /* ── Tools / mode ─────────────────────────────────────────── */
    function setTool(t) { setToolState(t); deselect(); }
    // `broadcast` is false when applying a mode change that originated from
    // another canvas instance, so we don't persist/re-emit and loop.
    function setMode(ro, broadcast = true) {
      setReadOnlyState(ro);
      if (ro) { deselect(); setCtxMenu(null); setToolState((t) => (t === 'select' || t === 'hand' ? t : 'select')); }
      if (EDITABLE && broadcast) {
        try { localStorage.setItem(GLOBAL_MODE_KEY, ro ? 'view' : 'edit'); } catch { /* storage unavailable */ }
        try { window.dispatchEvent(new CustomEvent(MODE_EVENT, { detail: ro })); } catch { /* no window */ }
      }
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
      const W = vpW(), H = vpH();
      const pad = 90, bw = b.maxX - b.minX + pad * 2, bh = b.maxY - b.minY + pad * 2;
      const s = clampScale(Math.min(W / bw, H / bh));
      targetRef.scale = s;
      targetRef.x = (W - (b.maxX + b.minX) * s) / 2;
      targetRef.y = (H - (b.maxY + b.minY) * s) / 2;
      if (animate) startZoomLoop(); else snapView();
    }
    function flyTo(id) {
      const el = nodeEls.get(id); if (!el) return;
      const x = +el.dataset.x, y = +el.dataset.y, w = el.offsetWidth, h = el.offsetHeight;
      const W = vpW(), H = vpH(), pad = 90;
      const s = clampScale(Math.min(W / (w + pad * 2), H / (h + pad * 2)));
      targetRef.scale = s; targetRef.x = W / 2 - (x + w / 2) * s; targetRef.y = H / 2 - (y + h / 2) * s;
      startZoomLoop();
    }
    /* Fly to a section that may live on another page: switch to its page first,
       then fly once the target node has mounted (elements only exist for the
       active page). */
    function goToSection(pageId, id) {
      if (pageId && pageId !== S.activePageId) {
        switchPage(pageId);
        let tries = 30;
        const tick = () => {
          if (nodeEls.get(id)) { flyTo(id); return; }
          if (--tries > 0) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      } else {
        flyTo(id);
      }
    }

    /* ── Persistence ──────────────────────────────────────────── */
    function serializeNode(n) {
      const o = { id: n.id, type: n.type, x: +n.x, y: +n.y, z: n.z };
      if (n.anchor) o.anchor = 1;
      if (n.type === 'sticky') { o.color = n.color; o.text = n.text; }
      else if (n.type === 'tblock') { o.text = n.text; if (n.w != null) o.w = n.w; if (n.fontSize != null) o.fontSize = n.fontSize; if (n.font) o.font = n.font; }
      else if (n.type === 'frame') { o.w = n.w; o.h = n.h; o.text = n.name; }
      else if (n.type === 'md') { o.w = n.w; o.text = n.text; }
      else if (n.type === 'code') { o.w = n.w; o.text = n.text; o.lang = n.lang; if (n.wrap != null) o.wrap = n.wrap ? 1 : 0; }
      else if (n.type === 'image' || n.type === 'video') { o.w = n.w; o.h = n.h; o.src = n.src; if (n.alt) o.alt = n.alt; if (n.svg) o.svg = 1; }
      return o;
    }
    function serializeShape(s) {
      const o = { id: s.id, type: s.type, stroke: s.stroke, width: s.width, z: s.z };
      if (s.fill && s.fill !== 'none') o.fill = s.fill;
      if (s.type === 'pen') o.points = s.points; else { o.x1 = s.x1; o.y1 = s.y1; o.x2 = s.x2; o.y2 = s.y2; }
      return o;
    }
    /* Copy the live active-page data back into pageData so a serialise sees it.
       In view mode the live pan/zoom is transient: keep the page's last
       edit-mode view so a refresh restores the framing from before the reader
       started panning/zooming. */
    function snapshotActive() {
      const prev = pageData[S.activePageId];
      pageData[S.activePageId] = {
        nodes: S.nodes,
        shapes: S.shapes,
        view: S.readOnly && prev ? prev.view : { x: viewRef.x, y: viewRef.y, scale: viewRef.scale },
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
      const snap = { version: 2, activePage: S.activePageId, pages: out };
      if (S.bgColor) snap.bgColor = S.bgColor;
      return snap;
    }
    /* Board-wide background colour override; null restores the theme default. */
    function setCanvasBg(color) {
      if (!EDITABLE) return;
      setBgColor(color || null);
    }
    function scheduleSave() { if (!EDITABLE) return; clearTimeout(saveT.current); saveT.current = setTimeout(saveNow, 400); }
    function saveNow() {
      if (!EDITABLE) return;
      const snap = serialize();
      try {
        localStorage.setItem(STORE, JSON.stringify(snap));
      } catch (err) {
        // Inline media data URLs can overflow the ~5MB quota; keep the board
        // usable (and onChange flowing) instead of dying mid-gesture.
        console.warn('[canvas] autosave skipped (storage quota? large inline media?)', err);
      }
      if (onChange) onChange(snap);
    }
    /* Persist the current board through the host-supplied `onPublish` adapter
       (e.g. the portfolio bakes it into a committed data file via a dev endpoint).
       Runs automatically in the background as the user edits — see
       `schedulePublish` — so there's no manual save action. No-ops when no
       adapter is provided. */
    async function publish() {
      if (!canPublish) return;
      clearTimeout(autoPublishT.current);
      clearTimeout(publishT.current);
      publishDirty.current = false;
      setPublishState('saving');
      try {
        await onPublish(serialize());
        setPublishState('done');
      } catch (err) {
        console.error('[canvas] publish failed', err);
        setPublishState('error');
      }
      publishT.current = setTimeout(() => setPublishState('idle'), 2200);
    }
    /* Debounced background publish. Fired on every content change while editing
       so edits persist without a save button; the delay coalesces bursts (drag,
       typing) into a single write to the host adapter. */
    function schedulePublish() {
      if (!canPublish || S.readOnly) return;
      publishDirty.current = true;
      clearTimeout(autoPublishT.current);
      autoPublishT.current = setTimeout(publish, 900);
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
      // A blank board with world-origin roughly centred in the viewport.
      const view = { x: Math.round(vpW() / 2), y: Math.round(vpH() / 2), scale: 1 };
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
    const readText = (file) => new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsText(file);
    });
    /* Intrinsic size of an SVG straight from its markup. An <img> reports
       naturalWidth/Height of 0 for the very common case of an SVG that declares
       only a viewBox (no width/height) — icons exported from design tools almost
       always do — so those would otherwise land as a squished 200×150 box. Read
       explicit px width/height when present, else fall back to the viewBox
       aspect ratio; ignore relative units (%/em) since they carry no intrinsic
       size. */
    const measureSvgText = (text) => {
      const tag = /<svg\b[^>]*>/i.exec(text || '');
      const attrs = tag ? tag[0] : '';
      const dim = (name) => {
        const m = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(attrs);
        if (!m) return null;
        const v = m[1].trim();
        if (/(%|em|ex|rem)\s*$/i.test(v)) return null; // relative → no intrinsic size
        const n = parseFloat(v);
        return Number.isFinite(n) && n > 0 ? n : null;
      };
      let w = dim('width'), h = dim('height');
      const vb = /\bviewBox\s*=\s*["']([\d.eE,\s+-]+)["']/i.exec(attrs);
      let vbw = null, vbh = null;
      if (vb) {
        const p = vb[1].trim().split(/[\s,]+/).map(Number);
        if (p.length === 4 && p[2] > 0 && p[3] > 0) { vbw = p[2]; vbh = p[3]; }
      }
      const ar = vbw && vbh ? vbw / vbh : null;
      if (w && !h) h = ar ? w / ar : w;
      else if (h && !w) w = ar ? h * ar : h;
      else if (!w && !h) { w = vbw || 200; h = vbh || 150; }
      return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
    };
    const isSvgFile = (f) => !!f && (f.type === 'image/svg+xml' || /\.svg$/i.test(f.name || ''));
    const measure = (src) => new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve({ w: im.naturalWidth || 200, h: im.naturalHeight || 150 });
      im.onerror = () => reject(new Error('could not decode image'));
      im.src = src;
    });
    const measureVideo = (src) => new Promise((resolve, reject) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      v.onloadedmetadata = () => resolve({ w: v.videoWidth || 320, h: v.videoHeight || 180 });
      v.onerror = () => reject(new Error('could not decode video'));
      v.src = src;
    });
    /* Some drag sources (and OSes) hand over files with an empty MIME type, so
       fall back to the extension. Animated images and videos play automatically —
       image nodes render a plain <img>, video nodes an autoplaying muted <video>. */
    const isImageFile = (f) =>
      !!f && (f.type.startsWith('image/') || /\.(gif|png|jpe?g|webp|avif|svg)$/i.test(f.name || ''));
    const isVideoFile = (f) =>
      !!f && (f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)$/i.test(f.name || ''));
    /* Drop a media node centred on the cursor, scaled to a sane default. */
    function placeMediaNode(type, src, nat, wx, wy, alt, extra) {
      const MAX = 360;
      const k = nat.w > MAX || nat.h > MAX ? MAX / Math.max(nat.w, nat.h) : 1;
      const w = Math.round(nat.w * k), h = Math.round(nat.h * k);
      const n = addNode({ id: newId(type), type, x: wx - w / 2, y: wy - h / 2, w, h, src, alt: alt || '', ...extra });
      setToolState('select'); selectNode(n.id);
    }
    /* Without an upload adapter, media bytes have to live somewhere durable.
       Small images inline as data URLs (portable snapshots); anything bigger —
       and all videos — goes into IndexedDB, because a single real video inlined
       into the localStorage autosave blows its ~5MB quota and the board
       silently stops saving. The node then holds an `idb:<key>` reference. */
    const INLINE_MAX = 512 * 1024;
    let mediaSeq = 0;
    /* Refs are self-describing (`idb:<dbName>/<key>`) so another canvas
       instance rendering this board's snapshot — e.g. a read-only preview —
       can resolve them regardless of its own storageKey. Keys contain no `/`;
       split on the last one in case a host's storageKey does. Bare legacy refs
       (`idb:<key>`) fall back to this instance's own DB. */
    function parseIdbRef(src) {
      if (typeof src !== 'string' || !src.startsWith('idb:')) return null;
      const body = src.slice(4);
      const i = body.lastIndexOf('/');
      return i === -1 ? { db: MEDIA_DB, key: body } : { db: body.slice(0, i), key: body.slice(i + 1) };
    }
    async function storeMediaBlob(blob) {
      const key = 'm' + Date.now().toString(36) + '-' + ++mediaSeq;
      await putMedia(MEDIA_DB, key, blob);
      return `idb:${MEDIA_DB}/${key}`;
    }
    /* Resolve a node src for rendering: `idb:` refs become (cached) object URLs;
       anything else passes through untouched. */
    const mediaUrlCache = new Map(); // full idb ref -> Promise<objectURL>
    function resolveMediaSrc(src) {
      const ref = parseIdbRef(src);
      if (!ref) return Promise.resolve(src);
      if (!mediaUrlCache.has(src)) {
        mediaUrlCache.set(src, getMedia(ref.db, ref.key).then((blob) => (blob ? URL.createObjectURL(blob) : '')));
      }
      return mediaUrlCache.get(src);
    }
    /* Measure/decode via a temporary object URL, resolve the stored src, then
       drop the node. The bytes pass through untouched, so animated GIFs keep
       playing. */
    async function addImageFromFile(file, wx, wy) {
      if (!EDITABLE || !isImageFile(file)) return;
      try {
        let nat;
        if (isSvgFile(file)) {
          // Measure from the markup — an <img> reports 0×0 for viewBox-only SVGs.
          nat = measureSvgText(await readText(file));
        } else {
          const objUrl = URL.createObjectURL(file);
          nat = await measure(objUrl).finally(() => URL.revokeObjectURL(objUrl));
        }
        let src;
        if (onUploadImage) {
          src = await onUploadImage(file, await readDataUrl(file));
          if (!src) throw new Error('onUploadImage returned no src');
        } else if (hasIDB && file.size > INLINE_MAX) {
          src = await storeMediaBlob(file);
        } else {
          src = await readDataUrl(file);
        }
        placeMediaNode('image', src, nat, wx, wy, file.name, isSvgFile(file) ? { svg: true } : null);
      } catch (err) {
        console.error('[canvas] image drop failed', err);
      }
    }
    /* Same flow for video files, through `onUploadVideo`. Files that arrive
       with no MIME type get re-wrapped with one from the extension — <video>
       won't content-sniff data:/blob: URLs the way <img> does. QuickTime .mov
       gets the same treatment: browsers play its H.264 bytes fine but only
       under a video/mp4 label, and upload adapters generally don't know
       video/quicktime either. */
    async function addVideoFromFile(file, wx, wy) {
      if (!EDITABLE || !isVideoFile(file)) return;
      try {
        const mime = file.type.startsWith('video/') && file.type !== 'video/quicktime'
          ? file.type
          : { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg' }[
              (file.name || '').split('.').pop().toLowerCase()] || 'video/mp4';
        const typed = file.type === mime ? file : new Blob([file], { type: mime });
        const objUrl = URL.createObjectURL(typed);
        const nat = await measureVideo(objUrl).finally(() => URL.revokeObjectURL(objUrl));
        let src;
        if (onUploadVideo) {
          src = await onUploadVideo(file, await readDataUrl(typed));
          if (!src) throw new Error('onUploadVideo returned no src');
        } else if (hasIDB) {
          src = await storeMediaBlob(typed);
        } else {
          src = await readDataUrl(typed);
        }
        placeMediaNode('video', src, nat, wx, wy, file.name);
      } catch (err) {
        console.error('[canvas] video drop failed', err);
      }
    }
    /* Drop a media node for a remote URL — how a GIF or video dragged in from
       another browser tab arrives. Decoding doubles as validation: try it as an
       image then as a video (extension decides the order) and ignore URLs that
       are neither. */
    async function addMediaFromUrl(url, wx, wy) {
      if (!EDITABLE || !url) return;
      let alt = '';
      try { alt = decodeURIComponent(new URL(url, location.href).pathname.split('/').pop() || ''); } catch { /* ignore */ }
      // An SVG dragged from another tab: the intrinsic size lives in its markup,
      // and an <img> reports 0×0 for viewBox-only ones. Fetch + parse when we
      // can; fall through to the <img> probe (and its 200×150 default) if a
      // cross-origin fetch is blocked or the URL isn't really an SVG.
      if (/\.svg([?#]|$)/i.test(url)) {
        try {
          const text = await fetch(url).then((r) => (r.ok ? r.text() : Promise.reject()));
          if (/<svg\b/i.test(text)) { placeMediaNode('image', url, measureSvgText(text), wx, wy, alt, { svg: true }); return; }
        } catch { /* fall through to the <img> probe */ }
      }
      const attempts = /\.(mp4|webm|mov|m4v|ogv)([?#]|$)/i.test(url)
        ? [['video', measureVideo], ['image', measure]]
        : [['image', measure], ['video', measureVideo]];
      for (const [type, probe] of attempts) {
        try {
          const nat = await probe(url);
          placeMediaNode(type, url, nat, wx, wy, alt);
          return;
        } catch { /* try the other kind */ }
      }
      console.error('[canvas] media url drop failed: could not decode', url);
    }

    /* Pull an <svg>…</svg> fragment out of pasted text/html. Copying SVG source
       from an editor lands as text/plain; some tools (and browsers) wrap it in
       text/html. Only accept a real root <svg> element, not an inline reference. */
    function pickSvgMarkup(str) {
      if (!str) return '';
      const m = /<svg[\s>][\s\S]*<\/svg\s*>/i.exec(str);
      return m ? m[0] : '';
    }
    /* Paste image / gif / svg / video from the system clipboard, mirroring the
       drop flow. Returns true if it consumed the clipboard so the caller can
       fall back to the internal node clipboard when it didn't. Decoding/storage
       is async, but presence is decided synchronously so the caller can
       preventDefault straight away. */
    function pasteMedia(cd, wx, wy) {
      if (!EDITABLE || S.readOnly || !cd) return false;
      // A pasted screenshot or copied media file arrives in `files`; fall back to
      // `items` for the browsers that only populate that.
      let files = Array.from(cd.files || []);
      if (!files.length && cd.items) {
        files = Array.from(cd.items)
          .filter((it) => it.kind === 'file')
          .map((it) => it.getAsFile())
          .filter(Boolean);
      }
      files = files.filter((f) => isImageFile(f) || isVideoFile(f));
      if (files.length) {
        files.forEach((file, i) => {
          const add = isVideoFile(file) ? addVideoFromFile : addImageFromFile;
          add(file, wx + i * 24, wy + i * 24);
        });
        return true;
      }
      // Raw SVG source copied as text — wrap it as a file so the image flow
      // measures it from its markup and tags it as vector art.
      const svg = pickSvgMarkup(cd.getData('text/html')) || pickSvgMarkup(cd.getData('text/plain'));
      if (svg) {
        addImageFromFile(new File([svg], 'pasted.svg', { type: 'image/svg+xml' }), wx, wy);
        return true;
      }
      return false;
    }

    /* ── Media lightbox (full-screen viewing) ─────────────────── */
    function openFullscreen(id) {
      const n = S.nodes.find((x) => x.id === id);
      // SVGs are vector art shown at full size on the board — nothing to gain
      // from a lightbox, so they never open full-screen.
      if (n && (n.type === 'image' || n.type === 'video') && !n.svg) setFullscreenId(id);
    }
    function closeFullscreen() { setFullscreenId(null); }

    /* ── Editing text nodes ───────────────────────────────────── */
    function startEditing(id) { setEditingId(id); }
    function stopEditing() { setEditingId(null); }

    /* Chrome elements register themselves here (avoids mutating context). */
    function setChrome(name, el) { chromeRef.current[name] = el; }

    return {
      viewRef, targetRef, applyView, screenToWorld, freezeView,
      zoomAt, zoomCenter, zoomTo, panBy, markActive, startZoomLoop, snapView, syncChrome, hideSelChrome, placeSel, setHover,
      selectNode, selectShape, deselect, isSelected, toggleSelect, moveItemsFor,
      placeMarquee, hideMarquee, marqueeSelect,
      newId, newShapeId, addNode, updateNode, removeNode, addShape, updateShape, removeShape, patchMany,
      bringFront, sendBack, toggleAnchor, deleteSelected, deleteTarget,
      copySelected, paste, duplicateSelected, duplicateTarget, duplicateItemsAt,
      setTool, setMode, setCanvasBg, fitAll, flyTo, goToSection, scheduleSave, saveNow, serialize, publish, schedulePublish, resetBoard,
      switchPage, addPage, renamePage, removePage,
      isImageFile, isVideoFile, addImageFromFile, addVideoFromFile, addMediaFromUrl, pasteMedia, resolveMediaSrc, parseIdbRef,
      openFullscreen, closeFullscreen, startEditing, stopEditing, setChrome,
      nextZ, backZ,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Boot GC: drop IndexedDB blobs no longer referenced by any page ──
     Runs once against the freshly loaded snapshot (the DB is scoped to this
     board's storageKey, so nothing else can reference its keys). Media deleted
     during a session is collected on the next load. */
  useEffect(() => {
    if (!EDITABLE || !hasIDB) return;
    const referenced = new Set();
    Object.values(pageData).forEach((p) => p.nodes.forEach((n) => {
      const ref = eng.parseIdbRef(n.src);
      if (ref && ref.db === MEDIA_DB) referenced.add(ref.key);
    }));
    listMediaKeys(MEDIA_DB)
      .then((keys) => {
        const orphans = keys.filter((k) => !referenced.has(k));
        if (orphans.length) return deleteMedia(MEDIA_DB, orphans);
        return undefined;
      })
      .catch(() => { /* GC is best-effort */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Flush the debounced autosave before the page goes away. Dropping media can
     make the dev server reload the page (a new file under public/ isn't in
     Vite's watch-ignore list) faster than the 400ms debounce fires, silently
     losing the just-dropped node. */
  useEffect(() => {
    if (!EDITABLE) return undefined;
    const flush = () => { eng.saveNow(); if (publishDirty.current) eng.publish(); };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Root element classes (tool / mode) ─────────────────────── */
  useEffect(() => {
    const b = rootRef.current;
    if (!b) return;
    [...b.classList].forEach((c) => { if (c.startsWith('tool-')) b.classList.remove(c); });
    b.classList.add('tool-' + tool);
    b.classList.toggle('read-only', readOnly);
  }, [tool, readOnly]);

  /* ── Global edit/view mode: follow toggles from any other instance ── */
  useEffect(() => {
    if (!EDITABLE) return;
    // Same-document instances hear the custom event; other tabs hear `storage`.
    const onMode = (e) => eng.setMode(!!e.detail, false);
    const onStorage = (e) => { if (e.key === GLOBAL_MODE_KEY) eng.setMode(e.newValue === 'view', false); };
    window.addEventListener(MODE_EVENT, onMode);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(MODE_EVENT, onMode);
      window.removeEventListener('storage', onStorage);
    };
  }, [EDITABLE, eng]);

  /* ── Global format-on-type: follow toggles from any other instance ── */
  useEffect(() => {
    const onFmt = (e) => setFormatOnTypeState(!!e.detail);
    const onStorage = (e) => { if (e.key === FORMAT_KEY) setFormatOnTypeState(e.newValue === '1'); };
    window.addEventListener(FORMAT_EVENT, onFmt);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(FORMAT_EVENT, onFmt);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  /* ── Keep chrome + persistence in sync with the model ───────── */
  useEffect(() => { eng.syncChrome(); eng.scheduleSave(); }, [nodes, shapes, selected, editingId, pages, activePageId, bgColor, eng]);

  /* ── Background auto-publish on content changes ──────────────
     Persists edits through the host adapter without a save button. Keyed on
     content only (not selection/editing focus) so clicking around doesn't
     trigger writes. The first (mount) fire is skipped so simply loading a board
     doesn't rewrite its published snapshot. */
  useEffect(() => {
    if (!didAutoPublishMount.current) { didAutoPublishMount.current = true; return; }
    eng.schedulePublish();
  }, [nodes, shapes, pages, activePageId, bgColor, eng]);

  /* ── Boot: apply the initial view (fit if nothing was saved, or if the
     embedder asked for a framed overview via initialView='fit') ──
     Runs in a layout effect so the world transform is set before the browser
     paints — otherwise the board flashes one frame at the un-fitted origin
     (objects in the wrong place) before jumping to the saved/fitted view.
     Node ref callbacks fire at commit, so elements are already measurable. */
  useLayoutEffect(() => {
    if (initialView === 'fit' || !init.hadSaved) {
      eng.fitAll(false);
      // Only persist the fitted view when it's the first-ever view of the
      // board; a forced fit is presentational and must not clobber the save.
      if (!init.hadSaved) eng.saveNow();
    } else {
      eng.applyView();
    }
    // From here on, view changes are user-driven and should publish.
    booted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Re-sync chrome whenever the container resizes (section reflow, window
     resize, sidebar toggles, …) — measured on the viewport, not the window. */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || typeof ResizeObserver === 'undefined') {
      const onResize = () => eng.syncChrome();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
    const ro = new ResizeObserver(() => eng.syncChrome());
    ro.observe(vp);
    return () => ro.disconnect();
  }, [eng]);

  const value = {
    // state
    nodes, shapes, draft, tool, selected, readOnly, editingId, noteColor, textFont, strokeColor, fillColor, ctxMenu,
    publishState, fullscreenId, pages, activePageId, pageData, bgColor,
    brand: init.brand, EDITABLE, homeId: HOME_ID, canPublish, nodeTypes, highlightCode, formatCode, formatOnType, setFormatOnType, theme, accent, fit, ui, saveStatus,
    // setters used by UI
    setDraft, setNoteColor, setTextFont, setStrokeColor, setFillColor, setCtxMenu, setSelectedState,
    // refs
    rootRef, hoverInsideRef, activeInsideRef, viewportRef, worldRef, zoomLabelRef, nodeEls, shapeEls, frameLabelEls, actionRef, panKey, S,
    // engine
    eng,
  };

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}
