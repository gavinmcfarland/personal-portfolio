import { useCallback, useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useCanvas } from './CanvasProvider';
import { resolveGrid } from './nodes/common';

/* Screen-space dividers for editing a media grid's proportions. Rendered in the
   chrome layer (not inside the zoomed node) so each divider keeps a constant
   stroke thickness at any zoom; the engine's placeGridEdit() positions them on
   the node's on-screen rect. Dragging one shifts the fraction between the two
   adjacent tracks — the node's cells resize live (imperative style write) and
   the value commits to node.grid on release. */
function GridDividers() {
  const { gridEditId, nodes, eng, nodeEls } = useCanvas();
  const wrapRef = useCallback((el) => eng.setChrome('grid', el), [eng]);
  const drag = useRef(null);
  const node = gridEditId ? nodes.find((n) => n.id === gridEditId) : null;
  const g = node ? resolveGrid(node) : null;
  const colKey = g ? g.colFr.join(',') : '';
  const rowKey = g ? g.rowFr.join(',') : '';

  // Publish geometry for placeGridEdit and reposition whenever it changes.
  useEffect(() => {
    eng.setGridEditGeom(node && g ? { id: node.id, colFr: g.colFr, rowFr: g.rowFr } : null);
    eng.syncChrome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node && node.id, colKey, rowKey]);

  if (!node || !g) return null;

  const onDown = (axis, k) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const el = nodeEls.get(node.id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const fr = axis === 'col' ? g.colFr : g.rowFr;
    // Map pointer delta to fractions over the track area (box minus the gaps and
    // padding, which don't scale with the fractions), matching placeGridEdit.
    const s = eng.viewRef.scale;
    const cs = getComputedStyle(el);
    const gap = (parseFloat(axis === 'col' ? cs.columnGap : cs.rowGap) || 0) * s;
    const pad = axis === 'col'
      ? ((parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)) * s
      : ((parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0)) * s;
    const full = axis === 'col' ? rect.width : rect.height;
    drag.current = {
      axis, k,
      size: Math.max(1, full - pad - gap * (fr.length - 1)),
      start: axis === 'col' ? e.clientX : e.clientY,
      a0: fr[k], b0: fr[k + 1],
      col: [...g.colFr], row: [...g.rowFr],
      live: null,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const base = d.axis === 'col' ? d.col : d.row;
    const total = base.reduce((a, b) => a + b, 0);
    const pos = d.axis === 'col' ? e.clientX : e.clientY;
    const dFr = ((pos - d.start) / d.size) * total;
    const pairSum = d.a0 + d.b0;
    const minFr = pairSum * 0.1; // each side keeps ≥10% of the pair
    const a = Math.min(pairSum - minFr, Math.max(minFr, d.a0 + dFr));
    const arr = [...base];
    arr[d.k] = a;
    arr[d.k + 1] = pairSum - a;
    d.live = arr;
    // Resize the node's cells live (world layer) …
    const el = nodeEls.get(node.id);
    if (el) {
      const tmpl = arr.map((f) => `${f}fr`).join(' ');
      if (d.axis === 'col') el.style.gridTemplateColumns = tmpl; else el.style.gridTemplateRows = tmpl;
    }
    // … and move the screen-space divider to follow.
    eng.setGridEditGeom({ id: node.id, colFr: d.axis === 'col' ? arr : d.col, rowFr: d.axis === 'row' ? arr : d.row });
    eng.syncChrome();
  };
  const onUp = (e) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (!d.live) return;
    const grid = d.axis === 'col' ? { colFr: d.live, rowFr: d.row } : { colFr: d.col, rowFr: d.live };
    eng.updateNode(node.id, { grid });
  };

  const line = (axis, k) => (
    <div
      key={`${axis}${k}`}
      className={`cv-grid-line cv-grid-line--${axis}`}
      data-axis={axis}
      data-k={k}
      onPointerDown={onDown(axis, k)}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    />
  );
  const lines = [];
  for (let k = 0; k < g.cols - 1; k += 1) lines.push(line('col', k));
  for (let k = 0; k < g.rows - 1; k += 1) lines.push(line('row', k));
  return <div className="cv-grid-edit" ref={wrapRef}>{lines}</div>;
}

/* Screen-space frame label: title, drag handle, jump-to button. Positioned by
   the engine's syncChrome() via the frameLabelEls map. Double-click renames it
   inline with a text input, mirroring the page-tab rename UI. */
function FrameLabel({ node }) {
  const { frameLabelEls, readOnly, eng, actionRef, nodeEls, setCtxMenu } = useCanvas();
  const [renaming, setRenaming] = useState(false);
  const inputRef = useRef(null);

  const setRef = useCallback(
    (el) => {
      if (el) frameLabelEls.set(node.id, el); else frameLabelEls.delete(node.id);
    },
    [node.id, frameLabelEls]
  );

  useEffect(() => {
    if (renaming && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [renaming]);

  const commit = () => {
    const v = inputRef.current ? inputRef.current.value.trim() || 'Section' : '';
    eng.updateNode(node.id, { name: v });
    setRenaming(false);
  };

  const onPointerDown = (e) => {
    if (e.button !== 0 || renaming) return;
    // Read-only: the label is just chrome floating over the board, but it sits
    // outside .cv-viewport so the viewport's pan handler never sees a touch that
    // lands on it — leaving the label un-pannable (worst on mobile, where labels
    // are big and bare board is scarce). Start the same pan gesture here; the
    // window-level move/up handlers drive it off actionRef, so no capture needed.
    if (readOnly) {
      e.stopPropagation();
      eng.freezeView();
      actionRef.current = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: eng.viewRef.x, oy: eng.viewRef.y };
      return;
    }
    e.stopPropagation();
    eng.freezeView();
    if (e.shiftKey) { eng.toggleSelect('node', node.id); return; }
    // Part of a multi-selection → drag the whole group, same as grabbing the frame body.
    const items = eng.moveItemsFor({ kind: 'node', id: node.id });
    if (!eng.isSelected('node', node.id)) eng.selectNode(node.id);
    const el = nodeEls.get(node.id);
    if (el) { el.dataset.moved = ''; el.classList.add('dragging'); }
    actionRef.current = { type: 'move', sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, items, clickItem: { kind: 'node', id: node.id } };
    // NB: no setPointerCapture here — capturing the pointer retargets click/dblclick
    // away from the label and breaks double-click-to-rename. The drag is driven by
    // window-level pointermove/up handlers (see Canvas.jsx), so capture isn't needed.
  };

  if (renaming) {
    return (
      <div ref={setRef} className="frame-label editing" onPointerDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="frame-rename"
          defaultValue={node.name || ''}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setRenaming(false);
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={setRef}
      className="frame-label"
      onPointerDown={onPointerDown}
      onDoubleClick={(e) => { if (readOnly) return; e.stopPropagation(); setRenaming(true); }}
      onContextMenu={(e) => {
        if (readOnly) return;
        e.preventDefault();
        e.stopPropagation();
        eng.selectNode(node.id);
        setCtxMenu({ x: e.clientX, y: e.clientY, target: { kind: 'node', id: node.id } });
      }}
    >
      <span className="txt">{node.name || 'Section'}</span>
      <button
        className="frame-go"
        title="Go to this section"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); eng.flyTo(node.id); }}
      >
        →
      </button>
    </div>
  );
}

export default function Chrome() {
  const { nodes, selected, eng, actionRef, nodeEls } = useCanvas();

  const selRef = useCallback((el) => eng.setChrome('sel', el), [eng]);
  const hovRef = useCallback((el) => eng.setChrome('hov', el), [eng]);
  const editRef = useCallback((el) => eng.setChrome('edit', el), [eng]);
  const rzRef = useCallback((el) => eng.setChrome('rz', el), [eng]);
  const marqRef = useCallback((el) => eng.setChrome('marq', el), [eng]);
  const guidesRef = useCallback((el) => eng.setChrome('guides', el), [eng]);

  // Edit / resize affordances only apply to a single selected node.
  const single = selected.length === 1 && selected[0].kind === 'node' ? selected[0] : null;

  const onResizeDown = (corner) => (e) => {
    if (e.button !== 0 || !single) return;
    e.stopPropagation();
    eng.freezeView();
    const n = nodes.find((x) => x.id === single.id);
    if (!n) return;
    // A never-resized text block has no stored width — measure its element.
    const el = nodeEls.get(n.id);
    const ow = n.w != null ? +n.w : el ? el.offsetWidth : 0;
    // Original font size, for cmd-drag text scaling (falls back to the rendered CSS size).
    const ofs = n.fontSize != null ? +n.fontSize : el ? parseFloat(getComputedStyle(el).fontSize) : 24;
    // A lone SVG renders `contain` (vector art), so cmd-drag cropping doesn't
    // apply — it would letterbox, not crop. Legacy nodes carry a top-level svg flag.
    const loneSvg = n.type === 'image' &&
      (n.assets && n.assets.length ? n.assets.length === 1 && !!n.assets[0].svg : !!n.svg);
    // Cmd-drag crop context for a single image/video (grids and SVGs excluded):
    // the media's full rendered extent at the current box size — from the stored
    // crop if there is one, else the cover fit over the natural dimensions. The
    // drag trims/reveals against this fixed extent (see Canvas.jsx).
    let crop = null;
    const assetCount = n.assets && n.assets.length ? n.assets.length : 1;
    if ((n.type === 'image' || n.type === 'video') && assetCount === 1 && !loneSvg && el) {
      const media = el.querySelector('img, video');
      const nw = media ? media.naturalWidth || media.videoWidth || 0 : 0;
      const nh = media ? media.naturalHeight || media.videoHeight || 0 : 0;
      const c0 = n.crop && n.crop.w > 0 && n.crop.h > 0 ? n.crop : null;
      let cw, ch;
      if (c0) { cw = ow / c0.w; ch = +n.h / c0.h; }
      else if (nw && nh) { const s = Math.max(ow / nw, +n.h / nh); cw = nw * s; ch = nh * s; }
      else { cw = ow; ch = +n.h; } // dimensions not loaded yet: crop can only trim
      if (media) {
        crop = {
          el: media, cw, ch,
          x0: c0 ? c0.x || 0 : 0, y0: c0 ? c0.y || 0 : 0, // crop offset at drag start
          mw0: media.style.width, mh0: media.style.height, mt0: media.style.transform,
        };
      }
    }
    actionRef.current = {
      type: 'resize', id: n.id, corner, sx: e.clientX, sy: e.clientY,
      ox: +n.x, oy: +n.y, ow, oh: +n.h, ofs, mdType: n.type, loneSvg, crop,
    };
  };

  return (
    <div className="cv-chrome">
      <div className="cv-guides" ref={guidesRef} />
      <div className="cv-hov" ref={hovRef} />
      <div className="cv-sel" ref={selRef} />
      <div className="cv-marquee" ref={marqRef} />
      <div
        className="cbtn"
        title="Edit markdown"
        ref={editRef}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); if (single) eng.startEditing(single.id); }}
      >
        <Pencil />
      </div>
      <div className="cv-rz" ref={rzRef}>
        {['nw', 'ne', 'sw', 'se'].map((c) => (
          <div key={c} className={`cv-rz-h cv-rz-${c}`} onPointerDown={onResizeDown(c)} />
        ))}
      </div>
      <GridDividers />
      {nodes.filter((n) => n.type === 'frame').map((n) => <FrameLabel key={n.id} node={n} />)}
    </div>
  );
}
