import { memo, useCallback } from 'react';
import { useCanvas } from './CanvasProvider';
import { themeInk } from './constants';
import { isSketch, sketchFill, sketchStroke } from './sketch';

const r2 = (v) => Math.round(v * 100) / 100;

/* The geometry attributes an SVG element needs to draw a shape, keyed by their
   SVG attribute names — so the same values can be spread as React props (below)
   or written straight to the live element mid-resize (see drawShapeGeom).

   A hand-drawn shape is a <path> whatever its type: its wobble can't be
   expressed as a <rect>/<ellipse>, so the whole outline is plotted into one `d`
   (see sketch.js). Everything downstream — hit-testing, getBBox, the live
   resize — works off that element exactly as it does off the plain ones. */
export function shapeGeom(s) {
  if (isSketch(s)) return { d: sketchStroke(s) };
  if (s.type === 'pen') {
    return { d: (s.points || []).map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ') };
  }
  if (s.type === 'line' || s.type === 'arrow') return { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 };
  if (s.type === 'rect') {
    return {
      x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2),
      width: Math.abs(s.x2 - s.x1), height: Math.abs(s.y2 - s.y1), rx: 4,
    };
  }
  if (s.type === 'ellipse') {
    return {
      cx: (s.x1 + s.x2) / 2, cy: (s.y1 + s.y2) / 2,
      rx: Math.abs(s.x2 - s.x1) / 2, ry: Math.abs(s.y2 - s.y1) / 2,
    };
  }
  return null;
}

/* Write a shape's geometry straight onto its rendered SVG element — the live
   half of a resize drag, which mutates the DOM per pointermove and only commits
   to state on release (the same imperative path a node resize takes). */
export function drawShapeGeom(el, s) {
  const g = shapeGeom(s);
  if (g) for (const k in g) el.setAttribute(k, g[k]);
  // A hand-drawn fillable shape carries its interior on a second path just
  // before the outline (see below) — redraw that too, or the fill lags a
  // resize by a frame's worth of drag.
  const fillEl = el.previousElementSibling;
  if (fillEl && fillEl.hasAttribute('data-cv-fill')) fillEl.setAttribute('d', sketchFill(s) || '');
}

/* A shape's points mapped through a resize: the drag's source box origin
   (x0, y0) scaled by (sx, sy) onto a new origin (x, y). Returns the geometry
   patch to store — the stroke width is untouched, so scaling a shape doesn't
   thicken its line. */
export function scaleShape(s, m) {
  const fx = (v) => r2(m.x + (v - m.x0) * m.sx);
  const fy = (v) => r2(m.y + (v - m.y0) * m.sy);
  return s.type === 'pen'
    ? { points: (s.points || []).map((p) => [fx(p[0]), fy(p[1])]) }
    : { x1: fx(s.x1), y1: fy(s.y1), x2: fx(s.x2), y2: fy(s.y2) };
}

/* One freehand / vector drawing, rendered as its own overlaid SVG (matching the
   mockup so each shape keeps an independent z-index in the shared stack). */
function Shape({ shape, draft }) {
  const { shapeEls, reflow, collide, readOnly } = useCanvas();
  // Collision reflow publishes a derived {dx,dy} offset; a shape that overlaps a
  // moved node clusters with it and shifts by the same delta. The offset (and its
  // transition) is applied to a wrapping <div> — not the <svg> — so a shape moves
  // on the same rendering path as the nodes (which are <div>s) and can't drift.
  const rp = draft ? null : reflow && reflow.get(shape.id);
  const setRef = useCallback(
    (el) => {
      if (draft) return;
      if (el) shapeEls.set(shape.id, el); else shapeEls.delete(shape.id);
    },
    [shape.id, shapeEls, draft]
  );

  // Black stroke/fill flip to white in dark mode (themeInk maps them to theme
  // tokens); every other hue passes through unchanged. The arrow marker reuses
  // the resolved stroke below so its head matches.
  const stroke = themeInk(shape.stroke);
  const width = shape.width || 3;
  const common = { className: 'cv-shape', stroke, strokeWidth: width, 'data-id': shape.id, ref: setRef };
  // Inline style wins over the `.shape.fillable` CSS rule, so a per-shape fill
  // (or 'none' for a hollow shape) is the source of truth for rect/ellipse.
  const fillStyle = { fill: shape.fill && shape.fill !== 'none' ? themeInk(shape.fill) : 'none' };

  // Geometry comes from the shared helper so a live resize (which writes these
  // same attributes to the DOM) and the render can never drift apart.
  const geom = shapeGeom(shape);
  let el = null;
  let defs = null;
  if (isSketch(shape)) {
    // The outline is one path of loose, twice-inked edges, so it has no interior
    // to fill or click — a rect's four sides don't even meet. The fill (and the
    // hollow shape's clickable inside, which `.cv-fillable` gives it whatever the
    // paint) therefore rides on a closed path underneath. It carries the same
    // data-id so a click anywhere on the shape resolves to it, and sits before
    // the outline both to paint behind it and to be findable from it.
    const fillD = sketchFill(shape);
    el = (
      <>
        {fillD && (
          <path className="cv-shape cv-fillable" data-cv-fill="" data-id={shape.id} d={fillD} style={fillStyle} />
        )}
        <path {...common} {...geom} />
      </>
    );
  } else if (shape.type === 'pen') {
    el = <path {...common} {...geom} />;
  } else if (shape.type === 'line' || shape.type === 'arrow') {
    const markerId = `arw-${shape.id}`;
    if (shape.type === 'arrow') {
      defs = (
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={stroke} />
          </marker>
        </defs>
      );
    }
    el = (
      <line
        {...common}
        {...geom}
        markerEnd={shape.type === 'arrow' ? `url(#${markerId})` : undefined}
      />
    );
  } else if (shape.type === 'rect') {
    el = <rect {...common} {...geom} className="cv-shape cv-fillable" style={fillStyle} />;
  } else if (shape.type === 'ellipse') {
    el = <ellipse {...common} {...geom} className="cv-shape cv-fillable" style={fillStyle} />;
  }

  // The wrapper carries the z-index and the reflow transform/transition; the SVG
  // inside just draws the shape at its authored coords. A draft has no z yet
  // (assigned on commit), so pin it above the whole stack.
  const wrapStyle = { zIndex: draft ? 2147483647 : shape.z };
  if (rp) wrapStyle.transform = `translate(${rp.dx}px,${rp.dy}px)`;
  if (collide && readOnly) wrapStyle.transition = 'transform 200ms ease';
  return (
    <div className="cv-shapeWrap" data-cv-part="shape" data-id={shape.id} style={wrapStyle}>
      <svg className="cv-shapeSvg">
        {defs}
        {el}
      </svg>
    </div>
  );
}

export default memo(Shape);
