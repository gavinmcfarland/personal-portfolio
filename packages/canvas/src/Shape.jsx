import { memo, useCallback } from 'react';
import { useCanvas } from './CanvasProvider';
import { themeInk } from './constants';

/* One freehand / vector drawing, rendered as its own overlaid SVG (matching the
   mockup so each shape keeps an independent z-index in the shared stack). */
function Shape({ shape, draft }) {
  const { shapeEls, reflow } = useCanvas();
  // Collision reflow publishes a derived {dx,dy} offset; a shape that overlaps a
  // moved node clusters with it and shifts by the same delta. Applied instantly
  // (no transition) as a transform on the shape's own SVG so its stored coords
  // stay authored and it moves in the same commit as the nodes.
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
  const common = { className: 'shape', stroke, strokeWidth: width, 'data-id': shape.id, ref: setRef };
  // Inline style wins over the `.shape.fillable` CSS rule, so a per-shape fill
  // (or 'none' for a hollow shape) is the source of truth for rect/ellipse.
  const fillStyle = { fill: shape.fill && shape.fill !== 'none' ? themeInk(shape.fill) : 'none' };

  let el = null;
  let defs = null;
  if (shape.type === 'pen') {
    const d = shape.points.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
    el = <path {...common} d={d} />;
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
        x1={shape.x1}
        y1={shape.y1}
        x2={shape.x2}
        y2={shape.y2}
        markerEnd={shape.type === 'arrow' ? `url(#${markerId})` : undefined}
      />
    );
  } else if (shape.type === 'rect') {
    el = (
      <rect
        {...common}
        className="shape fillable"
        style={fillStyle}
        x={Math.min(shape.x1, shape.x2)}
        y={Math.min(shape.y1, shape.y2)}
        width={Math.abs(shape.x2 - shape.x1)}
        height={Math.abs(shape.y2 - shape.y1)}
        rx={4}
      />
    );
  } else if (shape.type === 'ellipse') {
    el = (
      <ellipse
        {...common}
        className="shape fillable"
        style={fillStyle}
        cx={(shape.x1 + shape.x2) / 2}
        cy={(shape.y1 + shape.y2) / 2}
        rx={Math.abs(shape.x2 - shape.x1) / 2}
        ry={Math.abs(shape.y2 - shape.y1) / 2}
      />
    );
  }

  const svgStyle = { zIndex: draft ? 2147483647 : shape.z };
  if (rp) svgStyle.transform = `translate(${rp.dx}px,${rp.dy}px)`;
  return (
    // A draft has no z yet (assigned on commit), so pin it above the whole
    // stack — otherwise it renders behind existing objects while drawing.
    <svg className="shapeSvg" data-id={shape.id} style={svgStyle}>
      {defs}
      {el}
    </svg>
  );
}

export default memo(Shape);
