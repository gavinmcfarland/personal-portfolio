/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useRef, useState, useEffect, useLayoutEffect, useSyncExternalStore } from 'react';
import { ZOOM, PAN, GRID, frameBarH, clampScale, sectionNodes } from './constants';
import { hasIDB, putMedia, getMedia, listMediaKeys, deleteMedia } from './media-store';
import { RICH_COMMANDS, sanitizeRich, isRichHtml } from './rich-text';
import { getGlobalReadOnly, setGlobalReadOnly, subscribeMode, allocOwnerId, joinOwners, setActiveCanvas, subscribeOwner, primaryOwner } from './edit-mode';

/* Default localStorage key for the dev autosave. Override with the `storageKey`
   prop when embedding more than one editable canvas on a page. */
const DEFAULT_STORE = 'embed-canvas-v1';
const DEFAULT_HOME_ID = 'home'; // id of the first page

/* Edit/view mode is shared across every canvas instance on the page rather than
   stored per-board: toggling one board's mode toggles them all. That contract
   (the global localStorage key + cross-instance/cross-tab sync) plus the single
   fixed Edit button live in ./edit-mode — imported here so the provider and the
   button share one source of truth. */

/* Marker written to the system clipboard on an in-canvas Copy. A later paste
   uses it to tell "the user just copied a canvas object" apart from a stale
   image/link left on the OS clipboard, so the internal node clipboard wins
   instead of the last thing copied elsewhere. Carried in text/html (an invisible
   attribute) so a plain-text paste into another app still gets the node's text. */
const CLIP_MARK = 'data-canvas-clip';

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

// Screen-space padding (px) between a node's rect and its selection outline.
// The outline, its resize handles, and the grid-edit dividers all derive their
// rect from this one value, so they stay concentric — change it here to move the
// outline in/out and the handles follow automatically.
const SEL_PAD = 4;

/* Resolve a `resizeAnchor` spec into {ax, ay} fractions (0..1) of the viewport —
   the point that stays put when the container resizes (e.g. the browser window).
   'top-left' keeps the top-left corner fixed (the historical behaviour), 'center'
   scales symmetrically from the middle, 'bottom-right' pins the bottom-right, etc.
   Accepts any of the 9 named points (single-axis words like 'top' or 'right'
   centre the other axis) or an explicit { x, y } fraction pair. */
const H_FRAC = { left: 0, center: 0.5, middle: 0.5, right: 1 };
const V_FRAC = { top: 0, center: 0.5, middle: 0.5, bottom: 1 };
const clamp01 = (n) => Math.max(0, Math.min(1, Number(n) || 0));
function resolveAnchor(spec) {
  if (spec && typeof spec === 'object') return { ax: clamp01(spec.x), ay: clamp01(spec.y) };
  let ax = null, ay = null;
  for (const p of String(spec || 'top-left').toLowerCase().split(/[\s\-_]+/).filter(Boolean)) {
    if (p === 'top' || p === 'bottom') ay = V_FRAC[p];
    else if (p === 'left' || p === 'right') ax = H_FRAC[p];
    else if (p === 'center' || p === 'middle') { if (ax == null) ax = 0.5; if (ay == null) ay = 0.5; }
  }
  // A single-axis word (e.g. 'top') leaves the other axis centred.
  return { ax: ax == null ? 0.5 : ax, ay: ay == null ? 0.5 : ay };
}

/* Normalise a `scaleWithContainer` spec into a mode string (or null = off).
   `true` → 'min' (contain-like: keeps the same region framed as the box grows
   or shrinks); an explicit 'width' | 'height' | 'min' | 'max' picks which
   axis-ratio drives the zoom. */
function resolveScaleMode(spec) {
  if (spec === true) return 'min';
  if (spec === 'width' || spec === 'height' || spec === 'min' || spec === 'max') return spec;
  return null;
}

/* The zoom factor to apply for a container size change (old W0×H0 → new W×H),
   given a scale mode. 1 = no zoom. */
function resizeScaleFactor(mode, W0, H0, W, H) {
  const rw = W0 ? W / W0 : 1;
  const rh = H0 ? H / H0 : 1;
  if (mode === 'width') return rw;
  if (mode === 'height') return rh;
  if (mode === 'max') return Math.max(rw, rh);
  return Math.min(rw, rh); // 'min' (default): contain-like
}

/* ── Responsive collision-resolution strategies ──────────────────────
   Both take an array of mutable world-space boxes ({ id, x, y, w, h }, x/y the
   authored top-left) and reposition them so none overlap (keeping `gap` between
   them) within a band [originX, originX+availW]. They mutate `x`/`y` in place. */

/* push-down: pin each box's x into the band (pin-left when wider than it), then
   sweep top-to-bottom and drop each box just far enough to clear every already
   placed box it overlaps horizontally. Only the (assumed-free) vertical axis is
   consumed, and authored reading order — top-to-bottom, then left-to-right — is
   preserved. Deterministic; no oscillation. */
function pushDownBoxes(boxes, originX, availW, gap) {
  for (const b of boxes) {
    // Keep the authored x while the box still fits the band; otherwise pin it to
    // the band's left edge so everything that overflows collapses into a tidy
    // left-aligned column (a box wider than the band pins left and overflows right).
    if (b.x < originX || b.x + b.w > originX + availW) b.x = originX;
  }
  boxes.sort((a, b) => a.y - b.y || a.x - b.x);
  const placed = [];
  for (const b of boxes) {
    let y = b.y, moved = true;
    while (moved) {
      moved = false;
      for (const p of placed) {
        const xOverlap = b.x < p.x + p.w + gap && b.x + b.w + gap > p.x;
        if (xOverlap && y < p.y + p.h + gap && y + b.h + gap > p.y) { y = p.y + p.h + gap; moved = true; }
      }
    }
    b.y = y; placed.push(b);
  }
}

/* organic: minimal-displacement resolve. The ONLY thing that makes an object
   move is falling out of the visible box — never merely overlapping another
   object. An object whose authored position sits fully within the box is
   "frozen": it stays exactly where the author put it, so an intentional overlap
   between two in-view objects is preserved, and toggling edit→view at the same
   size moves nothing. An object that overflows the box is "loose": its x is
   pulled in just enough to come back into view, then it drops straight DOWN from
   its authored y until it clears every box already placed (the frozen ones and
   any loose boxes settled before it). So when the container narrows, only the
   objects that no longer fit relocate — flowing downward while keeping the
   board's left-to-right arrangement — rather than reflowing into a grid.

   Objects that overlap in the authored layout are grouped into a rigid CLUSTER
   that reflows as a single unit: the whole group is pulled into view and pushed
   down together to clear other objects, so an intentional overlap is preserved
   exactly (its members never shift relative to each other) yet still routes
   around unrelated objects. `separate` (opt-in) makes every object its own
   cluster, prising all overlaps apart. `rect` is the visible box { x,y,w,h }. */
function organicResolveBoxes(boxes, rect, gap, separate) {
  const bandL = rect.x, bandR = rect.x + rect.w;
  const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  // Union-find the authored overlaps into clusters (each box its own when separating).
  let clusters;
  if (separate) clusters = boxes.map((b) => [b]);
  else {
    const parent = boxes.map((_, i) => i);
    const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    for (let i = 0; i < boxes.length; i += 1) for (let j = i + 1; j < boxes.length; j += 1) if (overlaps(boxes[i], boxes[j])) parent[find(i)] = find(j);
    const groups = new Map();
    boxes.forEach((b, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(b); });
    clusters = [...groups.values()];
  }
  const bboxOf = (c) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const b of c) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  // A cluster fully in view is frozen (members stay authored); one that overflows
  // is pulled in and pushed down as a unit to clear everything already placed.
  const placed = [], loose = [];
  for (const c of clusters) {
    const bb = bboxOf(c);
    if (bb.x >= bandL && bb.x + bb.w <= bandR) { for (const b of c) placed.push(b); }
    else loose.push({ c, bb });
  }
  loose.sort((a, b) => a.bb.y - b.bb.y || a.bb.x - b.bb.x);
  for (const { c, bb } of loose) {
    const maxX = bandR - bb.w;
    const dx = (maxX >= bandL ? Math.min(Math.max(bb.x, bandL), maxX) : bandL) - bb.x; // pull the cluster into view
    let dy = 0, moved = true;
    while (moved) {
      moved = false;
      for (const m of c) {
        const mx = m.x + dx;
        for (const p of placed) {
          const xOver = mx < p.x + p.w + gap && mx + m.w + gap > p.x;
          if (xOver && m.y + dy < p.y + p.h + gap && m.y + dy + m.h + gap > p.y) {
            const need = p.y + p.h + gap - m.y; if (need > dy) { dy = need; moved = true; }
          }
        }
      }
    }
    for (const b of c) { b.x += dx; b.y += dy; placed.push(b); }
  }
}

/* pack: recompute every object's position into a balanced arrangement that fits
   the visible box and is centred within it. Objects are shelf-packed, in their
   authored reading order (top-to-bottom, then left-to-right), into as many
   columns as the box width allows — so the same board is a centred row when
   wide, a centred grid at medium widths, and a centred single column only when
   the box is too narrow to sit two side by side. Each row is centred
   horizontally and the whole block centred vertically, so it reads as a natural
   cluster filling both axes rather than a left-pinned column. `rect` is the
   available world box { x, y, w, h }.

   (A literal force-directed simulation was tried first — gravity toward the
   centre plus pairwise repulsion — but four equal cards settle into a wide
   diamond that overflows the box, and hard containment reintroduces overlaps;
   deterministic shelf-packing gives the balanced, everything-fits result the
   physics sim was chasing, without the instability.) */
function packCenteredBoxes(boxes, rect, gap) {
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  const order = boxes.slice().sort((a, b) => a.y - b.y || a.x - b.x);
  // Greedily fill rows that each fit the box width (always ≥1 box per row).
  const rows = []; let cur = [], curW = 0;
  for (const b of order) {
    const add = (cur.length ? gap : 0) + b.w;
    if (cur.length && curW + add > rect.w) { rows.push(cur); cur = []; curW = 0; }
    cur.push(b); curW += (cur.length > 1 ? gap : 0) + b.w;
  }
  if (cur.length) rows.push(cur);
  const rowH = rows.map((r) => Math.max(...r.map((b) => b.h)));
  const totalH = rowH.reduce((s, h) => s + h, 0) + gap * (rows.length - 1);
  let y = cy - totalH / 2; // centre the block vertically in the box
  rows.forEach((row, ri) => {
    const rowW = row.reduce((s, b) => s + b.w, 0) + gap * (row.length - 1);
    let x = cx - rowW / 2; // centre each row horizontally
    for (const b of row) { b.x = x; b.y = y + (rowH[ri] - b.h) / 2; x += b.w + gap; }
    y += rowH[ri] + gap;
  });
}

/* World-space bounding box of a shape (freehand/vector drawing), so shapes can
   take part in collision reflow alongside nodes. Inflated by half the stroke
   width so a thin line/arrow still reads as overlapping what it crosses. */
function shapeBBox(s) {
  const pad = (s.width || 3) / 2;
  let x0, y0, x1, y1;
  if (s.type === 'pen') {
    if (!s.points || !s.points.length) return null;
    x0 = y0 = Infinity; x1 = y1 = -Infinity;
    for (const p of s.points) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  } else {
    if (s.x1 == null) return null;
    x0 = Math.min(s.x1, s.x2); y0 = Math.min(s.y1, s.y2); x1 = Math.max(s.x1, s.x2); y1 = Math.max(s.y1, s.y2);
  }
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

/* True when two reflow maps describe the same offsets (within a sub-pixel
   tolerance) — so a recompute that lands on the current layout skips the state
   write (and the re-render it would cause). Treats null as an empty map. */
function reflowMapsEqual(a, b) {
  const sizeA = a ? a.size : 0, sizeB = b ? b.size : 0;
  if (sizeA !== sizeB) return false;
  if (!a || !b) return sizeA === 0; // both empty
  for (const [k, v] of a) {
    const w = b.get(k);
    if (!w || Math.abs(w.dx - v.dx) > 0.01 || Math.abs(w.dy - v.dy) > 0.01) return false;
  }
  return true;
}

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

/* Normalise one media asset (kind + src + alt + svg flag). */
function normalizeAsset(a, fallbackKind) {
  const kind = a.kind === 'video' ? 'video' : 'image';
  const svg = kind === 'image' && (a.svg != null ? !!a.svg : isSvgSrc(a.src, a.alt));
  return { kind: a.kind === 'video' || a.kind === 'image' ? a.kind : fallbackKind, src: a.src || '', alt: a.alt || '', svg };
}
/* Media nodes hold an `assets` array (a grid of images/gifs/videos). Boards
   saved before multi-asset support carry a single top-level `src`/`alt`/`svg`;
   up-convert those into a one-element array so old and new snapshots load alike. */
function normalizeAssets(n) {
  if (Array.isArray(n.assets) && n.assets.length) return n.assets.map((a) => normalizeAsset(a, n.type));
  return [normalizeAsset({ src: n.src, alt: n.alt, svg: n.svg }, n.type)];
}
/* Clean a saved grid layout ({ colFr, rowFr }) — the fractional row/column track
   sizes set by the proportion editor. Bad/missing arrays drop the layout so the
   grid falls back to equal tracks. */
function normalizeFrArray(arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  const out = arr.map((v) => (typeof v === 'number' && isFinite(v) && v > 0 ? v : 1));
  return out;
}
function normalizeGrid(g) {
  if (!g) return null;
  const colFr = normalizeFrArray(g.colFr);
  const rowFr = normalizeFrArray(g.rowFr);
  return colFr || rowFr ? { colFr: colFr || [], rowFr: rowFr || [] } : null;
}
/* Clean a saved cmd-drag crop — the visible window into the media's extent as
   fractions ({ x, y, w, h }, window within [0,1]²). Crops saved before offset
   support carry only { w, h } and load anchored top-left. Bad values, or a crop
   showing (nearly) everything, drop back to uncropped. */
function normalizeCrop(c) {
  if (!c) return null;
  const x = Math.max(0, +c.x || 0), y = Math.max(0, +c.y || 0);
  const w = +c.w, h = +c.h;
  if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0 || x + w > 1.001 || y + h > 1.001) return null;
  if (w >= 0.999 && h >= 0.999) return null;
  return { x, y, w, h };
}

function normalizeSaved(n) {
  const base = { id: n.id, type: n.type, x: n.x, y: n.y, z: n.z, anchor: !!n.anchor, ...(n.scale && +n.scale !== 1 ? { scale: +n.scale } : {}) };
  if (n.type === 'frame') return { ...base, w: n.w || 200, h: n.h || 140, name: n.text || 'Section' };
  if (n.type === 'md') return { ...base, w: n.w || 340, text: n.text || '' };
  if (n.type === 'code') return { ...base, w: n.w || 420, text: n.text || '', lang: n.lang || 'js', ...(n.wrap != null ? { wrap: !!n.wrap } : {}) };
  if (n.type === 'sticky') return { ...base, color: n.color || 'yellow', text: n.text || '' };
  if (n.type === 'image' || n.type === 'video') {
    const grid = normalizeGrid(n.grid);
    const crop = normalizeCrop(n.crop);
    return { ...base, w: n.w || (n.type === 'video' ? 320 : 200), h: n.h || (n.type === 'video' ? 180 : 150), assets: normalizeAssets(n), ...(grid ? { grid } : {}), ...(crop ? { crop } : {}), ...(n.frame ? { frame: n.frame } : {}), ...(n.frameUrl ? { frameUrl: n.frameUrl } : {}), ...(n.frameTitle ? { frameTitle: n.frameTitle } : {}), ...(n.frameScale ? { frameScale: n.frameScale } : {}) };
  }
  if (n.type === 'sound') return { ...base, w: n.w || 260, h: n.h || 56, src: n.src || '', name: n.name || '', dur: n.dur || 0 };
  if (n.type === 'html') return { ...base, w: n.w || 800, h: n.h || 500, src: n.src || '', name: n.name || '', ...(n.frame ? { frame: n.frame } : {}), ...(n.frameUrl ? { frameUrl: n.frameUrl } : {}), ...(n.frameTitle ? { frameTitle: n.frameTitle } : {}), ...(n.frameScale ? { frameScale: n.frameScale } : {}) };
  if (n.type === 'link') return { ...base, w: n.w || 280, url: n.url || '', title: n.title || '', desc: n.desc || '', image: n.image || '', siteName: n.siteName || '', favicon: n.favicon || '' };
  const fs = n.fontSize != null ? { fontSize: n.fontSize } : null; // cmd-drag scaled text
  const ff = n.font ? { font: n.font } : null; // serif | sans | mono | script
  const al = n.align && n.align !== 'left' ? { align: n.align } : null; // left | center | right
  // Formatted text keeps its markup alongside the plain mirror; unformatted
  // blocks (and every block saved before rich text) carry `text` alone.
  const rt = n.html ? { html: String(n.html) } : null;
  if (n.w != null) return { ...base, w: n.w, text: n.text || '', ...fs, ...ff, ...al, ...rt }; // resized tblock wraps at its width
  return { ...base, text: n.text || '', ...fs, ...ff, ...al, ...rt }; // tblock
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
  const gridHidden = raw.gridHidden === true;
  // The container size the saved views were framed at, so a load at a different
  // size can reframe the pan/zoom to be relative to the current container (see
  // the boot effect). Absent on boards saved before this was recorded.
  const vp = raw.viewport;
  const savedViewport = vp && vp.w > 0 && vp.h > 0 ? { w: vp.w, h: vp.h } : null;
  return { pagesMeta, pagesData, activePageId, bgColor, gridHidden, brand: base.brand, hadSaved: true, savedViewport };
}

function freshState(base, homeId) {
  return {
    pagesMeta: [{ id: homeId, name: 'Page 1' }],
    pagesData: { [homeId]: { nodes: base.nodes, shapes: base.shapes, view: defaultView() } },
    activePageId: homeId,
    bgColor: null,
    gridHidden: false,
    brand: base.brand,
    hadSaved: false,
    savedViewport: null,
  };
}

/* Resolve the initial board. Priority: editable in-progress edits (localStorage)
   win, then the committed `initialState` snapshot (applies when editable AND
   read-only), then the fresh base layout with its seed content. */
function loadInitial({ base, initialState, editable, storageKey, homeId, managedTypes }) {
  const usable = (s) => s && (Array.isArray(s.nodes) || Array.isArray(s.pages));

  // Unpublished edits take precedence so you can keep iterating in edit mode —
  // unless the committed file carries a newer `savedAt`, which means it was
  // edited outside this browser (e.g. in code) after the last autosave. In that
  // case the file wins so those edits aren't shadowed by stale localStorage.
  if (editable) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (usable(saved)) {
        const committedNewer =
          usable(initialState) && (initialState.savedAt || 0) > (saved.savedAt || 0);
        if (!committedNewer) return buildFromSaved(base, saved, homeId, managedTypes);
      }
    } catch {
      /* ignore corrupt storage */
    }
  }

  // The published snapshot ships with the app and drives the live board.
  if (usable(initialState)) return buildFromSaved(base, initialState, homeId, managedTypes);

  return freshState(base, homeId);
}

/* A node's stored scale multiplier (default 1). The node renders with
   `transform: … scale(s)` about its top-left, so its on-board footprint is
   offsetWidth*s × offsetHeight*s — every screen-space geometry read below
   multiplies by this. */
const nodeScale = (el) => +el.dataset.scale || 1;

/* A node's on-board footprint, [w, h] in world units.

   offsetWidth/offsetHeight are LAYOUT reads: taken after a style write they
   force the browser to flush layout synchronously. The view-sync path does
   exactly that — applyView writes the world transform, then syncChrome /
   syncScrollbars / syncMinimap measure nodes — so every frame of a zoom glide
   paid for a full layout of the world subtree. With a heavy HTML node in the
   tree (a dropped document is a real iframe with its own document to lay out)
   that read alone can dominate the frame.

   The fix is the one awenate uses (`awenate-zoom-gesture`, message-handler.js):
   a node's footprint is expressed in WORLD units, and the world transform is
   what a pan/zoom changes — so these reads cannot return a new value during a
   gesture. `cache` is a Map installed for the life of one gesture and dropped
   at its end, when a fresh measurement re-syncs anything that did change
   underneath (a lazy image landing, an auto-height node settling). */
const nodeBox = (el, cache) => {
  const hit = cache && cache.box.get(el);
  if (hit) return hit;
  const sc = nodeScale(el);
  const box = [el.offsetWidth * sc, el.offsetHeight * sc];
  if (cache) cache.box.set(el, box);
  return box;
};

/* The grid dividers need the node's resolved gaps and padding, in world units.
   getComputedStyle is a style-recalc read and belongs to the same gesture
   window as nodeBox — none of these values can change while only the world
   transform is moving. */
const nodeGridMetrics = (el, cache) => {
  const hit = cache && cache.css.get(el);
  if (hit) return hit;
  const cs = getComputedStyle(el);
  const m = {
    gapX: parseFloat(cs.columnGap) || 0, gapY: parseFloat(cs.rowGap) || 0,
    padL: parseFloat(cs.paddingLeft) || 0, padT: parseFloat(cs.paddingTop) || 0,
    padR: parseFloat(cs.paddingRight) || 0, padB: parseFloat(cs.paddingBottom) || 0,
  };
  if (cache) cache.css.set(el, m);
  return m;
};

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
  classNames = null, // per-part class overrides merged onto the chrome, e.g. { root, canvas, toolbar, topbar, zoom, properties, pages, saveStatus }. See the styling contract in the README.
  components = null, // replace whole chrome pieces: { TopBar, Toolbar, ZoomControls, SaveStatus, Recorder, ContextMenu, Lightbox }. A component swaps the built-in (it reads state via useCanvas()); `null` hides that piece. See the README.
  highlightCode = null, // optional custom code highlighter (src, lang) => html; falls back to the built-in tokeniser
  formatCode = null, // optional code formatter (src, lang, {cursorOffset}) => string | {formatted, cursorOffset}; falls back to the built-in reindenter
  formatOnType: formatOnTypeDefault = true, // initial global default for reformat-on-type (persisted user pref wins)
  onPublish = null,
  onUploadImage = null,
  onUploadVideo = null,
  onUploadAudio = null,
  onUploadHtml = null,
  onUnfurl = null, // optional (url) => { url, title, description, image, siteName, favicon } for pasted-link cards
  onChange = null,
  theme = null, // optional { mode, toggle } — renders a theme button in the top bar
  accent = null, // theme/accent colour: a single CSS colour, or { light, dark } per theme (default: purple)
  fit = 'contain', // 'contain' fills the parent box; 'fullscreen' covers the browser viewport
  ui = true, // set false to hide the overlay panels (top bar, toolbar, zoom, context menu)
  fullscreenButton = false, // show a button next to the zoom controls that expands the canvas. true / 'native' = the browser Fullscreen API (covers the whole screen, escapes the page); 'document' = a full-bleed overlay that covers the document's viewport but stays inside the page (Esc exits).
  initialView = null, // 'fit' frames all content on mount instead of restoring the saved pan/zoom
  resizeAnchor = 'top-left', // which point of the board stays fixed when the container resizes: one of the 9 named points ('top-left','top','top-right','left','center','right','bottom-left','bottom','bottom-right') or an { x, y } fraction pair. 'top-left' = the historical behaviour.
  scaleWithContainer = false, // zoom the board in/out as the container grows/shrinks (scaling about `resizeAnchor`). false = constant zoom; true = 'min' (contain-like, keeps the same region framed); or pick the driving axis-ratio with 'width' | 'height' | 'min' | 'max'.
  saveStatus = true, // show the background-save status indicator (bottom-right) while editing
  cooperativeGestures = false, // opt-in: in VIEW mode, let the page scroll past — plain wheel scrolls the page (⌘/Ctrl+wheel zooms), one finger scrolls the page (two fingers pan/zoom). Automatically inactive while EDITING (readOnly false), where authoring needs full gesture control — so a board that toggles between view/edit cooperates only in view mode.
  clickToInteract = false, // gate the board behind a "Click to interact" overlay: locked = the page scrolls past untouched; click unlocks normal pan/zoom; scrolling the page / clicking off / Esc relocks. Supersedes the cooperativeGestures hints.
  collide = false, // reposition objects so they don't overlap when the responsive width band can't fit their authored layout. Positions are DERIVED (never persisted) so the board snaps back when the container grows again. View-mode only. Pairs with a pinned horizontal view (see resizeAnchor/scaleWithContainer).
  collideStrategy = 'organic', // 'organic' = minimal-displacement: keep every object at its authored position and move only what overlaps / falls out of view, preserving the board's arrangement (nothing moves if it already fits); 'push-down' = pin x into the band and push overlaps down the vertical axis, preserving reading order (grows downward); 'pack' = recompute all positions into a balanced grid centred in the visible box.
  layoutWidth = 'viewport', // the responsive band's width: 'viewport' (the container's width in world units, so it tracks resizes / scaleWithContainer) or an explicit number of world px.
  collideGap = 16, // minimum gap (world px) kept between repositioned objects.
  collideOrigin = 'content', // the band's left edge: 'content' (the left-most object) or an explicit world x.
  collideSeparate = false, // ('organic' strategy) also prise apart INTENTIONAL overlaps when reflowing. Default false: reflow still routes objects around collisions it would create, but overlaps present in the authored layout are kept. Set true to separate every overlap.
  scrollbars = false, // show a scrollbar on an axis only while content extends past the viewport on that axis (auto-hides when everything fits). false = never; 'auto' = both axes; 'x' or 'y' = that axis only. The board is a transform pan/zoom surface (not a native scroller), so each bar is a screen-space overlay whose thumb is draggable to pan that axis.
  minimap = false, // show a low-fidelity overview of the current page (bottom-right) with a rectangle marking the current viewport. Click the map to recenter there; drag the rectangle to pan. false = hidden; true = show at the default size; or an object { width, height, padding } to size it — width/height accept any CSS length ('220px', '18%', '12em', '15vw', …) or a bare number (px), padding is the inner margin in px.
}) {
  const EDITABLE = editable;
  const COOP = cooperativeGestures;
  const CLICK_TO_INTERACT = clickToInteract;
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
    return getGlobalReadOnly();
  });
  const [editingId, setEditingId] = useState(null);
  // Click-to-interact engagement: false = locked (page scrolls past), true =
  // unlocked (normal pan/zoom). Mirrored to engagedRef so the imperative window
  // gesture handlers (bound once) read the live value.
  const [engaged, setEngagedState] = useState(false);
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
  const [fullscreen, setFullscreen] = useState(null); // { id, index } of the media asset shown in the lightbox
  const [gridEditId, setGridEditId] = useState(null); // media node whose grid proportions are being edited
  const [renameFrameId, setRenameFrameId] = useState(null); // frame whose label is being renamed inline (double-click or the context menu's Rename)
  const [htmlActiveId, setHtmlActiveId] = useState(null); // html node whose iframe is live (receives pointer events)
  /* The section the user last navigated to (frame-label arrow or the page/section
     menu). It anchors the arrow-key shortcut that steps to the neighbouring
     section; null means no section is focused and the arrows stay with the page.
     One setter keeps the ref (read by the window key handler) and the state (for
     the menu's focused marker) in lockstep. */
  const [focusedSectionId, setFocusedSectionIdState] = useState(null);
  const focusedSectionRef = useRef(null);
  const setFocusedSectionId = (v) => { focusedSectionRef.current = v; setFocusedSectionIdState(v); };
  const [fullBleed, setFullBleed] = useState(false); // `fullscreenButton="document"` overlay: covers the document's viewport (portaled to body so an ancestor transform can't trap it)
  const [nativeFullscreen, setNativeFullscreen] = useState(false); // this canvas owns the browser Fullscreen API (via `fullscreenButton` native mode)
  const [bgColor, setBgColor] = useState(init.bgColor || null); // board-wide background override (null = theme default)
  const [gridHidden, setGridHidden] = useState(init.gridHidden || false); // board-wide dot-grid toggle (false = grid shown)
  const [reflow, setReflow] = useState(null); // Map<id,{x,y}> of derived positions from the collision resolver (null = objects at authored positions). Not persisted.
  const [publishState, setPublishState] = useState('idle'); // idle|saving|done|error
  const [recording, setRecording] = useState(null); // {} while capturing mic audio, else null
  const recRef = useRef(null); // { rec: MediaRecorder, stream, cancelled } during a recording
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
  const engagedRef = useRef(false);      // live mirror of `engaged` for the window gesture handlers
  // Single setter keeps the ref and state in lockstep (ref for the imperative
  // handlers, state to re-render the overlay).
  const setEngaged = (v) => { engagedRef.current = v; setEngagedState(v); };
  // Live mirror of `maximized` (see below) for the window gesture handlers, so
  // they can suspend the cooperative/click-to-interact scroll lock while the
  // board covers the whole screen/document (there's no page behind it to scroll).
  const maximizedRef = useRef(false);
  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const zoomLabelRef = useRef(null);
  const chromeRef = useRef({ sel: null, del: null, edit: null, rz: null, hov: null, marq: null, grid: null, guides: null });
  const chrome = chromeRef.current;
  const gridGeomRef = useRef(null); // { id, colFr, rowFr } of the grid being proportion-edited
  const nodeEls = useRef(new Map()).current; // id → element
  const mediaEls = useRef(new Map()).current; // id → inline <video> element (for lightbox playback hand-off)
  const shapeEls = useRef(new Map()).current; // id → shape svg child (.shape)
  const frameLabelEls = useRef(new Map()).current; // id → label element
  const clipboard = useRef(null); // copied [{kind,data}] items, for paste
  const pasteCount = useRef(0); // cascades each successive paste of the same clipboard

  /* Full per-page data for every board. The active page's live data lives in the
     React state above; the others are parked here until switched to. */
  const pageData = useRef(init.pagesData).current;

  /* Undo / redo. History is kept per page (each board undoes independently) and
     tracks only the content model (nodes + shapes) — the model is treated
     immutably throughout the engine (every mutation replaces the array and the
     changed objects), so a snapshot is just the current array references, no
     deep copy needed. `restoring` guards the recorder while an undo/redo applies
     its snapshot so the restore itself isn't recorded as a new change. */
  const history = useRef({ byPage: {}, restoring: false }).current;

  const viewRef = useRef({ ...active0.view }).current;
  const targetRef = useRef({ ...active0.view }).current;
  // Where the board scales from on a container resize, and the last measured
  // viewport size to diff against. Captured once, like the other view config.
  const RESIZE_ANCHOR = useRef(resolveAnchor(resizeAnchor)).current;
  const SCALE_MODE = useRef(resolveScaleMode(scaleWithContainer)).current;
  // Responsive collision resolver config (captured once, like the view config).
  const COLLIDE = useRef(!!collide).current;
  const COLLIDE_STRATEGY = useRef(collideStrategy === 'push-down' ? 'push-down' : (collideStrategy === 'pack' || collideStrategy === 'force') ? 'pack' : 'organic').current; // 'force' → 'pack'; anything else → 'organic'
  const LAYOUT_WIDTH = useRef(layoutWidth).current;
  const COLLIDE_GAP = useRef(Number(collideGap) || 0).current;
  const COLLIDE_ORIGIN = useRef(collideOrigin).current;
  const COLLIDE_SEPARATE = useRef(!!collideSeparate).current;
  // Which axes get a synthetic scrollbar (captured once, like the view config).
  const SCROLLBARS = useRef({ x: scrollbars === 'auto' || scrollbars === 'x', y: scrollbars === 'auto' || scrollbars === 'y' }).current;
  // Live handles to the scrollbar overlay DOM (Canvas.jsx attaches them via ref
  // callbacks); syncScrollbars writes geometry straight to these, off React's
  // render path like the rest of the chrome.
  const scrollEls = useRef({ trackX: null, thumbX: null, trackY: null, thumbY: null }).current;
  // Minimap: opt-in overview panel (captured once, like the scrollbar config).
  // Fixed panel size in CSS px; the low-fi content is drawn into a <canvas> and
  // the viewport rectangle is a positioned div, both attached by the Minimap
  // component via ref callbacks and written to imperatively (off React).
  // The panel's size is applied as CSS (any unit — px, %, em, vw, …); a bare
  // number is treated as px. The drawing/mapping reads the element's resolved
  // pixel size back at paint time, so non-px units and container/font resizes
  // Just Work (a ResizeObserver repaints on size change). `padding` is the inner
  // margin (CSS px) around the low-fi content.
  const cssSize = (v, dflt) => (v == null ? dflt : typeof v === 'number' ? v + 'px' : String(v));
  const MINIMAP = useRef(
    minimap
      ? {
          on: true,
          width: cssSize(minimap.width, '164px'),
          height: cssSize(minimap.height, '116px'),
          pad: Number.isFinite(minimap.padding) ? minimap.padding : 8,
        }
      : { on: false }
  ).current;
  const minimapEls = useRef({ panel: null, canvas: null, view: null }).current;
  // Cached mapping from the last content redraw: the padded world universe and
  // the world→minimap-pixel scale `k`. syncMinimap reads this to place the
  // viewport rectangle without recomputing bounds on every pan/zoom.
  const minimapRef = useRef(null); // { uMinX, uMinY, k, boxW, boxH } or null when empty
  const minimapRAF = useRef(0); // debounces content redraws to one run per frame
  const reflowRAF = useRef(0); // debounces reflowObjects to one run per frame
  const lastVpSize = useRef(null); // latest measured container size {w,h}
  const reframing = useRef(false); // true while reframeOnResize applies, so applyView doesn't re-capture the reference
  // The CANONICAL reference {w,h,x,y,scale}: the container size + view of the
  // last deliberate framing (edit-mode pan/zoom/fit, or the loaded snapshot).
  // Resizes reframe the DISPLAY from this but never overwrite it, so:
  //   • the persisted view stays anchored to the size it was framed at, and a
  //     shrink → refresh → grow round-trips back to the exact same zoom (a
  //     re-baseline at the shrunken size would let 'min'/'max' pick a different
  //     axis on the way back and drift, e.g. 112% → 88%);
  //   • a scale that clamped at a tiny size still recovers, since we recompute
  //     from the reference, not the clamped value.
  // Seeded from the saved viewport size so a reload reframes to the current
  // container; re-captured on genuine edit-mode framings (see applyView).
  const framedRef = useRef(
    init.savedViewport
      ? { w: init.savedViewport.w, h: init.savedViewport.h, x: active0.view.x, y: active0.view.y, scale: active0.view.scale }
      : null
  );
  const actionRef = useRef(null);
  const zoomRAF = useRef(0);
  const waTimer = useRef(0);
  /* Measurement cache for the life of one pan/zoom gesture, else null — see
     nodeBox. Installed by beginGesture, dropped by endGesture. */
  const geomCache = useRef(null);
  const zoomPaintMode = useRef(null); // last { active, scale } posted to the HTML nodes' documents
  const saveT = useRef(0);
  const lastHoverScale = useRef(active0.view.scale || 1); // scale at the last applyView, to tell pan from zoom
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
  S.fullscreen = fullscreen;
  S.gridEditId = gridEditId;
  S.htmlActiveId = htmlActiveId;
  S.recording = recording;
  S.pages = pages;
  S.activePageId = activePageId;
  S.bgColor = bgColor;
  S.gridHidden = gridHidden;
  S.reflow = reflow;

  /* ── Engine (defined once; reads fresh state via refs/S) ─────── */
  const eng = useMemo(() => {
    const nextZ = () => ++zTop.current;
    const backZ = () => --zBot.current;

    function applyView() {
      const w = worldRef.current, vp = viewportRef.current;
      if (!w || !vp) return;
      // A deliberate framing (user pan/zoom, fit) at the current size becomes the
      // canonical reference that later resizes reframe from. Captured in BOTH
      // modes so a visitor's view-mode pan/zoom survives a container resize
      // instead of snapping back to the last edit-mode framing (persisting the
      // change stays edit-only, see below). Never captured during a resize
      // reframe (`reframing`) — that would re-baseline and break reversibility.
      // Uses the cached size, so no layout read on the pan path.
      if (!reframing.current && lastVpSize.current) {
        framedRef.current = { w: lastVpSize.current.w, h: lastVpSize.current.h, x: viewRef.x, y: viewRef.y, scale: viewRef.scale };
      }
      w.style.transform = `translate(${viewRef.x}px,${viewRef.y}px) scale(${viewRef.scale})`;
      const step = GRID * viewRef.scale;
      vp.style.setProperty('--cv-gx', (viewRef.x % step) + 'px');
      vp.style.setProperty('--cv-gy', (viewRef.y % step) + 'px');
      vp.style.backgroundSize = step + 'px ' + step + 'px';
      if (zoomLabelRef.current) zoomLabelRef.current.textContent = Math.round(viewRef.scale * 100) + '%';
      // Panning clears the hover outline (it would otherwise cling to the object
      // as the view slides); zooming keeps it, since placeHover just re-fits it
      // around the same object. A zoom always changes the scale, a pan doesn't.
      if (viewRef.scale === lastHoverScale.current) S.hoverId = null;
      lastHoverScale.current = viewRef.scale;
      syncChrome();
      syncScrollbars();
      syncMinimap();
      // View-mode pan/zoom is transient (snapshotActive keeps the saved view),
      // so only edit-mode view changes need to hit the autosave. Also commit the
      // new framing to the published snapshot in the background — but not on the
      // boot-time apply, which would rewrite the board on every load. Resize
      // reframes are skipped too (reframing): they don't change the canonical
      // reference, so there's nothing new to persist.
      if (!S.readOnly && !reframing.current) {
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

    /* Called whenever the container resizes (and once at boot to reframe a loaded
       view). Two behaviours compose here, both pivoting about `resizeAnchor`
       (ax, ay as viewport fractions):

         • Reposition — the world transform is anchored at the viewport's
           top-left, so left unadjusted the board stays pinned there as the box
           grows/shrinks. The anchor fraction decides which point stays put:
           0 (left/top) = no shift, 0.5 = follow the centre, 1 = pin the
           right/bottom edge.
         • Rescale — when `scaleWithContainer` is on, the zoom tracks the size
           change (factor `f`) so the board grows/shrinks with its container.

       Both reduce to one pivot formula, computed against the canonical
       reference `base` (framedRef: its size + view), NOT the previous frame and
       NOT the reframed display. Deriving from a reference that resizes never
       move keeps it reversible — shrinking one axis to nothing and growing it
       back returns to exactly the reference view, even across a page refresh
       (a re-baseline at the shrunken size would let 'min'/'max' pick a different
       axis on the way back and drift) — and clamp-safe: a scale that saturated
       at a tiny size still recovers, since we recompute from the reference
       rather than the clamped value. The reference is (re)captured only on
       genuine edit-mode framings (see applyView); the first call just seeds it. */
    function reframeOnResize() {
      const W = vpW(), H = vpH();
      if (!W || !H) return; // not laid out yet — wait for a real measurement
      lastVpSize.current = { w: W, h: H };
      const base = framedRef.current;
      if (!base) { framedRef.current = { w: W, h: H, x: viewRef.x, y: viewRef.y, scale: viewRef.scale }; return; }
      // While maximised (native fullscreen, or the full-bleed overlay) the board
      // owns the whole screen, so the configured resize anchor no longer applies:
      // pivot about the centre instead, so whatever was framed in the embedded
      // viewport stays centred in the maximised one. Because the reframe derives
      // from the canonical reference (not the displayed frame), un-maximising —
      // which reframes at the embedded size with the configured anchor again —
      // still restores the original embedded framing exactly.
      const { ax, ay } = maximizedRef.current ? { ax: 0.5, ay: 0.5 } : RESIZE_ANCHOR;
      const f = SCALE_MODE ? resizeScaleFactor(SCALE_MODE, base.w, base.h, W, H) : 1;
      const s1 = SCALE_MODE ? clampScale(base.scale * f) : base.scale;
      const k = s1 / base.scale; // effective factor after zoom clamping (1 when scaling off)
      const nx = ax * W - (ax * base.w - base.x) * k;
      const ny = ay * H - (ay * base.h - base.y) * k;
      if (nx === viewRef.x && ny === viewRef.y && s1 === viewRef.scale) { syncChrome(); return; }
      reframing.current = true; // this view derives FROM the reference — don't let applyView overwrite it
      viewRef.x = nx; viewRef.y = ny; viewRef.scale = s1;
      targetRef.x = nx; targetRef.y = ny; targetRef.scale = s1;
      applyView(); // repaints the transform + chrome
      reframing.current = false;
      scheduleReflow(); // the band width changed → re-resolve collisions
    }

    /* ── Responsive collision resolver ────────────────────────────
       When `collide` is on, objects whose authored layout no longer fits the
       responsive width band are repositioned so they don't overlap. The result
       is published into the `reflow` map (consumed by useRegister) and NEVER
       written to the node model, so authored positions stay pristine and the
       board snaps back when the container grows again — mirroring how a resize
       reframes the camera from a canonical reference without overwriting it.
       View-mode only: while editing, authoring happens at base positions. */
    function reflowObjects() {
      if (!COLLIDE) return;
      // Only reflow a settled, non-editing view. Otherwise release any overlay
      // so the author sees (and drags) the real, authored positions.
      if (!S.readOnly || S.editingId) { if (S.reflow) setReflow(null); return; }
      // Each box carries its authored top-left (ax, ay) so the final offset is a
      // delta from where it started — nodes and shapes then move by the same
      // {dx, dy}, and a shape that overlaps a node clusters and moves with it.
      const boxes = [];
      for (const n of S.nodes) {
        // Frames are section/background regions that content sits inside — they
        // neither push nor get pushed.
        if (n.type === 'frame') continue;
        const el = nodeEls.get(n.id); if (!el) continue;
        const sc = nodeScale(el);
        // Authored x/y come from the MODEL (the DOM dataset may already hold a
        // prior reflow); w/h are measured from the DOM (translate doesn't affect
        // offset size, so the reading is stable whatever the current overlay).
        boxes.push({ id: n.id, x: n.x, y: n.y, ax: n.x, ay: n.y, w: el.offsetWidth * sc, h: el.offsetHeight * sc });
      }
      for (const sh of S.shapes) {
        const bb = shapeBBox(sh); if (!bb) continue;
        boxes.push({ id: sh.id, x: bb.x, y: bb.y, ax: bb.x, ay: bb.y, w: bb.w, h: bb.h });
      }
      if (!boxes.length) { if (S.reflow) setReflow(null); return; }
      const s = viewRef.scale || 1;
      if (COLLIDE_STRATEGY === 'push-down') {
        const availW = LAYOUT_WIDTH === 'viewport' ? vpW() / s : (Number(LAYOUT_WIDTH) || Infinity);
        const originX = COLLIDE_ORIGIN === 'content' ? Math.min(...boxes.map((b) => b.x)) : (Number(COLLIDE_ORIGIN) || 0);
        pushDownBoxes(boxes, originX, availW, COLLIDE_GAP);
      } else {
        // 'organic' (default) and 'pack' both work within the visible viewport,
        // mapped to world coords and inset by a gap so objects don't hug the edges.
        const pad = COLLIDE_GAP;
        const rect = {
          x: -viewRef.x / s + pad,
          y: -viewRef.y / s + pad,
          w: Math.max(1, vpW() / s - 2 * pad),
          h: Math.max(1, vpH() / s - 2 * pad),
        };
        if (COLLIDE_STRATEGY === 'pack') packCenteredBoxes(boxes, rect, COLLIDE_GAP);
        else organicResolveBoxes(boxes, rect, COLLIDE_GAP, COLLIDE_SEPARATE);
      }
      const map = new Map();
      for (const b of boxes) {
        const dx = b.x - b.ax, dy = b.y - b.ay;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) map.set(b.id, { dx, dy });
      }
      if (!reflowMapsEqual(map, S.reflow)) setReflow(map.size ? map : null);
    }
    /* Coalesce bursts of resize callbacks into one reflow per frame. */
    function scheduleReflow() {
      if (!COLLIDE || reflowRAF.current) return;
      reflowRAF.current = requestAnimationFrame(() => { reflowRAF.current = 0; reflowObjects(); });
    }

    /* ── Gesture window ───────────────────────────────────────────
       A gesture is a stretch of frames during which the world moves but nothing
       in it changes, which lets two costs be suspended for the duration. They
       have different scopes, so they're tracked separately (as they are in
       awenate, which sends `awenate-zoom-gesture` for the first on any gesture
       and `awenate-zoom-paint-opts` for the second on zoom edges only):

         • Layout — suspended on ANY pan or zoom. Node footprints are cached
           (see nodeBox) instead of being re-measured after every transform
           write. Nothing about a node's world-space box depends on where the
           camera is, so this holds for panning just as well.
         • Paint, inside HTML nodes — suspended on the ZOOM GLIDE ONLY. A
           dropped document is a live iframe with its own render tree, and the
           glide deliberately leaves the world un-promoted so every frame
           re-rasterizes crisply (see zoomLoop) — which means repainting that
           whole document, per frame. A pan (and a pinch) instead promotes the
           world to its own layer and composites on the GPU: nothing repaints,
           so there is nothing to optimise, and stripping shadows there would
           only make them visibly blink off as the board slides.

       Both are released at the end of the gesture, and the release re-measures
       and repaints — so anything that did settle underneath (a lazy image, an
       auto-height node) is picked up exactly once, at rest. */
    function beginGesture() {
      if (geomCache.current) return;
      geomCache.current = { box: new Map(), css: new Map() };
    }
    /* Drop the cached measurements without closing the gesture. For the case
       the "nothing changes during a gesture" premise doesn't cover: the content
       model itself mutating mid-glide. Next read re-measures. */
    function invalidateGeom() {
      const c = geomCache.current; if (!c) return;
      c.box.clear(); c.css.clear(); delete c.bounds;
    }
    function endGesture() {
      if (!geomCache.current) return;
      geomCache.current = null;
      // Fresh measurements now that the cache is gone: re-align the chrome,
      // scrollbars and minimap with whatever the content actually settled at.
      syncChrome(); syncScrollbars(); syncMinimap();
      // A pinch changes the scale without ever running the zoom loop, so the
      // settled scale has to be republished here too (deduped by postZoomState).
      postZoomState(false);
    }
    /* Tell every embedded document the board's gesture state and settled scale.
       The handler is baked into each document at ingest — see ZOOM_OPTS, which
       explains what each is used for. Deduped: identical state is not re-posted,
       and a scale change under half a percent isn't worth a message. */
    function postZoomState(active) {
      const scale = viewRef.scale;
      const last = zoomPaintMode.current;
      if (last && last.active === active && Math.abs(last.scale - scale) < 0.005) return;
      zoomPaintMode.current = { active, scale };
      const root = rootRef.current; if (!root) return;
      for (const f of root.querySelectorAll('.cv-html-frame')) {
        if (f.contentWindow) f.contentWindow.postMessage({ type: 'canvas-zoom', active, scale }, '*');
      }
    }
    /* Seed one freshly loaded frame. The broadcast above only fires on gesture
       edges, so a document that mounts on a board nobody has touched would sit
       in its safe default (frost off) forever — and a board is usually opened,
       looked at, and never zoomed. Called from Html.jsx's onLoad. */
    function postZoomStateTo(frame) {
      if (!frame || !frame.contentWindow) return;
      const last = zoomPaintMode.current;
      frame.contentWindow.postMessage(
        { type: 'canvas-zoom', active: !!(last && last.active), scale: viewRef.scale },
        '*'
      );
    }

    /* smooth zoom glide */
    function markActive() {
      const w = worldRef.current; if (!w) return;
      w.style.willChange = 'transform';
      beginGesture();
      clearTimeout(waTimer.current);
      waTimer.current = setTimeout(() => {
        w.style.willChange = 'auto';
        // A zoom glide runs its own gesture window; only end one here if the
        // pan/pinch that opened it is the last thing still holding it.
        if (!zoomRAF.current) endGesture();
      }, 280);
    }
    function stopZoomLoop() {
      if (zoomRAF.current) { cancelAnimationFrame(zoomRAF.current); zoomRAF.current = 0; }
      if (worldRef.current) worldRef.current.style.willChange = 'auto';
      postZoomState(false);
      endGesture();
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
      // Land the view first, then close the gesture — stopZoomLoop's release
      // re-measures against the final transform, not the second-to-last frame.
      if (done) { snapView(); stopZoomLoop(); return; }
      // Keep the world un-promoted (will-change: auto) through the glide so the
      // browser re-rasterizes it crisply at the current scale on every frame,
      // rather than GPU-stretching one cached bitmap (which blurs) until the
      // scale drifts past a threshold. Constant re-raster = sharp all the way.
      applyView();
      zoomRAF.current = requestAnimationFrame(zoomLoop);
    }
    function startZoomLoop() {
      clearTimeout(waTimer.current);
      // Un-promoted layer → every zoomLoop frame paints fresh at the live scale.
      if (worldRef.current) worldRef.current.style.willChange = 'auto';
      beginGesture();
      postZoomState(true);
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
    /* Touch pinch: zoom about the two-finger midpoint by `factor` and pan by the
       midpoint drift, applied straight to the displayed frame (no eased glide) so
       the board tracks the fingers 1:1. */
    function pinchBy(sx, sy, factor, panX, panY) {
      stopZoomLoop();
      const r = viewportRef.current.getBoundingClientRect(), px = sx - r.left, py = sy - r.top;
      const old = viewRef.scale, ns = clampScale(old * factor), k = ns / old;
      viewRef.x = px * (1 - k) + viewRef.x * k + panX;
      viewRef.y = py * (1 - k) + viewRef.y * k + panY;
      viewRef.scale = ns;
      targetRef.x = viewRef.x; targetRef.y = viewRef.y; targetRef.scale = ns;
      applyView(); markActive();
    }

    /* ── Chrome (screen-space selection UI) ───────────────────── */
    function worldRectOf(sel) {
      if (sel.kind === 'node') {
        const n = nodeEls.get(sel.id); if (!n) return null;
        const [w, h] = nodeBox(n, geomCache.current);
        return [+n.dataset.x, +n.dataset.y, w, h];
      }
      const el = shapeEls.get(sel.id); if (!el) return null;
      const bb = el.getBBox();
      // getBBox ignores the transient translate a shape carries mid-drag, and the
      // collision-reflow offset (applied on its SVG wrapper), so add both.
      const a = actionRef.current;
      const moving = a && a.type === 'move' && a.items.some((it) => it.kind === 'shape' && it.id === sel.id);
      const rp = S.reflow && S.reflow.get(sel.id);
      const rdx = rp ? rp.dx : 0, rdy = rp ? rp.dy : 0;
      return [bb.x + (moving ? a.dx || 0 : 0) + rdx, bb.y + (moving ? a.dy || 0 : 0) + rdy, bb.width, bb.height];
    }
    function hideSelChrome() {
      for (const k of ['sel', 'rz']) if (chrome[k]) chrome[k].style.display = 'none';
    }
    function placeSel(x, y, w, h) {
      const s = viewRef.scale, sx = viewRef.x + x * s, sy = viewRef.y + y * s, sw = w * s, sh = h * s;
      // The outlined rect: node rect grown by SEL_PAD on every side. Both the
      // outline and the resize container below use ox/oy/ow/oh so the handles
      // always centre on the outline regardless of the pad.
      const ox = sx - SEL_PAD, oy = sy - SEL_PAD, ow = sw + SEL_PAD * 2, oh = sh + SEL_PAD * 2;
      chrome.sel.style.display = 'block';
      // Sit SEL_PAD px outside the node rect so the 2px border hugs the object's
      // edge, matching the hover outline (see placeHover).
      chrome.sel.style.left = ox + 'px'; chrome.sel.style.top = oy + 'px';
      chrome.sel.style.width = ow + 'px'; chrome.sel.style.height = oh + 'px';
      /* The resize affordances only make sense for a single selected node. */
      const single = S.selected.length === 1 ? S.selected[0] : null;
      const nodeEl = single && single.kind === 'node' ? nodeEls.get(single.id) : null;
      const type = nodeEl ? nodeEl.dataset.type : null;
      const editing = type && S.editingId === single.id;
      // Scale mode shows corner handles on ANY node (even stickies / sound,
      // which have no resize handles otherwise) — dragging a corner scales it.
      const scaling = type && S.tool === 'scale';
      const resizable = type === 'frame' || type === 'md' || type === 'code' || type === 'tblock' || type === 'image' || type === 'video' || type === 'link' || type === 'html';
      if ((scaling || resizable) && !editing) {
        // The rz container spans the node's screen rect; CSS pins a handle to
        // each corner (see .cv-rz-h). data-mode drives which handles show + cursors.
        chrome.rz.style.display = 'block';
        chrome.rz.style.left = ox + 'px'; chrome.rz.style.top = oy + 'px';
        chrome.rz.style.width = ow + 'px'; chrome.rz.style.height = oh + 'px';
        chrome.rz.dataset.mode = scaling ? 'scale' : (type === 'md' || type === 'code' || type === 'tblock' || type === 'link' ? 'ew' : 'xy');
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
      const x = +el.dataset.x, y = +el.dataset.y;
      const [w, h] = nodeBox(el, geomCache.current);
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
    /* Position the media grid's proportion-editing dividers. Drawn in the
       screen-space chrome layer (not inside the zoomed node) so the divider
       stroke keeps a constant thickness at any zoom. Each divider tracks a
       fraction boundary of the node's on-screen rect. */
    function setGridEditGeom(geom) { gridGeomRef.current = geom; }
    function placeGridEdit() {
      const wrap = chrome.grid; if (!wrap) return;
      const geom = gridGeomRef.current;
      const el = geom ? nodeEls.get(geom.id) : null;
      if (!geom || !el || S.readOnly) { wrap.style.display = 'none'; return; }
      const x = +el.dataset.x, y = +el.dataset.y;
      const [w, h] = nodeBox(el, geomCache.current);
      const s = viewRef.scale, sx = viewRef.x + x * s, sy = viewRef.y + y * s, sw = w * s, sh = h * s;
      wrap.style.display = 'block';
      const totalC = geom.colFr.reduce((a, b) => a + b, 0) || 1;
      const totalR = geom.rowFr.reduce((a, b) => a + b, 0) || 1;
      const cols = geom.colFr.length, rows = geom.rowFr.length;
      // CSS grid lays the fractional tracks inside the box *after* subtracting the
      // gaps (and any padding); the divider must sit in the middle of the actual
      // gap, not at the plain fraction split of the whole box — otherwise it drifts
      // off the gap as the tracks become unequal. Read the live gap/padding and
      // place each divider at its gap centre.
      const cs = nodeGridMetrics(el, geomCache.current);
      const gapX = cs.gapX * s, gapY = cs.gapY * s;
      const padL = cs.padL * s, padT = cs.padT * s;
      const padR = cs.padR * s, padB = cs.padB * s;
      const trackW = sw - padL - padR - gapX * (cols - 1);
      const trackH = sh - padT - padB - gapY * (rows - 1);
      // Match the selection outline, which sits SEL_PAD px outside the node rect
      // (see placeSel) — so each divider spans the full outlined box, edge to edge.
      // Everything is sized/centred explicitly here (no CSS transform) so the two
      // axes stay symmetric and a divider can't be shifted by a stray transform.
      const HIT = 15; // grab-strip thickness
      for (const child of wrap.children) {
        const axis = child.dataset.axis, k = +child.dataset.k;
        if (axis === 'col') {
          let acc = 0; for (let i = 0; i <= k; i += 1) acc += geom.colFr[i];
          const cx = sx + padL + (acc / totalC) * trackW + k * gapX + gapX / 2;
          child.style.left = (cx - HIT / 2) + 'px'; child.style.width = HIT + 'px';
          child.style.top = (sy - SEL_PAD) + 'px'; child.style.height = (sh + SEL_PAD * 2) + 'px';
        } else {
          let acc = 0; for (let i = 0; i <= k; i += 1) acc += geom.rowFr[i];
          const cy = sy + padT + (acc / totalR) * trackH + k * gapY + gapY / 2;
          child.style.top = (cy - HIT / 2) + 'px'; child.style.height = HIT + 'px';
          child.style.left = (sx - SEL_PAD) + 'px'; child.style.width = (sw + SEL_PAD * 2) + 'px';
        }
      }
    }
    function syncChrome() {
      const s = viewRef.scale;
      frameLabelEls.forEach((label, id) => {
        const f = nodeEls.get(id); if (!f) return;
        label.style.left = (viewRef.x + +f.dataset.x * s) + 'px';
        label.style.top = (viewRef.y + +f.dataset.y * s - 28) + 'px';
      });
      placeHover();
      placeGridEdit();
      placeSnapGuides();
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

    /* ── Synthetic scrollbars ─────────────────────────────────────
       Opt-in via `scrollbars`. The board pans/zooms by transforming the world,
       so there's no native scroller — each bar is a screen-space overlay whose
       thumb reflects the currently visible world span against the union of the
       content bounds and that visible span. A bar is shown only while its axis
       overflows the viewport (content off-canvas), and hidden the moment
       everything fits. Written imperatively (like syncChrome) so a pan/zoom
       storm never hits React. */
    function syncScrollbars() {
      if (!SCROLLBARS.x && !SCROLLBARS.y) return;
      const s = viewRef.scale || 1;
      const b = bounds();
      const place = (axis) => {
        const on = axis === 'x' ? SCROLLBARS.x : SCROLLBARS.y;
        const track = axis === 'x' ? scrollEls.trackX : scrollEls.trackY;
        const thumb = axis === 'x' ? scrollEls.thumbX : scrollEls.thumbY;
        if (!on || !track || !thumb) return;
        // Visible world span on this axis (the viewport mapped back into world).
        const visStart = axis === 'x' ? -viewRef.x / s : -viewRef.y / s;
        const visLen = (axis === 'x' ? vpW() : vpH()) / s;
        const cMin = b ? (axis === 'x' ? b.minX : b.minY) : visStart;
        const cMax = b ? (axis === 'x' ? b.maxX : b.maxY) : visStart + visLen;
        // Off-canvas on this axis? (half-px slack absorbs rounding.)
        const overflow = !!b && (cMin < visStart - 0.5 || cMax > visStart + visLen + 0.5);
        if (!overflow) { track.removeAttribute('data-visible'); return; }
        // Thumb = the visible span as a fraction of the whole scrollable universe
        // (content ∪ view), so it stays grabbable even when panned past content.
        const uMin = Math.min(cMin, visStart), uMax = Math.max(cMax, visStart + visLen);
        const span = uMax - uMin || 1;
        const startFrac = (visStart - uMin) / span;
        const sizeFrac = Math.min(1, visLen / span);
        track.setAttribute('data-visible', '');
        if (axis === 'x') { thumb.style.left = startFrac * 100 + '%'; thumb.style.width = sizeFrac * 100 + '%'; }
        else { thumb.style.top = startFrac * 100 + '%'; thumb.style.height = sizeFrac * 100 + '%'; }
      };
      place('x'); place('y');
    }
    /* Drag a scrollbar thumb: map a thumb move of `deltaPx` screen px along a
       `trackPx`-long track into a pan of that axis (against the live span). */
    function scrollDrag(axis, deltaPx, trackPx) {
      if (!trackPx) return;
      const s = viewRef.scale || 1;
      const b = bounds(); if (!b) return;
      const visStart = axis === 'x' ? -viewRef.x / s : -viewRef.y / s;
      const visLen = (axis === 'x' ? vpW() : vpH()) / s;
      const cMin = axis === 'x' ? b.minX : b.minY, cMax = axis === 'x' ? b.maxX : b.maxY;
      const uMin = Math.min(cMin, visStart), uMax = Math.max(cMax, visStart + visLen);
      const span = uMax - uMin || 1;
      const world = (deltaPx / trackPx) * span; // world units to shift the window
      if (axis === 'x') panBy(-world * s, 0); else panBy(0, -world * s);
    }

    /* ── Minimap ──────────────────────────────────────────────────
       A low-fidelity overview of the active page. The heavy paint (one filled
       box per node/shape) runs only when content changes (redrawMinimap); the
       per-pan/zoom work is just repositioning the viewport rectangle
       (syncMinimap), reading the mapping cached by the last redraw. The universe
       is the content bounds plus a world-space margin so the picture stays put
       while panning — only the rectangle moves. */

    function redrawMinimap() {
      if (!MINIMAP.on) return;
      const cv = minimapEls.canvas; if (!cv) return;
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      const pad = MINIMAP.pad;
      // Draw into the canvas's ACTUAL displayed size (its content box) rather than
      // the panel's border-box, so the low-fi content and the viewport rectangle
      // share one coordinate space that lines up with the visible (overflow-
      // clipped) area — the panel's own border would otherwise offset them.
      // clientWidth/Height is the canvas's resolved pixel size, whatever unit the
      // panel was sized in; the small fallbacks only apply before first layout.
      const cssW = cv.clientWidth || 160, cssH = cv.clientHeight || 112;
      const boxW = cssW - pad * 2, boxH = cssH - pad * 2;
      cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
      const ctx = cv.getContext('2d'); if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      const b = bounds();
      if (!b) { minimapRef.current = null; syncMinimap(); return; }
      // World margin ~ 6% of the larger content extent, so tight pages still
      // breathe and the rectangle has somewhere to go at the edges.
      const margin = Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.06 + 1;
      const uMinX = b.minX - margin, uMinY = b.minY - margin;
      const uW = (b.maxX - b.minX) + margin * 2, uH = (b.maxY - b.minY) + margin * 2;
      const k = Math.min(boxW / uW, boxH / uH); // world→minimap px, uniform
      // Centre the mapped content in the box.
      const offX = pad + (boxW - uW * k) / 2, offY = pad + (boxH - uH * k) / 2;
      minimapRef.current = { uMinX, uMinY, k, offX, offY, cssW, cssH };
      const toX = (wx) => offX + (wx - uMinX) * k, toY = (wy) => offY + (wy - uMinY) * k;
      // Low-fi content: filled boxes for nodes (frames outlined), thin strokes
      // for shapes. Colours come from CSS vars on the canvas element so they
      // adapt to light/dark.
      const cs = getComputedStyle(cv);
      const fill = cs.getPropertyValue('--cv-minimap-node').trim() || 'rgba(120,120,130,.45)';
      const frame = cs.getPropertyValue('--cv-minimap-frame').trim() || 'rgba(120,120,130,.7)';
      nodeEls.forEach((n) => {
        const [bw, bh] = nodeBox(n, geomCache.current);
        const x = toX(+n.dataset.x), y = toY(+n.dataset.y);
        const w = Math.max(1, bw * k), h = Math.max(1, bh * k);
        if (n.dataset.type === 'frame') { ctx.strokeStyle = frame; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
        else { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
      });
      ctx.strokeStyle = frame; ctx.lineWidth = 1;
      S.shapes.forEach((s) => {
        if (s.type === 'pen') {
          if (!s.points || s.points.length < 2) return;
          ctx.beginPath();
          s.points.forEach((p, i) => { const px = toX(p[0]), py = toY(p[1]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
          ctx.stroke();
        } else {
          const bb = shapeBBox(s); if (!bb) return;
          ctx.strokeRect(toX(bb.x) + 0.5, toY(bb.y) + 0.5, Math.max(1, bb.w * k), Math.max(1, bb.h * k));
        }
      });
      syncMinimap();
    }
    // Queue a redraw for next frame (coalesced) — used after content/layout
    // changes so auto-height nodes have been measured before we read them.
    function scheduleMinimap() {
      if (!MINIMAP.on) return;
      if (minimapRAF.current) return;
      minimapRAF.current = requestAnimationFrame(() => { minimapRAF.current = 0; redrawMinimap(); });
    }
    // Reposition the viewport rectangle from the cached mapping. Cheap; called
    // on every view change from applyView.
    function syncMinimap() {
      if (!MINIMAP.on) return;
      const el = minimapEls.view; if (!el) return;
      const m = minimapRef.current;
      if (!m) { el.style.display = 'none'; return; }
      const s = viewRef.scale || 1;
      // Visible world rect (viewport mapped back into world), same expression the
      // scrollbars use.
      const vx = -viewRef.x / s, vy = -viewRef.y / s;
      const vw = vpW() / s, vh = vpH() / s;
      const rawL = m.offX + (vx - m.uMinX) * m.k, rawT = m.offY + (vy - m.uMinY) * m.k;
      const rawR = rawL + Math.max(2, vw * m.k), rawB = rawT + Math.max(2, vh * m.k);
      // Clamp the rectangle to the panel so it never overflows an edge — the
      // panel's overflow:hidden would clip whichever side ran past, dropping that
      // border. Instead it pins to the edge (keeping a MIN-px sliver), so the
      // full outline is always visible. MIN leaves room for the two borders.
      const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
      const MIN = 6, W = m.cssW, H = m.cssH;
      const l = clamp(rawL, 0, W - MIN), r = clamp(rawR, l + MIN, W);
      const t = clamp(rawT, 0, H - MIN), b = clamp(rawB, t + MIN, H);
      el.style.display = 'block';
      el.style.left = l + 'px';
      el.style.top = t + 'px';
      el.style.width = (r - l) + 'px';
      el.style.height = (b - t) + 'px';
    }
    // Convert a point in minimap-CSS-px (relative to the panel) to a world point.
    function minimapToWorld(px, py) {
      const m = minimapRef.current; if (!m) return null;
      return { x: m.uMinX + (px - m.offX) / m.k, y: m.uMinY + (py - m.offY) / m.k };
    }
    // Centre the viewport on the world point under a minimap click (scale kept).
    function minimapCenterAt(px, py, animate = true) {
      const w = minimapToWorld(px, py); if (!w) return;
      const s = viewRef.scale;
      targetRef.scale = s; targetRef.x = vpW() / 2 - w.x * s; targetRef.y = vpH() / 2 - w.y * s;
      if (animate) startZoomLoop(); else snapView();
    }
    // Drag the viewport rectangle by a minimap-px delta → pan the board 1:1.
    function minimapDrag(dxPx, dyPx) {
      const m = minimapRef.current; if (!m) return;
      const s = viewRef.scale;
      // minimap px → world units (/k) → screen px (*scale); rectangle moves with
      // the pointer, so the board pans the opposite way (matches scrollDrag).
      panBy(-(dxPx / m.k) * s, -(dyPx / m.k) * s);
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
        const sc = nodeScale(el);
      const x = +el.dataset.x, y = +el.dataset.y, w = el.offsetWidth * sc, h = el.offsetHeight * sc;
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

    /* ── Snap-to-align while dragging ─────────────────────────────
       A move gesture's items snap, as one bounding box, to the edges and
       centres of the other on-screen objects; every alignment shows as a guide
       line in the chrome layer. The snap radius is constant in screen pixels
       so the pull feels the same at any zoom. */
    const SNAP_PX = 8; // snap radius, screen px
    const SNAP_EPS = 0.5; // world-unit tolerance when collecting aligned guides
    let snapGuides = null; // [{axis:'v'|'h', v, a, b}] world coords, or null
    /* Union bbox (world) of a move gesture's items at their grab position.
       getBBox ignores a shape's transient mid-drag translate, so node and shape
       boxes both come out at the un-dragged origin. */
    function moveBBox(items) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const it of items) {
        let bx, by, bw, bh;
        if (it.kind === 'node') { const sc = nodeScale(it.el); bx = it.ox; by = it.oy; bw = it.el.offsetWidth * sc; bh = it.el.offsetHeight * sc; }
        else { const bb = it.el.getBBox(); bx = bb.x; by = bb.y; bw = bb.width; bh = bb.height; }
        x0 = Math.min(x0, bx); y0 = Math.min(y0, by);
        x1 = Math.max(x1, bx + bw); y1 = Math.max(y1, by + bh);
      }
      return x0 > x1 ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    /* Nudge a move delta so the dragged bbox lands exactly on a nearby object's
       edge or centre (each of left/centre/right can meet each of the target's,
       per axis), and describe the resulting alignments as guide lines. Only
       on-screen objects attract — matching what the user can see line up.
       Returns { dx, dy, guides }. */
    /* On-screen objects a gesture can align to: each contributes its three
       vertical (left/centre/right) and three horizontal (top/centre/bottom)
       lines. Nodes/shapes named in the skip sets are excluded (they're the ones
       being moved or resized). Only objects within the viewport attract. */
    function snapTargets(skipN, skipS) {
      const r = viewportRef.current.getBoundingClientRect();
      const tl = screenToWorld(r.left, r.top), br = screenToWorld(r.right, r.bottom);
      const targets = [];
      const add = (x, y, w, h) => {
        if (x + w < tl.x || x > br.x || y + h < tl.y || y > br.y) return;
        targets.push({ xs: [x, x + w / 2, x + w], ys: [y, y + h / 2, y + h] });
      };
      nodeEls.forEach((el, id) => {
        if (!skipN || !skipN.has(id)) { const sc = nodeScale(el); add(+el.dataset.x, +el.dataset.y, el.offsetWidth * sc, el.offsetHeight * sc); }
      });
      shapeEls.forEach((el, id) => {
        if (skipS && skipS.has(id)) return;
        const bb = el.getBBox();
        add(bb.x, bb.y, bb.width, bb.height);
      });
      return targets;
    }
    function snapMoveDelta(items, dx, dy) {
      const box = moveBBox(items);
      if (!box) return { dx, dy, guides: null };
      const movingN = new Set(), movingS = new Set();
      for (const it of items) (it.kind === 'node' ? movingN : movingS).add(it.id);
      const targets = snapTargets(movingN, movingS);
      if (!targets.length) return { dx, dy, guides: null };
      const T = SNAP_PX / viewRef.scale;
      // Smallest shift (per axis) that lands a dragged edge/centre on a target's.
      const best = (dragVals, key) => {
        let b = null;
        for (const t of targets) for (const tv of t[key]) for (const dv of dragVals) {
          const d = tv - dv;
          if (Math.abs(d) <= T && (b === null || Math.abs(d) < Math.abs(b))) b = d;
        }
        return b;
      };
      const vals = (o, axis) => (axis === 'x'
        ? [box.x + o, box.x + o + box.w / 2, box.x + o + box.w]
        : [box.y + o, box.y + o + box.h / 2, box.y + o + box.h]);
      const bdx = best(vals(dx, 'x'), 'xs'), bdy = best(vals(dy, 'y'), 'ys');
      const sdx = dx + (bdx || 0), sdy = dy + (bdy || 0);
      /* Guides: at the (possibly snapped) position, every target line a dragged
         edge/centre sits on — including alignments the user dragged into without
         a nudge — spanning from the dragged box to the furthest aligned target. */
      const fx = vals(sdx, 'x'), fy = vals(sdy, 'y');
      const guides = [], seen = new Set();
      const collect = (axis, dragVals, key, lo, hi) => {
        dragVals.forEach((v, vi) => {
          const dedup = axis + Math.round(v * 2);
          if (seen.has(dedup)) return;
          let a = lo, b = hi, hit = false, center = vi === 1; // index 1 = the box's centre line
          for (const t of targets) {
            let m = false;
            t[key].forEach((tv, ti) => { if (Math.abs(tv - v) < SNAP_EPS) { m = true; if (ti === 1) center = true; } });
            if (!m) continue;
            hit = true;
            const span = key === 'xs' ? t.ys : t.xs;
            a = Math.min(a, span[0]); b = Math.max(b, span[2]);
          }
          if (hit) { seen.add(dedup); guides.push({ axis, v, a, b, center }); }
        });
      };
      collect('v', fx, 'xs', fy[0], fy[2]);
      collect('h', fy, 'ys', fx[0], fx[2]);
      return { dx: sdx, dy: sdy, guides };
    }
    /* Snap-to-align while resizing. `cand` carries the world coords of the edges
       this corner drags — the vertical edge (x) and/or horizontal edge (y), null
       on an axis not in play. For each, returns the nearest target line within
       range as { v: snapped coord, d: correction (v − cand), guide } or null;
       `box` (the pre-snap box) only sets each guide's span. The caller decides
       how to apply them — a free resize takes both, an aspect-locked one takes
       whichever pulls least and scales the box to it. */
    function snapResize(id, cand, box) {
      const targets = snapTargets(new Set([id]), null);
      if (!targets.length) return { x: null, y: null };
      const T = SNAP_PX / viewRef.scale;
      const solve = (val, key, axis, lo, hi) => {
        if (val == null) return null;
        let d = null;
        for (const t of targets) for (const tv of t[key]) {
          const dd = tv - val;
          if (Math.abs(dd) <= T && (d === null || Math.abs(dd) < Math.abs(d))) d = dd;
        }
        if (d === null) return null;
        const v = val + d;
        let a = lo, b = hi, center = false; // a resized edge is never a centre, but its target can be
        for (const t of targets) {
          let m = false;
          t[key].forEach((tv, ti) => { if (Math.abs(tv - v) < SNAP_EPS) { m = true; if (ti === 1) center = true; } });
          if (!m) continue;
          const span = key === 'xs' ? t.ys : t.xs;
          a = Math.min(a, span[0]); b = Math.max(b, span[2]);
        }
        return { v, d, guide: { axis, v, a, b, center } };
      };
      return {
        x: solve(cand.x, 'xs', 'v', box.y, box.y + box.h),
        y: solve(cand.y, 'ys', 'h', box.x, box.x + box.w),
      };
    }
    /* Show/refresh the guide lines. Like the rest of the drag path this is
       imperative per-pointermove chrome, not React state. */
    function setSnapGuides(guides) {
      snapGuides = guides && guides.length ? guides : null;
      placeSnapGuides();
    }
    function placeSnapGuides() {
      const wrap = chrome.guides; if (!wrap) return;
      if (!snapGuides) { wrap.style.display = 'none'; return; }
      wrap.style.display = 'block';
      while (wrap.children.length > snapGuides.length) wrap.removeChild(wrap.lastChild);
      while (wrap.children.length < snapGuides.length) {
        const d = document.createElement('div');
        d.className = 'cv-guide';
        wrap.appendChild(d);
      }
      const s = viewRef.scale, EXT = 4; // guides overshoot the aligned boxes a touch
      snapGuides.forEach((g, i) => {
        const el = wrap.children[i];
        el.className = g.center ? `cv-guide cv-guide-center-${g.axis}` : 'cv-guide';
        const at = (g.axis === 'v' ? viewRef.x : viewRef.y) + g.v * s - 0.5;
        const lo = (g.axis === 'v' ? viewRef.y : viewRef.x) + g.a * s - EXT;
        const len = (g.b - g.a) * s + EXT * 2;
        if (g.axis === 'v') {
          el.style.left = at + 'px'; el.style.top = lo + 'px';
          el.style.width = '1px'; el.style.height = len + 'px';
        } else {
          el.style.top = at + 'px'; el.style.left = lo + 'px';
          el.style.height = '1px'; el.style.width = len + 'px';
        }
      });
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
    /* Add / switch / remove a device frame (browser chrome, plugin window, …) on
       a single-asset photo/video. Each style's chrome bar has its own height, so
       the box grows/shrinks by the bar delta to keep the media's own size stable
       — clicking the active style again removes it. A lone SVG has no card to
       frame, so it's ignored. */
    function toggleFrame(id, style = 'browser') {
      if (!EDITABLE || S.readOnly) return;
      const n = S.nodes.find((x) => x.id === id);
      // Framable: a single-asset photo/video, or an html node (its iframe fills
      // the screen area under the chrome bar the same way media does).
      if (!n) return;
      if (n.type === 'html') { /* no asset constraints */ }
      else if ((n.type !== 'image' && n.type !== 'video') || !n.assets || n.assets.length !== 1) return;
      else if (n.assets[0].svg) return;
      const prev = n.frame || null;
      const next = prev === style ? null : style; // re-selecting the active style removes it
      const oldBar = prev ? frameBarH(prev) : 0;
      const newBar = next ? frameBarH(next) : 0;
      updateNode(id, {
        frame: next || undefined,
        // Dropping the frame also drops any scale setting.
        ...(next ? {} : { frameScale: undefined }),
        h: Math.max(newBar + 20, +n.h - oldBar + newBar),
      });
      selectNode(id);
    }
    /* Toggle whether a frame's chrome scales with the object. Off (fixed): the
       bar is a constant world-px height. On: the bar is stored as a fraction of
       the node height (captured now, so enabling doesn't jump), and tracks the
       media size as it's resized. Disabling restores the fixed bar while keeping
       the media's current size, mirroring toggleFrame's height bookkeeping. */
    function toggleFrameScale(id) {
      if (!EDITABLE || S.readOnly) return;
      const n = S.nodes.find((x) => x.id === id);
      if (!n || !n.frame) return;
      if (n.frameScale) {
        const oldBar = +n.h * n.frameScale;
        const newBar = frameBarH(n.frame);
        updateNode(id, { frameScale: undefined, h: Math.max(newBar + 20, +n.h - oldBar + newBar) });
      } else {
        updateNode(id, { frameScale: frameBarH(n.frame) / +n.h });
      }
      selectNode(id);
    }
    /* Set a node's absolute scale multiplier (1 = original size), keeping its
       CENTRE fixed so it grows/shrinks in place. Used by the right-click scale
       field; the K-tool corner drag writes scale directly (anchoring the
       opposite corner). Clamped to sane bounds. */
    function setNodeScale(id, scale) {
      if (!EDITABLE || S.readOnly) return;
      const n = S.nodes.find((x) => x.id === id);
      const el = nodeEls.get(id);
      if (!n || !el) return;
      const next = Math.max(0.05, Math.min(20, +scale || 1));
      const old = n.scale || 1;
      if (next === old) return;
      // Natural (unscaled) footprint; keep the centre put as the scale changes.
      const natW = el.offsetWidth, natH = el.offsetHeight;
      const cx = n.x + (natW * old) / 2, cy = n.y + (natH * old) / 2;
      updateNode(id, {
        scale: next === 1 ? undefined : next,
        x: cx - (natW * next) / 2,
        y: cy - (natH * next) / 2,
      });
      selectNode(id);
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
    function copyItems(sel) {
      const items = sel.map((it) => { const d = itemData(it); return d ? { kind: it.kind, data: JSON.parse(JSON.stringify(d)) } : null; }).filter(Boolean);
      if (!items.length) return false;
      clipboard.current = items;
      pasteCount.current = 0;
      stampClipboard(items);
      return true;
    }
    function copySelected() { copyItems(S.selected); }
    /* Cut = copy then remove. Snapshots to the clipboard first so a following
       paste restores what was cut. */
    function cutTarget(target) {
      const items = targetsOf(target);
      if (!copyItems(items)) return;
      deleteItems(items);
      deselect();
    }
    function cutSelected() { if (S.selected.length) cutTarget({ kind: 'multi' }); }
    /* Overwrite the OS clipboard with a marker (and any node text) so a following
       paste knows this in-canvas Copy is fresher than whatever the OS clipboard
       held before. Best-effort: clipboard writes are gesture-scoped and
       permission-gated, so failures are ignored — the paste side also falls back
       to the internal clipboard when no marker is found. */
    function stampClipboard(items) {
      try {
        if (!navigator.clipboard || !navigator.clipboard.write || typeof ClipboardItem === 'undefined') return;
        const plain = items.map(({ data }) => (data && typeof data.text === 'string' ? data.text : '')).filter(Boolean).join('\n\n');
        const html = `<div ${CLIP_MARK}="1"></div>`;
        const ci = new ClipboardItem({
          'text/plain': new Blob([plain], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        });
        navigator.clipboard.write([ci]).catch(() => {});
      } catch { /* clipboard unavailable */ }
    }
    /* Does a paste-event's clipboard carry our copy marker? Sync so the native
       `paste` handler can decide before reaching for OS media. */
    function systemClipIsMine(cd) {
      if (!cd) return false;
      const html = cd.getData('text/html');
      return !!html && html.includes(CLIP_MARK);
    }
    /* Same check for the async right-click paste, which reads ClipboardItems. */
    async function readClipItemsAreMine(clipItems) {
      if (!clipItems) return false;
      for (const item of clipItems) {
        if (item.types.includes('text/html')) {
          try { const html = await (await item.getType('text/html')).text(); if (html.includes(CLIP_MARK)) return true; } catch { /* unreadable */ }
        }
      }
      return false;
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
    /* Anything in the internal node clipboard? Gates the right-click Paste item. */
    function hasClipboard() { return !!(clipboard.current && clipboard.current.length); }
    /* World-space bounds of a clipboard snapshot, so a cursor paste can centre the
       whole group on the click point instead of offsetting from the originals. */
    function clipboardBounds(clip) {
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
      clip.forEach(({ kind, data }) => {
        if (kind === 'node') {
          const x = +data.x, y = +data.y, w = +data.w || 0, h = +data.h || 0;
          minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
        } else if (data.type === 'pen') {
          data.points.forEach(([px, py]) => { minX = Math.min(minX, px); minY = Math.min(minY, py); maxX = Math.max(maxX, px); maxY = Math.max(maxY, py); });
        } else {
          minX = Math.min(minX, data.x1, data.x2); minY = Math.min(minY, data.y1, data.y2);
          maxX = Math.max(maxX, data.x1, data.x2); maxY = Math.max(maxY, data.y1, data.y2);
        }
      });
      return { minX, minY, maxX, maxY };
    }
    /* Paste the internal clipboard at a world point (right-click paste), the
       group's top-left corner landing under the cursor, rather than the
       cascading offset of a keyboard paste. */
    function pasteAt(wx, wy) {
      const clip = clipboard.current;
      if (!clip || !clip.length) return false;
      const b = clipboardBounds(clip);
      const dx = wx - b.minX;
      const dy = wy - b.minY;
      const created = clip.map((it) => addClone(it.kind, it.data, dx, dy));
      setSelectedState(created);
      pasteCount.current = 0; // placed at cursor — restart the keyboard cascade
      return true;
    }
    /* Right-click "Paste": if the OS clipboard carries our copy marker, an
       in-canvas Copy is the freshest thing on it → paste that. Otherwise pull
       media/link off the system clipboard (mirrors the Cmd+V flow) before
       finally falling back to the internal node clipboard. Reading the system
       clipboard is async and permission-gated, so failures fall through silently
       to the internal paste. */
    async function pasteFromMenu(wx, wy) {
      if (!EDITABLE || S.readOnly) return;
      let items = null;
      try { if (navigator.clipboard && navigator.clipboard.read) items = await navigator.clipboard.read(); } catch { items = null; }
      if (await readClipItemsAreMine(items)) { pasteAt(wx, wy); return; }
      if (items) {
        for (const item of items) {
          const imgType = item.types.find((t) => t.startsWith('image/'));
          if (imgType) {
            try {
              const blob = await item.getType(imgType);
              const ext = imgType.split('/')[1] || 'png';
              addMediaFiles([new File([blob], `pasted.${ext}`, { type: imgType })], wx, wy);
              return;
            } catch { /* fall through to text / internal */ }
          }
        }
      }
      let text = '';
      try { if (navigator.clipboard && navigator.clipboard.readText) text = await navigator.clipboard.readText(); } catch { text = ''; }
      const svg = pickSvgMarkup(text);
      if (svg) { addImageFromFile(new File([svg], 'pasted.svg', { type: 'image/svg+xml' }), wx, wy); return; }
      if (asLinkUrl(text)) { addLinkFromUrl(text, wx, wy); return; }
      pasteAt(wx, wy);
    }

    /* ── Tools / mode ─────────────────────────────────────────── */
    // Switching tools clears the selection — except entering scale mode, which
    // acts on the object you already have selected (select → K → drag a corner).
    function setTool(t) { setToolState(t); if (t !== 'scale') deselect(); }
    // `broadcast` is false when applying a mode change that originated from
    // another canvas instance, so we don't persist/re-emit and loop.
    function setMode(ro, broadcast = true) {
      setReadOnlyState(ro);
      // Each mode transition re-locks a cooperative board: entering edit mode no
      // longer auto-unlocks scroll-to-pan (the user clicks the board to engage),
      // and returning to view mode drops back to the lock button / page-scroll.
      setEngaged(false);
      if (ro) { deselect(); setCtxMenu(null); setGridEditId(null); setRenameFrameId(null); setToolState((t) => (t === 'select' || t === 'hand' ? t : 'select')); }
      if (EDITABLE && broadcast) setGlobalReadOnly(ro);
    }

    /* ── Fit / fly-to ─────────────────────────────────────────── */
    /* The world-space extent of everything on the active page. Called from the
       view-sync path (scrollbars, minimap) on every frame, so the whole result
       — not just the individual measurements — is memoised for the gesture:
       content bounds are in world units and a pan/zoom moves the camera, not
       the content. */
    function bounds() {
      const cache = geomCache.current;
      if (cache && cache.bounds !== undefined) return cache.bounds;
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, any = false;
      nodeEls.forEach((n) => {
        any = true;
        const [w, h] = nodeBox(n, cache);
        const x = +n.dataset.x, y = +n.dataset.y;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
      });
      S.shapes.forEach((s) => {
        any = true;
        const xs = s.type === 'pen' ? s.points.map((p) => p[0]) : [s.x1, s.x2];
        const ys = s.type === 'pen' ? s.points.map((p) => p[1]) : [s.y1, s.y2];
        minX = Math.min(minX, ...xs); maxX = Math.max(maxX, ...xs); minY = Math.min(minY, ...ys); maxY = Math.max(maxY, ...ys);
      });
      const b = any ? { minX, minY, maxX, maxY } : null;
      if (cache) cache.bounds = b;
      return b;
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
      const sc = nodeScale(el);
      const x = +el.dataset.x, y = +el.dataset.y, w = el.offsetWidth * sc, h = el.offsetHeight * sc;
      const W = vpW(), H = vpH(), pad = 90;
      const s = clampScale(Math.min(W / (w + pad * 2), H / (h + pad * 2)));
      targetRef.scale = s; targetRef.x = W / 2 - (x + w / 2) * s; targetRef.y = H / 2 - (y + h / 2) * s;
      startZoomLoop();
    }
    /* Fly to a section that may live on another page: switch to its page first,
       then fly once the target node has mounted (elements only exist for the
       active page). `pageId` may be null / the active page for a section on the
       board already shown. Landing on a section focuses it, so the arrow keys
       can step on from there. */
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
      setFocusedSectionId(id); // after switchPage, which clears the old page's focus
    }
    /* Step from the focused section to its neighbour on the active page (delta
       ±1), wrapping at the ends. A no-op unless the user has actually landed on
       a section — that leaves the arrow keys alone everywhere else. Returns
       whether it moved, so the key handler knows if it owns the event. */
    function stepSection(delta) {
      const secs = sectionNodes(S.nodes);
      if (secs.length < 2) return false;
      const i = secs.findIndex((n) => n.id === focusedSectionRef.current);
      if (i < 0) return false; // no focused section (or it has since been deleted)
      goToSection(null, secs[(i + delta + secs.length) % secs.length].id);
      return true;
    }
    function clearSectionFocus() { if (focusedSectionRef.current) setFocusedSectionId(null); }

    /* ── Undo / redo ──────────────────────────────────────────────
       The recorder (recordHistory, driven by an effect on nodes/shapes) captures
       one entry per committed change; undo/redo swap snapshots in and out. Text
       typing fires a state change per keystroke, so consecutive edits that touch
       only a single node's text are coalesced into a single undo step. */
    const HISTORY_MAX = 100;
    function histFor(pageId) {
      return history.byPage[pageId] || (history.byPage[pageId] = { undo: [], redo: [], base: null, coalesceKey: null });
    }
    /* If the transition from `base` to the current model changes nothing but one
       node's text (`text`, and the `html` mirror that moves with it) — or, while
       that node is being edited, its `x` (a hugging centre/right-aligned text
       block re-anchors as typing changes its width) — return a stable key for
       that node so successive keystrokes collapse into one history entry;
       otherwise null (each change stands alone). */
    function coalesceKeyFor(base, curNodes, curShapes) {
      if (base.shapes !== curShapes || base.nodes.length !== curNodes.length) return null;
      const bMap = new Map(base.nodes.map((n) => [n.id, n]));
      let changed = null;
      for (const n of curNodes) {
        const b = bMap.get(n.id);
        if (!b) return null;              // id set changed (add/remove/replace)
        if (b !== n) { if (changed) return null; changed = [b, n]; } // >1 node changed
      }
      if (!changed) return null;
      const [b, n] = changed;
      if (b.type !== n.type) return null;
      const TEXTUAL = (k) => k === 'text' || k === 'html' || k === 'x';
      for (const k in b) { if (!TEXTUAL(k) && b[k] !== n[k]) return null; }
      for (const k in n) { if (!TEXTUAL(k) && b[k] !== n[k]) return null; }
      // A bare x change only coalesces mid-edit (the re-anchor shift); outside
      // editing it's a drag and stands alone.
      if (b.text === n.text && b.html === n.html && (b.x === n.x || S.editingId !== n.id)) return null;
      return 'text:' + n.id;
    }
    function recordHistory(curNodes, curShapes, pageId) {
      const h = histFor(pageId);
      if (history.restoring) { h.base = { nodes: curNodes, shapes: curShapes }; history.restoring = false; return; }
      if (!h.base) { h.base = { nodes: curNodes, shapes: curShapes }; return; } // first sight of this page
      if (h.base.nodes === curNodes && h.base.shapes === curShapes) return;     // no-op render / page revisit
      const key = coalesceKeyFor(h.base, curNodes, curShapes);
      if (key !== null && key === h.coalesceKey) {
        // Same text field still being edited: advance the baseline but keep the
        // pre-edit snapshot already on the stack as the single undo target.
        h.base = { nodes: curNodes, shapes: curShapes };
        return;
      }
      h.undo.push(h.base);
      if (h.undo.length > HISTORY_MAX) h.undo.shift();
      h.redo.length = 0;
      h.base = { nodes: curNodes, shapes: curShapes };
      h.coalesceKey = key;
    }
    function applyHistorySnapshot(snap) {
      history.restoring = true;
      setNodes(snap.nodes); setShapes(snap.shapes);
      deselect(); setEditingId(null); setCtxMenu(null); setGridEditId(null); setRenameFrameId(null); setFullscreen(null);
    }
    function undo() {
      if (!EDITABLE || S.readOnly) return;
      const h = histFor(S.activePageId);
      if (!h.undo.length) return;
      h.redo.push({ nodes: S.nodes, shapes: S.shapes });
      const snap = h.undo.pop();
      h.base = snap; h.coalesceKey = null;
      applyHistorySnapshot(snap);
    }
    function redo() {
      if (!EDITABLE || S.readOnly) return;
      const h = histFor(S.activePageId);
      if (!h.redo.length) return;
      h.undo.push({ nodes: S.nodes, shapes: S.shapes });
      const snap = h.redo.pop();
      h.base = snap; h.coalesceKey = null;
      applyHistorySnapshot(snap);
    }

    /* ── Persistence ──────────────────────────────────────────── */
    function serializeNode(n) {
      const o = { id: n.id, type: n.type, x: +n.x, y: +n.y, z: n.z };
      if (n.anchor) o.anchor = 1;
      // A per-object scale multiplier (K tool / right-click). Omitted at 1×.
      if (n.scale && n.scale !== 1) o.scale = Math.round(n.scale * 10000) / 10000;
      if (n.type === 'sticky') { o.color = n.color; o.text = n.text; }
      else if (n.type === 'tblock') { o.text = n.text; if (n.html) o.html = n.html; if (n.w != null) o.w = n.w; if (n.fontSize != null) o.fontSize = n.fontSize; if (n.font) o.font = n.font; if (n.align && n.align !== 'left') o.align = n.align; }
      else if (n.type === 'frame') { o.w = n.w; o.h = n.h; o.text = n.name; }
      else if (n.type === 'md') { o.w = n.w; o.text = n.text; }
      else if (n.type === 'code') { o.w = n.w; o.text = n.text; o.lang = n.lang; if (n.wrap != null) o.wrap = n.wrap ? 1 : 0; }
      else if (n.type === 'image' || n.type === 'video') {
        o.w = n.w; o.h = n.h;
        o.assets = (n.assets || []).map((a) => {
          const s = { kind: a.kind, src: a.src };
          if (a.alt) s.alt = a.alt;
          if (a.svg) s.svg = 1;
          return s;
        });
        // Custom grid proportions (rounded to keep the snapshot compact).
        if (n.grid && (n.grid.colFr || n.grid.rowFr)) {
          const round = (arr) => (arr || []).map((v) => Math.round(v * 1000) / 1000);
          o.grid = { colFr: round(n.grid.colFr), rowFr: round(n.grid.rowFr) };
        }
        // Cmd-drag crop: the visible window into the media's extent.
        if (n.crop && n.crop.w > 0 && n.crop.h > 0) {
          const r4 = (v) => Math.round((v || 0) * 10000) / 10000;
          o.crop = { x: r4(n.crop.x), y: r4(n.crop.y), w: r4(n.crop.w), h: r4(n.crop.h) };
        }
        // Device frame (browser chrome, plugin window, …) and its editable label.
        if (n.frame) o.frame = n.frame;
        if (n.frameUrl) o.frameUrl = n.frameUrl;
        if (n.frameTitle) o.frameTitle = n.frameTitle;
        if (n.frameScale) o.frameScale = Math.round(n.frameScale * 10000) / 10000;
      }
      else if (n.type === 'sound') { o.w = n.w; o.h = n.h; o.src = n.src; if (n.name) o.name = n.name; if (n.dur) o.dur = n.dur; }
      else if (n.type === 'html') {
        o.w = n.w; o.h = n.h; o.src = n.src;
        if (n.name) o.name = n.name;
        // Device frame, same fields as media.
        if (n.frame) o.frame = n.frame;
        if (n.frameUrl) o.frameUrl = n.frameUrl;
        if (n.frameTitle) o.frameTitle = n.frameTitle;
        if (n.frameScale) o.frameScale = Math.round(n.frameScale * 10000) / 10000;
      }
      else if (n.type === 'link') {
        if (n.w != null) o.w = n.w;
        o.url = n.url;
        if (n.title) o.title = n.title;
        if (n.desc) o.desc = n.desc;
        if (n.image) o.image = n.image;
        if (n.siteName) o.siteName = n.siteName;
        if (n.favicon) o.favicon = n.favicon;
      }
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
      // Persist the CANONICAL framing (framedRef), not the reframed display — so
      // the saved view is always paired with the size it was framed at (see
      // serialize's viewport) and a load reframes it correctly. View mode keeps
      // the stale edit-mode view (reader pan/zoom is transient); fall back to the
      // live view only before the reference exists (fresh board, edit mode).
      const fr = framedRef.current;
      const view = S.readOnly && prev ? prev.view
        : fr ? { x: fr.x, y: fr.y, scale: fr.scale }
        : { x: viewRef.x, y: viewRef.y, scale: viewRef.scale };
      pageData[S.activePageId] = { nodes: S.nodes, shapes: S.shapes, view };
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
      if (S.gridHidden) snap.gridHidden = true;
      // Record the container size these views were framed at, so a later load
      // can reframe the pan/zoom relative to whatever size the board opens at.
      // This is the canonical reference's size (framedRef) — it always matches
      // the view snapshotActive persisted. Fall back to the live size only
      // before the reference exists (fresh board, edit mode).
      const fr = framedRef.current;
      let fv = fr && fr.w > 0 && fr.h > 0 ? { w: fr.w, h: fr.h } : null;
      if (!fv && !S.readOnly) { const vw = vpW(), vh = vpH(); if (vw && vh) fv = { w: vw, h: vh }; }
      if (fv) snap.viewport = fv;
      // Stamp when this snapshot was produced so loadInitial can tell an
      // in-code edit of the committed file apart from a stale localStorage
      // autosave (see the savedAt comparison there).
      snap.savedAt = Date.now();
      return snap;
    }
    /* Board-wide background colour override; null restores the theme default. */
    function setCanvasBg(color) {
      if (!EDITABLE) return;
      setBgColor(color || null);
    }
    /* Board-wide dot-grid visibility. Off hides the background dots everywhere
       (edit + view); the setting is saved with the board. */
    function toggleGrid() {
      if (!EDITABLE) return;
      setGridHidden((v) => !v);
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
      deselect(); setEditingId(null); setCtxMenu(null); setFullscreen(null); setGridEditId(null); setRenameFrameId(null); setFocusedSectionId(null);
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
    /* Audio has no visual size — measuring just reads the clip duration so the
       node can show a total time before the element loads. MediaRecorder WebMs
       report Infinity, which the node resolves live on play; treat it as 0 here. */
    const measureAudio = (src) => new Promise((resolve) => {
      const a = document.createElement('audio');
      a.preload = 'metadata';
      a.onloadedmetadata = () => resolve(isFinite(a.duration) ? a.duration : 0);
      a.onerror = () => resolve(0);
      a.src = src;
    });
    /* Some drag sources (and OSes) hand over files with an empty MIME type, so
       fall back to the extension. Animated images and videos play automatically —
       image nodes render a plain <img>, video nodes an autoplaying muted <video>. */
    const isImageFile = (f) =>
      !!f && (f.type.startsWith('image/') || /\.(gif|png|jpe?g|webp|avif|svg)$/i.test(f.name || ''));
    const isVideoFile = (f) =>
      !!f && (f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)$/i.test(f.name || ''));
    /* Audio by MIME, or by an unambiguously-audio extension. `.webm`/`.ogg` are
       shared with video, so those only count as audio when the MIME says so —
       hence they're absent from the extension list (and isVideoFile is checked
       first at the drop/paste call sites). */
    const isAudioFile = (f) =>
      !!f && (f.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|oga|opus|flac|weba)$/i.test(f.name || ''));
    /* An HTML document file — rendered live on the board inside a sandboxed
       iframe (see nodes/Html.jsx). */
    const isHtmlFile = (f) =>
      !!f && (f.type === 'text/html' || /\.html?$/i.test(f.name || ''));
    /* Strip an ingest-time asset ({ kind, src, alt, svg, nat }) down to the
       persisted shape ({ kind, src, alt, svg }) — `nat` is only used to size the
       box on creation. */
    const cleanAsset = (a) => ({ kind: a.kind, src: a.src, alt: a.alt || '', svg: !!a.svg, ...(a.srcDark ? { srcDark: a.srcDark } : {}) });
    const GRID_CELL = 150; // default on-board size of one cell in a fresh multi-asset grid
    /* Drop a media node holding one or more assets, centred on the cursor. A lone
       asset sizes the box to its natural aspect (scaled to a sane default); a grid
       gets a squarish box laid out in ~√n columns. */
    function createMediaNode(assets, wx, wy) {
      if (!assets.length) return null;
      const type = assets[0].kind; // primary kind drives dispatch / resize behaviour
      let w, h;
      if (assets.length === 1) {
        const nat = assets[0].nat || { w: 200, h: 150 };
        const MAX = 600;
        const k = nat.w > MAX || nat.h > MAX ? MAX / Math.max(nat.w, nat.h) : 1;
        w = Math.round(nat.w * k); h = Math.round(nat.h * k);
      } else {
        const cols = Math.ceil(Math.sqrt(assets.length));
        const rows = Math.ceil(assets.length / cols);
        w = cols * GRID_CELL; h = rows * GRID_CELL;
      }
      const n = addNode({ id: newId(type), type, x: wx - w / 2, y: wy - h / 2, w, h, assets: assets.map(cleanAsset) });
      setToolState('select'); selectNode(n.id);
      return n;
    }
    /* Append dropped assets to an existing media node, turning it into (or growing)
       a grid. The box keeps its size — the grid just reflows to fit more cells. */
    function appendAssetsToNode(id, assets) {
      const n = S.nodes.find((x) => x.id === id);
      if (!n || (n.type !== 'image' && n.type !== 'video') || !assets.length) return;
      updateNode(id, { assets: [...(n.assets || []), ...assets.map(cleanAsset)] });
      selectNode(id);
    }
    /* Restore a lone-asset media node to its natural pixel size, uncapped. `nat`
       isn't persisted, so re-measure from the stored bytes. Grids have no single
       original size, so multi-asset nodes are skipped. The box grows/shrinks
       around its centre. */
    async function resetMediaSize(id) {
      if (!EDITABLE || S.readOnly) return;
      const n = S.nodes.find((x) => x.id === id);
      if (!n || (n.type !== 'image' && n.type !== 'video') || !n.assets || n.assets.length !== 1) return;
      const a = n.assets[0];
      try {
        const src = await resolveMediaSrc(a.src);
        if (!src) return;
        let nat;
        if (a.kind === 'video') nat = await measureVideo(src);
        else if (a.svg) nat = measureSvgText(await (await fetch(src)).text());
        else nat = await measure(src);
        const cur = S.nodes.find((x) => x.id === id); // re-read: measuring is async
        if (!cur || !nat.w || !nat.h) return;
        // A device frame's chrome bar sits above the media, so size the box so
        // the media area equals its natural size. In scale mode the bar is a
        // fraction of the box (media = box·(1−f)); otherwise it's a fixed px bar.
        const w = nat.w;
        const h = cur.frameScale
          ? Math.round(nat.h / (1 - cur.frameScale))
          : nat.h + (cur.frame ? frameBarH(cur.frame) : 0);
        updateNode(id, {
          x: Math.round(cur.x + (cur.w - w) / 2),
          y: Math.round(cur.y + (cur.h - h) / 2),
          w, h,
        });
        selectNode(id);
      } catch (err) {
        console.error('[canvas] reset media size failed', err);
      }
    }
    /* Legacy single-asset entry point retained for the URL/paste flows: wrap one
       ingested asset in a fresh node. */
    function placeMediaNode(type, src, nat, wx, wy, alt, extra) {
      createMediaNode([{ kind: type, src, alt, nat, svg: !!(extra && extra.svg) }], wx, wy);
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
    /* Ingest one image file into an asset ({ kind, src, alt, svg, nat }) — measure
       it, store the bytes durably, and resolve the stored src. The bytes pass
       through untouched, so animated GIFs keep playing. Returns null on failure. */
    async function imageFileToAsset(file) {
      if (!isImageFile(file)) return null;
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
        return { kind: 'image', src, alt: file.name, svg: isSvgFile(file), nat };
      } catch (err) {
        console.error('[canvas] image ingest failed', err);
        return null;
      }
    }
    /* Same flow for video files, through `onUploadVideo`. Files that arrive
       with no MIME type get re-wrapped with one from the extension — <video>
       won't content-sniff data:/blob: URLs the way <img> does. QuickTime .mov
       gets the same treatment: browsers play its H.264 bytes fine but only
       under a video/mp4 label, and upload adapters generally don't know
       video/quicktime either. Returns null on failure. */
    async function videoFileToAsset(file) {
      if (!isVideoFile(file)) return null;
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
        return { kind: 'video', src, alt: file.name, svg: false, nat };
      } catch (err) {
        console.error('[canvas] video ingest failed', err);
        return null;
      }
    }
    const fileToAsset = (file) => (isVideoFile(file) ? videoFileToAsset(file) : imageFileToAsset(file));
    /* Ingest a batch of image/video files (order preserved). Dropped onto an
       existing media node (`targetId`) they append to its grid; otherwise they
       become one new node — a single asset sizes to itself, several form a grid. */
    async function addMediaFiles(files, wx, wy, targetId) {
      if (!EDITABLE || S.readOnly) return;
      const visual = Array.from(files).filter((f) => isImageFile(f) || isVideoFile(f));
      if (!visual.length) return;
      const assets = (await Promise.all(visual.map(fileToAsset))).filter(Boolean);
      if (!assets.length) return;
      const target = targetId && S.nodes.find((x) => x.id === targetId);
      if (target && (target.type === 'image' || target.type === 'video')) appendAssetsToNode(targetId, assets);
      else createMediaNode(assets, wx, wy);
    }
    /* Single-file entry points kept for existing callers (URL/paste flows). */
    async function addImageFromFile(file, wx, wy) {
      if (!EDITABLE) return;
      const a = await imageFileToAsset(file);
      if (a) createMediaNode([a], wx, wy);
    }
    async function addVideoFromFile(file, wx, wy) {
      if (!EDITABLE) return;
      const a = await videoFileToAsset(file);
      if (a) createMediaNode([a], wx, wy);
    }
    /* Set one theme's image on an existing asset via a file picker. `dark`
       stores an alternate src shown only on dark boards (see MediaContent) —
       the light/dark pair swaps live via CSS, no re-render. `light` replaces
       the primary src in place (box size, frame and crop all stay). The file
       goes through the normal ingest path, so it lands in the same durable
       storage as any dropped image. */
    function pickThemeImage(id, index, theme) {
      if (!EDITABLE || S.readOnly) return;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const a = await imageFileToAsset(file);
        if (!a) return;
        const n = S.nodes.find((x) => x.id === id); // re-read: ingest is async
        if (!n || !n.assets || !n.assets[index] || n.assets[index].kind !== 'image') return;
        updateNode(id, {
          assets: n.assets.map((as, i) => {
            if (i !== index) return as;
            // Replacing the light image keeps the alt (it describes the shot,
            // not the file) but tracks the new file's svg-ness for rendering.
            return theme === 'dark' ? { ...as, srcDark: a.src } : { ...as, src: a.src, svg: a.svg };
          }),
        });
        selectNode(id);
      };
      input.click();
    }
    /* Drop an asset's dark-mode variant: the light image shows in both themes again. */
    function removeDarkImage(id, index) {
      if (!EDITABLE || S.readOnly) return;
      const n = S.nodes.find((x) => x.id === id);
      if (!n || !n.assets || !n.assets[index] || !n.assets[index].srcDark) return;
      updateNode(id, { assets: n.assets.map((as, i) => (i === index ? { ...as, srcDark: undefined } : as)) });
      selectNode(id);
    }
    /* Drop a fixed-size sound player card centred on the cursor. Audio carries no
       intrinsic size, so unlike image/video the box is a constant — only its
       stored duration/name vary. */
    const SOUND_W = 260, SOUND_H = 56;
    function placeSoundNode(src, wx, wy, name, dur) {
      const n = addNode({
        id: newId('sound'), type: 'sound',
        x: wx - SOUND_W / 2, y: wy - SOUND_H / 2, w: SOUND_W, h: SOUND_H,
        src, name: name || '', dur: dur || 0,
      });
      setToolState('select'); selectNode(n.id);
      return n;
    }
    /* Same storage flow as image/video: through `onUploadAudio`, else IndexedDB
       for anything over the inline cap (most clips), else a data URL. */
    async function addAudioFromFile(file, wx, wy) {
      if (!EDITABLE || !isAudioFile(file)) return;
      try {
        const objUrl = URL.createObjectURL(file);
        const dur = await measureAudio(objUrl).finally(() => URL.revokeObjectURL(objUrl));
        const label = (file.name || '').replace(/\.[^.]+$/, '') || 'Audio';
        let src;
        if (onUploadAudio) {
          src = await onUploadAudio(file, await readDataUrl(file));
          if (!src) throw new Error('onUploadAudio returned no src');
        } else if (hasIDB && file.size > INLINE_MAX) {
          src = await storeMediaBlob(file);
        } else {
          src = await readDataUrl(file);
        }
        placeSoundNode(src, wx, wy, label, dur);
      } catch (err) {
        console.error('[canvas] audio drop failed', err);
      }
    }
    /* Theme-sync bridge baked into every ingested HTML document. The host page
       can't reach into the iframe (opaque origin) and can't flip its
       `prefers-color-scheme` (that tracks the OS alone), so the node posts
       { type: 'canvas-theme', theme } into the frame (see nodes/Html.jsx) and
       this script applies it: it rewrites the document's prefers-color-scheme
       media rules to match the board's theme — so a document themed purely
       with those media queries follows the host's theme switcher untouched —
       and toggles a `dark` class on <html> for scripts/styles that want it.
       Compound queries (`(prefers-color-scheme: dark) and (max-width: …)`)
       lose their other conditions once flipped — acceptable for demo docs. */
    const THEME_SYNC = `<script data-cv-theme-sync="1">(() => {
  const flipped = new WeakMap(); // media rule -> was it a dark-scheme rule?
  const walk = (rules, dark) => {
    for (const r of rules) {
      // A rewritten rule's mediaText no longer mentions prefers-color-scheme,
      // so membership in the flipped map must count as a match too or it
      // would only ever flip once.
      if (r.media && (flipped.has(r) || /prefers-color-scheme/i.test(r.media.mediaText))) {
        if (!flipped.has(r)) flipped.set(r, /prefers-color-scheme:\\s*dark/i.test(r.media.mediaText));
        r.media.mediaText = flipped.get(r) === dark ? 'all' : 'not all';
      } else if (r.cssRules) walk(r.cssRules, dark);
    }
  };
  const apply = (dark) => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; // UA defaults (bg, controls) follow too
    for (const sheet of document.styleSheets) {
      try { walk(sheet.cssRules, dark); } catch { /* unreadable sheet */ }
    }
  };
  addEventListener('message', (e) => {
    const d = e.data;
    if (d && d.type === 'canvas-theme' && (d.theme === 'dark' || d.theme === 'light')) apply(d.theme === 'dark');
  });
  // Boot theme from the URL hash (set by the host, see nodes/Html.jsx): applied
  // synchronously — this script sits at the end of <head>, after the document's
  // styles but before any rendering — so the first paint is already themed; the
  // message path only lands after load and would flash the OS theme first.
  // Re-applied at DOMContentLoaded for any stylesheets later in the body.
  const boot = /cv-theme=(dark|light)/.exec(location.hash || '');
  if (boot) {
    apply(boot[1] === 'dark');
    addEventListener('DOMContentLoaded', () => apply(boot[1] === 'dark'));
  }
})()</` + 'script>';
    /* Zoom paint-mode bridge, the second half of the injected pair. Adapted
       from awenate's `awenate-zoom-paint-opts` handler (see its
       CANVAS_ZOOM_RASTERIZATION.md).

       The board zooms by scaling the world, and deliberately leaves it
       un-promoted so the browser re-rasterizes crisply every frame (see
       zoomLoop). For a plain node that is cheap. For an HTML node it means
       re-painting a whole embedded document per frame — and a document with a
       lot of DOM is where the glide falls apart. So for the duration of the
       gesture the document is put in a cheaper paint mode.

       THE RULE THIS MODE MUST OBEY: it may change how the document paints,
       never how it lays out. A zoom that quietly reflows the content it is
       zooming is worse than a slow one.

       That rules out the containment half of awenate's version — `contain:
       layout paint` on <body> and `content-visibility: auto` on its children.
       All three of `contain: layout`, `contain: paint` and
       `content-visibility: auto` make the element a containing block for
       `position: fixed` descendants: applying them re-anchors every fixed
       header, nav or floating control in the document from the iframe viewport
       to the contained box, so it visibly jumps the moment a zoom starts and
       jumps back when it ends. `content-visibility` also brings
       `contain-intrinsic-size`, whose placeholder height replaces the real one
       for anything not yet rendered — and it earns nothing on the documents
       this canvas actually embeds, where <body> holds a single app-root
       element that always intersects the viewport and so can never be skipped.

       What remains is purely per-pixel work, which cannot move a box: shadows,
       the most expensive effect to raster and the least missed mid-motion.

       Deliberately NOT stripped, following awenate: `filter` and
       `mix-blend-mode`. Both are load-bearing for real documents — filter
       drives duotone and grayscale treatments (stripping flashes the raw
       image), blend modes let overlays composite (stripping makes them opaque
       and hides what's underneath).

       ── backdrop-filter is scale-gated, not gesture-gated ──

       An element with a backdrop-filter is composited into its own render
       surface, and that surface rasterizes at roughly 1:1 and is then GPU-scaled
       by the ancestor transform — which here is the board's world, in the PARENT
       document. The child compositor never learns the board's effective scale,
       so the element does not re-raster with it while every unfiltered element
       around it does: one subtree stays soft in a document that is otherwise
       crisp.

       This cannot be fixed by removing and re-applying the filter at the end of
       a gesture. That does recreate the surface, but it comes back at the same
       1:1 raster scale — which is why a gesture-scoped strip (v2) still left the
       element soft once the board settled.

       So the rule is about scale, not motion. A ~1:1 raster is fine at or below
       100% (downsampling a too-detailed texture looks correct) and visibly soft
       above it, where it is upscaled. FLAT_ABOVE is where the frost stops being
       worth its softness; tune it if the crossover sits elsewhere in practice.

       The upshot for a document that genuinely wants frosted glass: it gets it,
       at the zoom levels where the design is being read as a whole. Zooming in
       past 1:1 — which readers do to inspect detail, exactly when sharpness
       matters more than decoration — flattens the panel instead of blurring
       everything on it.

       Inline styles carry backdrop-filter in practice (an exported document
       that serialises computed styles writes it onto every element that had
       one), so `!important` is required to win the cascade. */
    const ZOOM_OPTS = `<script data-cv-zoom-opts="4">(() => {
  var FLAT_ABOVE = 1.02; // board scale past which a ~1:1 filter surface is upscaled and soft
  var css =
    // Frost off: applied while zoomed in past 1:1, and during a gesture (where
    // it is also the single biggest per-frame paint saving).
    'html.cv-flat *,html.cv-flat *::before,html.cv-flat *::after{' +
    'backdrop-filter:none!important;-webkit-backdrop-filter:none!important}' +
    // Gesture only: paint-level savings that cannot move a box.
    'html.cv-zooming *,html.cv-zooming *::before,html.cv-zooming *::after{' +
    'box-shadow:none!important;text-shadow:none!important}';
  var style = document.createElement('style');
  style.textContent = css;
  var attach = function () { (document.head || document.documentElement).appendChild(style); };
  if (document.head || document.documentElement) attach();
  else addEventListener('DOMContentLoaded', attach);
  // Flat until told otherwise: a host too old to send a scale gets the safe,
  // never-blurry rendering rather than an unannounced regression.
  document.documentElement.classList.add('cv-flat');
  addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.type !== 'canvas-zoom') return;
    var scale = typeof d.scale === 'number' ? d.scale : Infinity;
    document.documentElement.classList.toggle('cv-zooming', !!d.active);
    document.documentElement.classList.toggle('cv-flat', !!d.active || scale > FLAT_ABOVE);
  });
})()</` + 'script>';

    /* The two halves of the bridge, each stamped with the version of the script
       it carries. Bump a version whenever its script changes: ingest replaces
       any older copy it finds rather than leaving it in place, so a document
       that already passed through an earlier build of the canvas — an asset
       re-dropped onto the board, an exported document imported back — is
       upgraded instead of silently keeping stale behaviour. (That mattered
       once already: v1 of the zoom half reflowed documents with fixed-position
       elements, and a skip-if-present check would have preserved the bug on
       exactly the documents most likely to be re-ingested.) */
    const BRIDGE = [
      { marker: 'data-cv-theme-sync', version: '1', script: THEME_SYNC },
      { marker: 'data-cv-zoom-opts', version: '3', script: ZOOM_OPTS },
    ];

    /* Inject the bridge at the end of <head> — after the document's own styles
       (so the boot apply() sees them) yet before the body renders (else after
       the head/html open tag, else prepended). A half already at the current
       version is left untouched, so re-ingesting a current asset is a no-op. */
    function injectBridge(html) {
      let out = html;
      for (const { marker, version, script } of BRIDGE) {
        if (out.includes(`${marker}="${version}"`)) continue;
        // Any older copy goes first. The emitted script bodies contain no
        // literal `</script>`, so the non-greedy match is exactly the block.
        out = out.replace(new RegExp(`<script ${marker}[^>]*>[\\s\\S]*?</script\\s*>`, 'i'), '');
        const close = /<\/head\s*>/i.exec(out);
        if (close) { out = out.slice(0, close.index) + script + out.slice(close.index); continue; }
        const m = /<head[^>]*>/i.exec(out) || /<html[^>]*>/i.exec(out);
        if (m) { out = out.slice(0, m.index + m[0].length) + script + out.slice(m.index + m[0].length); continue; }
        out = script + out;
      }
      return out;
    }
    /* Drop an HTML document as a live iframe node, centred on the cursor. HTML
       has no intrinsic size, so the box starts at a desktop-ish default and
       resizes freely. Storage mirrors the media flow: through `onUploadHtml`,
       else IndexedDB past the inline cap, else a data URL — all of which work
       as an iframe src (data:/blob: documents run as an opaque origin anyway). */
    const HTML_W = 800, HTML_H = 500;
    async function addHtmlFromFile(file, wx, wy) {
      if (!EDITABLE || S.readOnly || !isHtmlFile(file)) return;
      try {
        // The stored copy carries the host bridge — theme sync + zoom paint mode
        // (and a text/html type — files synthesized from pasted text arrive
        // typed, drag sources may not).
        const typed = new Blob([injectBridge(await readText(file))], { type: 'text/html' });
        let src;
        if (onUploadHtml) {
          src = await onUploadHtml(file, await readDataUrl(typed));
          if (!src) throw new Error('onUploadHtml returned no src');
        } else if (hasIDB && file.size > INLINE_MAX) {
          src = await storeMediaBlob(typed);
        } else {
          src = await readDataUrl(typed);
        }
        const n = addNode({
          id: newId('html'), type: 'html',
          x: wx - HTML_W / 2, y: wy - HTML_H / 2, w: HTML_W, h: HTML_H,
          src, name: file.name || 'document.html',
        });
        setToolState('select'); selectNode(n.id);
      } catch (err) {
        console.error('[canvas] html drop failed', err);
      }
    }

    /* ── Microphone recording ─────────────────────────────────────
       Recording lives in the engine (not a node) so its MediaRecorder survives
       independently of any render, and a half-finished capture never persists to
       the autosave. The floating recorder panel (see Recorder.jsx) reflects the
       `recording` state; on stop we drop a finished sound node at the viewport
       centre, mirroring the file-drop flow. */
    const recordingSupported = () =>
      typeof navigator !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
      && typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';
    async function finalizeRecording(blob) {
      const r = vpRect();
      const w = screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
      try {
        const objUrl = URL.createObjectURL(blob);
        const dur = await measureAudio(objUrl).finally(() => URL.revokeObjectURL(objUrl));
        const ext = ((blob.type.split('/')[1] || 'webm').split(';')[0]) || 'webm';
        const file = new File([blob], `recording.${ext}`, { type: blob.type || 'audio/webm' });
        let src;
        if (onUploadAudio) {
          src = await onUploadAudio(file, await readDataUrl(file));
          if (!src) throw new Error('onUploadAudio returned no src');
        } else if (hasIDB) {
          src = await storeMediaBlob(blob);
        } else {
          src = await readDataUrl(blob);
        }
        placeSoundNode(src, w.x, w.y, 'Recording', dur);
      } catch (err) {
        console.error('[canvas] recording save failed', err);
      }
    }
    async function startRecording() {
      if (!EDITABLE || S.readOnly || recRef.current || !recordingSupported()) return;
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error('[canvas] microphone access denied', err);
        return;
      }
      // Pick a container the browser can both record and later play back.
      const mime = ['audio/webm', 'audio/mp4', 'audio/ogg']
        .find((t) => window.MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const info = recRef.current;
        recRef.current = null;
        setRecording(null);
        if (info && info.cancelled) return;
        const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
        if (blob.size) finalizeRecording(blob);
      };
      recRef.current = { rec, stream, cancelled: false };
      rec.start();
      setRecording({});
    }
    function stopRecording() {
      const info = recRef.current;
      if (info && info.rec.state !== 'inactive') info.rec.stop();
    }
    function cancelRecording() {
      const info = recRef.current;
      if (!info) return;
      info.cancelled = true;
      if (info.rec.state !== 'inactive') {
        info.rec.stop();
      } else {
        info.stream.getTracks().forEach((t) => t.stop());
        recRef.current = null;
        setRecording(null);
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
      // An unambiguously-audio URL: no visual to decode, so drop a sound node
      // directly (measuring is just for the duration readout).
      if (/\.(mp3|wav|m4a|aac|oga|opus|flac|weba)([?#]|$)/i.test(url)) {
        placeSoundNode(url, wx, wy, alt.replace(/\.[^.]+$/, '') || 'Audio', await measureAudio(url));
        return;
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
      // Not decodable as media — treat a plain http(s) URL as a link to unfurl
      // (a bookmark dragged in from the address bar / another tab lands here).
      if (/^https?:\/\//i.test(url)) { addLinkFromUrl(url, wx, wy); return; }
      console.error('[canvas] media url drop failed: could not decode', url);
    }

    /* A pasteable/droppable URL: a single http(s) token, nothing else. Multi-line
       or free text with a URL embedded isn't treated as a link paste. */
    function asLinkUrl(text) {
      const t = (text || '').trim();
      if (!t || /\s/.test(t)) return '';
      return /^https?:\/\/[^\s]+$/i.test(t) ? t : '';
    }
    /* Drop a link card for `url`, then unfurl it: an immediate placeholder (so the
       paste feels instant) that the `onUnfurl` adapter fills in with the page's
       OG title / description / image. Without an adapter (or if the fetch fails)
       the card still stands as a bare link showing the hostname. The resolved
       metadata is stored on the node, so a saved board never re-fetches. */
    async function addLinkFromUrl(url, wx, wy) {
      if (!EDITABLE || S.readOnly) return;
      const clean = asLinkUrl(url);
      if (!clean) return;
      const W = 280;
      const n = addNode({ id: newId('link'), type: 'link', x: wx - W / 2, y: wy - 90, w: W, url: clean, loading: !!onUnfurl });
      setToolState('select'); selectNode(n.id);
      if (!onUnfurl) return;
      try {
        const meta = await onUnfurl(clean);
        updateNode(n.id, {
          loading: false,
          url: meta && meta.url ? meta.url : clean,
          title: (meta && meta.title) || '',
          desc: (meta && meta.description) || '',
          image: (meta && meta.image) || '',
          siteName: (meta && meta.siteName) || '',
          favicon: (meta && meta.favicon) || '',
        });
      } catch (err) {
        console.error('[canvas] link unfurl failed', err);
        updateNode(n.id, { loading: false });
      }
    }
    /* Paste a copied URL as a link card. Returns true when it consumed the
       clipboard, so the caller falls back to the internal node clipboard when the
       pasted text isn't a bare URL. */
    function pasteLink(cd, wx, wy) {
      if (!EDITABLE || S.readOnly || !cd) return false;
      const url = asLinkUrl(cd.getData('text/plain'));
      if (!url) return false;
      addLinkFromUrl(url, wx, wy);
      return true;
    }
    /* Open a link card's target. In edit mode a tap (and double-click) routes
       here; read-only clicks open the anchor natively. Debounced so the two
       clicks of a physical double-click can't open the URL twice. */
    let lastLinkOpen = 0;
    function openLink(id) {
      const now = Date.now();
      if (now - lastLinkOpen < 500) return;
      const n = S.nodes.find((x) => x.id === id);
      if (n && n.type === 'link' && n.url) {
        lastLinkOpen = now;
        window.open(n.url, '_blank', 'noopener,noreferrer');
      }
    }

    /* Pull an <svg>…</svg> fragment out of pasted text/html. Copying SVG source
       from an editor lands as text/plain; some tools (and browsers) wrap it in
       text/html. Only accept a real root <svg> element, not an inline reference. */
    function pickSvgMarkup(str) {
      if (!str) return '';
      const m = /<svg[\s>][\s\S]*<\/svg\s*>/i.exec(str);
      return m ? m[0] : '';
    }
    /* A pasted COMPLETE html document — source starting with a doctype or <html>
       root. Deliberately strict: fragments and ordinary text (and the text/html
       flavour every rich-text copy carries) must never turn into an html node. */
    function pickHtmlDoc(str) {
      const t = (str || '').replace(/^﻿/, '').trimStart();
      return /^(?:<!doctype\s+html[\s>]|<html[\s>])/i.test(t) ? str : '';
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
      files = files.filter((f) => isImageFile(f) || isVideoFile(f) || isAudioFile(f) || isHtmlFile(f));
      if (files.length) {
        // Audio has no visual grid — each clip is its own player card. Images and
        // videos pasted together form one grid node. HTML documents each become
        // their own live iframe node.
        const audio = files.filter((f) => isAudioFile(f) && !isVideoFile(f));
        const visual = files.filter((f) => isImageFile(f) || isVideoFile(f));
        const html = files.filter(isHtmlFile);
        audio.forEach((file, i) => addAudioFromFile(file, wx + i * 24, wy + i * 24));
        html.forEach((file, i) => addHtmlFromFile(file, wx + i * 24, wy + i * 24));
        if (visual.length) addMediaFiles(visual, wx, wy);
        return true;
      }
      // A complete HTML document pasted as source text — wrap it as a file and
      // render it live. Checked on text/plain only (the text/html flavour is
      // populated by every rich-text copy) and BEFORE the SVG branch, so a
      // document containing an inline <svg> doesn't become an image.
      const doc = pickHtmlDoc(cd.getData('text/plain'));
      if (doc) {
        addHtmlFromFile(new File([doc], 'pasted.html', { type: 'text/html' }), wx, wy);
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
    function openFullscreen(id, index = 0) {
      const n = S.nodes.find((x) => x.id === id);
      if (!n || (n.type !== 'image' && n.type !== 'video')) return;
      const assets = n.assets || [];
      // A lone SVG is vector art shown at full size on the board already —
      // nothing to gain from a lightbox, so it never opens full-screen. (Inside a
      // grid, an SVG is still part of the gallery.)
      if (assets.length === 1 && assets[0].svg) return;
      setFullscreen({ id, index: Math.max(0, Math.min(index, assets.length - 1)) });
    }
    function closeFullscreen() { setFullscreen(null); }
    /* ── Media grid proportion editing ────────────────────────────
       Double-clicking a multi-asset grid (in edit mode) enters this mode instead
       of the lightbox: draggable dividers let the user resize the row/column
       tracks so one asset can take more space than another. */
    function enterGridEdit(id) {
      if (!EDITABLE || S.readOnly) return;
      const n = S.nodes.find((x) => x.id === id);
      if (!n || (n.type !== 'image' && n.type !== 'video') || !n.assets || n.assets.length < 2) return;
      selectNode(id);
      setGridEditId(id);
    }
    function exitGridEdit() { setGridEditId(null); }
    /* ── Renaming a section (frame) label ─────────────────────────
       Swaps the on-board frame label for a text input. Lives here rather than in
       the label so both entry points — double-clicking the label and the context
       menu's Rename — drive the same state. */
    function startRenameFrame(id) {
      if (!EDITABLE || S.readOnly) return;
      const n = S.nodes.find((x) => x.id === id);
      if (!n || n.type !== 'frame') return;
      setRenameFrameId(id);
    }
    function stopRenameFrame() { setRenameFrameId(null); }
    /* ── HTML node activation ─────────────────────────────────────
       While an html node is "live" its shield drops and the sandboxed iframe
       receives pointer events directly (see nodes/Html.jsx). Works in view mode
       too — visitors can interact with a demo. Deactivated by a press outside
       the node or Escape (see Canvas.jsx). */
    function setHtmlActive(id) { setHtmlActiveId(id || null); }
    /* Open an html node's document in a new tab (idb: refs resolve to an object
       URL first). Sync window.open where possible so popup blockers stay calm. */
    function openHtml(id) {
      const n = S.nodes.find((x) => x.id === id);
      if (!n || n.type !== 'html' || !n.src) return;
      if (parseIdbRef(n.src)) {
        resolveMediaSrc(n.src).then((u) => { if (u) window.open(u, '_blank', 'noopener,noreferrer'); });
      } else {
        window.open(n.src, '_blank', 'noopener,noreferrer');
      }
    }
    function stepFullscreen(delta) {
      setFullscreen((f) => {
        if (!f) return f;
        const n = S.nodes.find((x) => x.id === f.id);
        const len = n && n.assets ? n.assets.length : 0;
        if (len <= 1) return f;
        return { id: f.id, index: (f.index + delta + len) % len };
      });
    }

    /* ── Editing text nodes ───────────────────────────────────── */
    function startEditing(id) { setEditingId(id); }
    function stopEditing() { setEditingId(null); }

    /* Apply an inline format (bold / italic / underline / strikethrough) or a
       list command to a text block, from the properties panel.

       While the block is being edited the command lands on the live selection —
       the panel's buttons cancel their mousedown, so the caret never leaves the
       text. With the block merely selected there's no caret to work from, so the
       command applies to the whole block: focus it, select everything, run the
       command, hand focus straight back. Either way the result is read back off
       the DOM and committed, so a format is one undoable step like any edit.

       execCommand is deprecated but unreplaced: it's the only cross-browser way
       to run these edits inside contentEditable and keep native undo intact. */
    function formatText(id, cmd) {
      if (!EDITABLE || S.readOnly) return;
      const command = RICH_COMMANDS[cmd];
      if (!command) return;
      const wrap = nodeEls.get(id);
      const el = wrap && wrap.querySelector('.cv-txt');
      if (!el) return;
      const live = S.editingId === id;
      const wasEditable = el.contentEditable;
      el.contentEditable = 'true';
      if (!live) {
        el.focus({ preventScroll: true });
        const r = document.createRange();
        r.selectNodeContents(el);
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      }
      try { document.execCommand('styleWithCSS', false, false); } catch { /* not supported */ }
      document.execCommand(command);
      const html = sanitizeRich(el.innerHTML);
      if (!live) {
        el.innerHTML = html; // the block isn't being edited — leave it as stored
        el.contentEditable = wasEditable;
        el.blur();           // the node's own blur-commit writes the same values back
        const sel = getSelection();
        if (sel) sel.removeAllRanges();
      }
      updateNode(id, { text: el.innerText, html: isRichHtml(html) ? html : undefined });
    }

    /* Chrome elements register themselves here (avoids mutating context). */
    function setChrome(name, el) { chromeRef.current[name] = el; }

    return {
      viewRef, targetRef, applyView, screenToWorld, freezeView,
      zoomAt, zoomCenter, zoomTo, panBy, pinchBy, markActive, invalidateGeom, postZoomStateTo, startZoomLoop, snapView, syncChrome, syncScrollbars, scrollDrag, redrawMinimap, scheduleMinimap, syncMinimap, minimapCenterAt, minimapDrag, reframeOnResize, reflowObjects, scheduleReflow, hideSelChrome, placeSel, setHover, setGridEditGeom,
      selectNode, selectShape, deselect, isSelected, toggleSelect, moveItemsFor, snapMoveDelta, snapResize, setSnapGuides,
      placeMarquee, hideMarquee, marqueeSelect,
      newId, newShapeId, addNode, updateNode, removeNode, addShape, updateShape, removeShape, patchMany,
      bringFront, sendBack, toggleAnchor, toggleFrame, toggleFrameScale, setNodeScale, deleteSelected, deleteTarget,
      copySelected, cutSelected, cutTarget, paste, pasteAt, pasteFromMenu, hasClipboard, systemClipIsMine, duplicateSelected, duplicateTarget, duplicateItemsAt,
      setTool, setMode, setCanvasBg, toggleGrid, fitAll, flyTo, goToSection, stepSection, clearSectionFocus, scheduleSave, saveNow, serialize, publish, schedulePublish, resetBoard,
      switchPage, addPage, renamePage, removePage,
      isImageFile, isVideoFile, isAudioFile, addImageFromFile, addVideoFromFile, addAudioFromFile, addMediaFiles, appendAssetsToNode, resetMediaSize, addMediaFromUrl, pasteMedia, resolveMediaSrc, parseIdbRef, pickThemeImage, removeDarkImage,
      addLinkFromUrl, pasteLink, openLink,
      isHtmlFile, addHtmlFromFile, setHtmlActive, openHtml,
      recordingSupported, startRecording, stopRecording, cancelRecording,
      openFullscreen, closeFullscreen, stepFullscreen, enterGridEdit, exitGridEdit, startRenameFrame, stopRenameFrame, startEditing, stopEditing, formatText, setChrome,
      recordHistory, undo, redo,
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
      // Media nodes hold an assets[] of srcs; sound (and legacy) nodes a single src.
      const srcs = Array.isArray(n.assets) ? n.assets.map((a) => a.src) : [n.src];
      srcs.forEach((s) => {
        const ref = eng.parseIdbRef(s);
        if (ref && ref.db === MEDIA_DB) referenced.add(ref.key);
      });
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
    // Tool / mode are exposed as data-* state attributes (data-tool, data-readonly)
    // so consumers can target them without depending on internal class names.
    b.dataset.tool = tool;
    if (readOnly) b.setAttribute('data-readonly', ''); else b.removeAttribute('data-readonly');
    // Entering/leaving scale mode changes which handles show on the selection,
    // so re-place the chrome (it otherwise only re-syncs on data changes).
    eng.syncChrome();
  }, [tool, readOnly, eng]);

  /* ── Global edit/view mode: follow toggles from any other instance ──
     Covers the fixed Edit button, other same-document canvases, and other tabs.
     `broadcast: false` so applying the change doesn't re-persist and loop. */
  useEffect(() => {
    if (!EDITABLE) return;
    return subscribeMode(() => eng.setMode(getGlobalReadOnly(), false));
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
  useEffect(() => { eng.syncChrome(); eng.scheduleSave(); }, [nodes, shapes, selected, editingId, pages, activePageId, bgColor, gridHidden, eng]);

  /* Reflow is a display-only overlay (derived positions, never persisted): keep
     the screen-space chrome aligned to it, but don't schedule a save/publish. */
  useEffect(() => { eng.syncChrome(); }, [reflow, eng]);

  /* ── Record undo/redo history on every committed content change ──
     One entry per change (bursts of typing coalesce, see recordHistory). Keyed
     on the model only — selection/view changes aren't undoable. */
  useEffect(() => { eng.recordHistory(nodes, shapes, activePageId); }, [nodes, shapes, activePageId, eng]);

  /* ── Background auto-publish on content changes ──────────────
     Persists edits through the host adapter without a save button. Keyed on
     content only (not selection/editing focus) so clicking around doesn't
     trigger writes. The first (mount) fire is skipped so simply loading a board
     doesn't rewrite its published snapshot. */
  useEffect(() => {
    if (!didAutoPublishMount.current) { didAutoPublishMount.current = true; return; }
    eng.schedulePublish();
  }, [nodes, shapes, pages, activePageId, bgColor, gridHidden, eng]);

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
      // Drop any saved-size seed: the reference is the freshly fitted view at
      // the current size (the first resize callback re-captures it).
      framedRef.current = null;
    } else {
      eng.applyView(); // paint the saved view
      // If we recorded the container size the view was framed at, reframe it to
      // the size the board actually opened at — so a reload on a different
      // screen / window size shows the zoom relative to the current container,
      // matching how a live resize behaves. A no-op when the sizes match.
      if (framedRef.current) eng.reframeOnResize();
    }
    // From here on, view changes are user-driven and should publish.
    booted.current = true;
    // Resolve collisions for the size the board actually opened at.
    eng.scheduleReflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Re-resolve collisions when the content model or the edit/view mode changes
     (entering view mode, a node added/removed/resized, …). Resize-driven
     reflow is handled by the ResizeObserver effect below. No-op unless `collide`
     is on; a recompute that matches the current layout skips the state write. */
  useEffect(() => {
    if (COLLIDE) eng.scheduleReflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, readOnly, editingId]);

  /* Re-measure the scrollbars when the content model or its reflow changes —
     pan/zoom/resize already re-sync via applyView, but adding/moving/deleting
     an object shifts the content bounds without touching the view. Layout
     effect so the DOM (node sizes) is committed before we read it. */
  useLayoutEffect(() => {
    eng.invalidateGeom(); // the content model moved under any in-flight gesture
    eng.syncScrollbars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, shapes, reflow]);

  /* Repaint the minimap's low-fi content when the page's content model changes
     or the active page switches. Deferred one frame (scheduleMinimap) so
     auto-height nodes are measured before we read their box. No-op unless the
     minimap is on. */
  useEffect(() => {
    if (MINIMAP.on) eng.scheduleMinimap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, shapes, reflow, activePageId]);

  /* Repaint the minimap when the theme flips. Its blobs are baked into the
     <canvas> bitmap from CSS vars (--cv-minimap-node/-frame) read at draw time,
     so a light/dark switch — which only swaps those vars — would otherwise leave
     stale colours. We watch the source of the switch host-agnostically: the
     `.dark` class the host toggles on <html>/<body>, plus the OS media query for
     "system" mode. */
  useEffect(() => {
    if (!MINIMAP.on || typeof window === 'undefined') return undefined;
    const repaint = () => eng.scheduleMinimap();
    // The `.dark` class may live on <html>/<body> (host page) or on the canvas
    // root itself (`.canvas-root.dark`), so watch all three.
    const targets = [document.documentElement, document.body, rootRef.current].filter(Boolean);
    let mo;
    if (typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(repaint);
      for (const t of targets) mo.observe(t, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    }
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    mq?.addEventListener?.('change', repaint);
    return () => {
      mo?.disconnect();
      mq?.removeEventListener?.('change', repaint);
    };
  }, [MINIMAP.on, eng]);

  /* Reframe (per `resizeAnchor`) and re-sync chrome whenever the container
     resizes (section reflow, window resize, sidebar toggles, …) — measured on
     the viewport, not the window. */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || typeof ResizeObserver === 'undefined') {
      const onResize = () => { eng.reframeOnResize(); eng.scheduleReflow(); };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
    const ro = new ResizeObserver(() => { eng.reframeOnResize(); eng.scheduleReflow(); });
    ro.observe(vp);
    return () => ro.disconnect();
  }, [eng]);

  /* Track whether THIS canvas holds the browser fullscreen (native
     `fullscreenButton` mode, or a user F11 on the root). Feeds `maximized`,
     which suspends the cooperative-gesture scroll lock. */
  useEffect(() => {
    const sync = () => {
      const fs = document.fullscreenElement || document.webkitFullscreenElement || null;
      setNativeFullscreen(!!fs && fs === rootRef.current);
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    sync();
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  /* The board covers the whole screen or document — via either fullscreen
     button mode, or a mount-time `fit="fullscreen"`. In every case nothing of
     the host page shows behind it, so the cooperative-gesture / click-to-interact
     scroll lock (which exists to let the page scroll past an embedded board)
     should be suspended. Mirrored to a ref for the imperative gesture handlers. */
  const maximized = fullBleed || nativeFullscreen || fit === 'fullscreen';
  maximizedRef.current = maximized;

  /* Re-anchor the view whenever the maximise state flips. Entering/leaving
     maximise resizes the viewport, which the ResizeObserver already reframes —
     but reframeOnResize now anchors on the *centre* while maximised, so re-run
     it here too: it makes the re-centre fire together with the toggle and covers
     the native Fullscreen API path, where the `fullscreenchange` event (which
     sets `maximized`) and the element resize can arrive in either order. */
  const didMountMax = useRef(false);
  useEffect(() => {
    if (!didMountMax.current) { didMountMax.current = true; return; }
    eng.reframeOnResize();
  }, [maximized, eng]);

  /* ── Single shared chrome: elect the primary editable canvas ──
     Every editable canvas joins the election; the ACTIVE one (this canvas
     becomes active on mount and on any pointer interaction) owns the page-wide
     chrome (the fixed Edit toggle + tools dock), so there is one dock however
     many boards are mounted, and it follows the board the user is working in.
     Non-editable canvases never join, so they're never primary. */
  const canvasIdRef = useRef(null);
  if (canvasIdRef.current === null) canvasIdRef.current = allocOwnerId();
  const canvasId = canvasIdRef.current;
  useEffect(() => {
    if (!EDITABLE) return undefined;
    const leave = joinOwners(canvasId);
    setActiveCanvas(canvasId); // newest editable canvas takes the dock
    return leave;
  }, [EDITABLE, canvasId]);
  useEffect(() => {
    if (!EDITABLE) return undefined;
    const el = rootRef.current;
    if (!el) return undefined;
    // Capture so it fires even when a child stops propagation; interacting with
    // a board makes it the one the shared dock drives.
    const onDown = () => setActiveCanvas(canvasId);
    el.addEventListener('pointerdown', onDown, true);
    return () => el.removeEventListener('pointerdown', onDown, true);
  }, [EDITABLE, canvasId]);
  const isPrimaryCanvas = useSyncExternalStore(
    subscribeOwner,
    () => EDITABLE && primaryOwner() === canvasId,
    () => false,
  );

  /* Global `E` shortcut: toggle edit / view mode from anywhere on the page (not
     gated on the pointer being over a board, unlike the in-canvas tool keys).
     Bound only on the primary canvas so it fires once, and setMode's broadcast
     flips every board and the shared dock together. Ignored while typing in a
     field or editing a node's text. */
  useEffect(() => {
    if (!EDITABLE || !isPrimaryCanvas) return undefined;
    const onKey = (e) => {
      if (e.key.toLowerCase() !== 'e' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (S.editingId) return;
      const ae = document.activeElement;
      if (ae && (ae.isContentEditable || ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      eng.setMode(!S.readOnly);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [EDITABLE, isPrimaryCanvas, eng, S]);

  const value = {
    // state
    nodes, shapes, draft, tool, selected, readOnly, editingId, noteColor, textFont, strokeColor, fillColor, ctxMenu,
    isPrimaryCanvas,
    publishState, recording, fullscreen, gridEditId, renameFrameId, htmlActiveId, focusedSectionId, pages, activePageId, pageData, bgColor, gridHidden, reflow, collide: COLLIDE,
    brand: init.brand, EDITABLE, COOP, CLICK_TO_INTERACT, engaged, homeId: HOME_ID, canPublish, nodeTypes, classNames, components, highlightCode, formatCode, formatOnType, setFormatOnType, theme, accent, fit, ui, fullscreenButton, fullBleed, setFullBleed, nativeFullscreen, maximized, maximizedRef, saveStatus, SCROLLBARS, scrollEls, minimap: MINIMAP.on, MINIMAP, minimapEls,
    // setters used by UI
    setDraft, setNoteColor, setTextFont, setStrokeColor, setFillColor, setCtxMenu, setSelectedState, setEngaged,
    // refs
    rootRef, hoverInsideRef, activeInsideRef, engagedRef, viewportRef, worldRef, zoomLabelRef, nodeEls, mediaEls, shapeEls, frameLabelEls, actionRef, panKey, S,
    // engine
    eng,
  };

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}
