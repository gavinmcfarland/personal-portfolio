import { memo, useCallback } from 'react';
import { useCanvas } from './CanvasProvider';

/* One freehand / vector drawing, rendered as its own overlaid SVG (matching the
   mockup so each shape keeps an independent z-index in the shared stack). */
function Shape({ shape, draft }) {
  const { shapeEls } = useCanvas();
  const setRef = useCallback(
    (el) => {
      if (draft) return;
      if (el) shapeEls.set(shape.id, el); else shapeEls.delete(shape.id);
    },
    [shape.id, shapeEls, draft]
  );

  const stroke = shape.stroke;
  const width = shape.width || 3;
  const common = { className: 'shape', stroke, strokeWidth: width, 'data-id': shape.id, ref: setRef };

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
        cx={(shape.x1 + shape.x2) / 2}
        cy={(shape.y1 + shape.y2) / 2}
        rx={Math.abs(shape.x2 - shape.x1) / 2}
        ry={Math.abs(shape.y2 - shape.y1) / 2}
      />
    );
  }

  return (
    // A draft has no z yet (assigned on commit), so pin it above the whole
    // stack — otherwise it renders behind existing objects while drawing.
    <svg className="shapeSvg" data-id={shape.id} style={{ zIndex: draft ? 2147483647 : shape.z }}>
      {defs}
      {el}
    </svg>
  );
}

export default memo(Shape);
