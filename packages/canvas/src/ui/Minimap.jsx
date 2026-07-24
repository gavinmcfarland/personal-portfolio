import { useEffect, useRef } from 'react';
import { useCanvas } from '../CanvasProvider';
import { cx } from '../constants';

/* Low-fidelity overview of the active page. The engine paints the content into
   the <canvas> (redrawMinimap, only on content change) and positions the
   viewport rectangle (syncMinimap, every pan/zoom) — this component just owns
   the DOM and the pointer interaction:
     • grab the rectangle → drag it to pan the board 1:1;
     • drag on empty map    → scrub the viewport there live;
     • a plain click        → glide the viewport to that point. */
export default function Minimap() {
  const { eng, MINIMAP, minimapEls, classNames } = useCanvas();
  const drag = useRef(null);

  // Paint once on mount (content may have loaded before this component did), and
  // repaint whenever the panel's resolved pixel size changes — so a size given
  // in %, em, vw, … stays correct as the container or root font-size changes
  // (the canvas backing store and world→map mapping are derived from that size).
  useEffect(() => {
    eng.redrawMinimap();
    const panel = minimapEls.panel;
    if (!panel || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => eng.scheduleMinimap());
    ro.observe(panel);
    return () => ro.disconnect();
  }, [eng, minimapEls]);

  const SLOP = 3; // px the pointer must travel before a background press counts as a drag

  const localPoint = (e) => {
    const panel = minimapEls.panel;
    const r = panel.getBoundingClientRect();
    return { px: e.clientX - r.left, py: e.clientY - r.top };
  };

  const onDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    eng.freezeView(); // stop any running glide so this gesture owns the view
    const onRect = !!e.target.closest('.cv-minimap-view');
    drag.current = { onRect, moved: false, lastX: e.clientX, lastY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.lastX, dy = e.clientY - d.lastY;
    d.lastX = e.clientX; d.lastY = e.clientY;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > SLOP) d.moved = true;
    if (d.onRect) {
      eng.minimapDrag(dx, dy); // rectangle follows the pointer 1:1
    } else if (d.moved) {
      const { px, py } = localPoint(e); // background scrub — recentre live, no glide
      eng.minimapCenterAt(px, py, false);
    }
  };
  const onUp = (e) => {
    const d = drag.current;
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (!d) return;
    // Plain click on empty map → glide the viewport to that point.
    if (!d.onRect && !d.moved) { const { px, py } = localPoint(e); eng.minimapCenterAt(px, py, true); }
  };

  return (
    <div
      className={cx('cv-ui cv-panel cv-minimap', classNames?.minimap)}
      data-cv-part="minimap"
      style={{ width: MINIMAP.width, height: MINIMAP.height }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      ref={(el) => { minimapEls.panel = el; }}
    >
      <canvas className="cv-minimap-canvas" ref={(el) => { minimapEls.canvas = el; }} />
      <div className="cv-minimap-view" ref={(el) => { minimapEls.view = el; }} />
    </div>
  );
}
