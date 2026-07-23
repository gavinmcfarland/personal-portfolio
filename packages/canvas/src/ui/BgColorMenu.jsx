import { useEffect, useRef, useState } from 'react';
import { PaintBucket } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { BG_COLORS } from '../constants';

/* Preview a preset the way it lands on the board: the hue blended into the base
   board colour. `--bg-base` and `--bg-tint` both resolve per theme, so swatches
   match what you'll get in the current mode. Mirrors the color-mix in canvas.css. */
const tint = (hex) => `color-mix(in oklch, ${hex} var(--cv-bg-tint), var(--cv-bg-base))`;

/* Edit-mode picker for the board's background colour. Lives in the top bar;
   the chosen colour persists in the board snapshot (null = theme default). */
export default function BgColorMenu() {
  const { bgColor, eng } = useCanvas();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="cv-bg-menu-wrap" ref={wrapRef}>
      <button
        className="cv-chip"
        data-on={open ? '' : undefined}
        title="Canvas background colour"
        onClick={() => setOpen((o) => !o)}
      >
        <PaintBucket />
        <span className="cv-chip-swatch" style={bgColor ? { background: tint(bgColor) } : undefined} />
      </button>
      {open && (
        <div className="cv-ui cv-panel cv-bg-menu">
          <button
            className="cv-swatch cv-default"
            data-active={!bgColor ? '' : undefined}
            title="Theme default"
            onClick={() => eng.setCanvasBg(null)}
          />
          {BG_COLORS.map((hex) => (
            <button
              key={hex}
              className="cv-swatch"
              data-active={bgColor === hex ? '' : undefined}
              title={hex}
              style={{ background: tint(hex) }}
              onClick={() => eng.setCanvasBg(hex)}
            />
          ))}
          <label className="cv-swatch cv-custom" title="Custom colour">
            <input
              type="color"
              value={bgColor || '#f6f5f3'}
              onChange={(e) => eng.setCanvasBg(e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
