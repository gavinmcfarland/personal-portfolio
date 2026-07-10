import { useEffect, useRef, useState } from 'react';
import { PaintBucket } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { BG_COLORS } from '../constants';

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
    <div className="bg-menu-wrap" ref={wrapRef}>
      <button
        className={`chip${open ? ' on' : ''}`}
        title="Canvas background colour"
        onClick={() => setOpen((o) => !o)}
      >
        <PaintBucket />
        <span className="chip-swatch" style={bgColor ? { background: bgColor } : undefined} />
      </button>
      {open && (
        <div className="ui panel bg-menu">
          <button
            className={`swatch default${!bgColor ? ' active' : ''}`}
            title="Theme default"
            onClick={() => eng.setCanvasBg(null)}
          />
          {BG_COLORS.map((hex) => (
            <button
              key={hex}
              className={`swatch${bgColor === hex ? ' active' : ''}`}
              title={hex}
              style={{ background: hex }}
              onClick={() => eng.setCanvasBg(hex)}
            />
          ))}
          <label className="swatch custom" title="Custom colour">
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
