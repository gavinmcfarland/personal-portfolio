import { useEffect, useRef, useState } from 'react';
import { PaintBucket } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { BG_COLORS } from '../constants';

/* Preview a preset the way it lands on the board: the hue blended into the base
   board colour. `--bg-base` and `--bg-tint` both resolve per theme, so swatches
   match what you'll get in the current mode. Mirrors the color-mix in canvas.css. */
const tint = (hex) => `color-mix(in oklch, ${hex} var(--cv-bg-tint), var(--cv-bg-base))`;

/* Stored colours are plain hex strings, so compare them case-insensitively —
   a hand-typed `#e5484d` is the same swatch as the preset's `#E5484D`. */
const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/* Accept anything a person would reasonably type or paste into the hex field —
   with or without the leading #, 3- or 6-digit — and normalise to the 6-digit
   form the board stores (and that <input type="color"> requires). */
/* Light mode's `--bg-tint`; only a fallback for when the root can't be read. */
const DEFAULT_TINT = 6;

const HEX = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
function normHex(raw) {
  const s = String(raw).trim();
  if (!HEX.test(s)) return null;
  const d = s.replace('#', '').toLowerCase();
  return `#${d.length === 3 ? d.replace(/./g, (c) => c + c) : d}`;
}

/* Edit-mode picker for the board's background colour. Lives in the top bar;
   the chosen colour persists in the board snapshot (null = theme default).
   The presets are shortcuts, not the whole range: the wheel swatch opens the
   system colour picker and the hex field takes any value, so any colour goes. */
export default function BgColorMenu() {
  const { bgColor, bgStrength, rootRef, eng } = useCanvas();
  const [open, setOpen] = useState(false);
  /* The hex field holds free text while it's being typed — a half-written value
     ("#e54") is not yet the colour the user means — so it keeps its own draft
     and only pushes through the ones that parse. */
  const [draft, setDraft] = useState(bgColor ? bgColor.replace('#', '') : '');
  /* Until the board sets its own strength, the tint comes from the theme (a
     different amount in light and dark). Read that value off the root so the
     slider opens where the board actually is rather than at some fixed guess. */
  const [themeTint, setThemeTint] = useState(DEFAULT_TINT);
  const wrapRef = useRef(null);

  /* Follow the board whenever the colour changes from anywhere else: a preset
     click, a drag in the system picker, or the reset to theme default. */
  useEffect(() => { setDraft(bgColor ? bgColor.replace('#', '') : ''); }, [bgColor]);

  /* Sample on open, not once on mount: the theme can flip while the board is up.
     A board with its own strength ignores this, so only read it when it matters. */
  useEffect(() => {
    if (!open || bgStrength != null) return;
    const el = rootRef && rootRef.current;
    if (!el) return;
    const v = parseFloat(getComputedStyle(el).getPropertyValue('--cv-bg-tint'));
    if (Number.isFinite(v)) setThemeTint(v);
  }, [open, bgStrength, rootRef]);

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

  const onHexInput = (e) => {
    const v = e.target.value;
    setDraft(v);
    const hex = normHex(v);
    if (hex) eng.setCanvasBg(hex);
    else if (!v.trim()) eng.setCanvasBg(null); // cleared field = back to theme default
  };
  /* Drop anything unparseable on the way out so the field never lingers on a
     value the board isn't actually using. */
  const onHexBlur = () => setDraft(bgColor ? bgColor.replace('#', '') : '');

  const isPreset = BG_COLORS.some((hex) => same(bgColor, hex));
  const custom = bgColor && !isPreset ? bgColor : null;
  const strength = bgStrength == null ? themeTint : bgStrength;

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
          <div className="cv-bg-menu-row">
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
                data-active={same(bgColor, hex) ? '' : undefined}
                title={hex}
                style={{ background: tint(hex) }}
                onClick={() => eng.setCanvasBg(hex)}
              />
            ))}
            <label
              className="cv-swatch cv-custom"
              data-active={custom ? '' : undefined}
              title="Custom colour"
              style={custom ? { background: tint(custom) } : undefined}
            >
              <input
                type="color"
                value={bgColor || '#f6f5f3'}
                onChange={(e) => eng.setCanvasBg(e.target.value)}
              />
            </label>
          </div>
          <div className="cv-bg-hex">
            <span className="cv-bg-hex-hash">#</span>
            <input
              className="cv-bg-hex-input"
              value={draft}
              onChange={onHexInput}
              onBlur={onHexBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              placeholder="default"
              spellCheck={false}
              autoComplete="off"
              maxLength={7}
              aria-label="Background colour hex"
            />
          </div>
          {/* Strength: how much of the pick survives the blend into the board
              base. Nothing to weigh without a colour, so it greys out there. */}
          <div className="cv-bg-strength" data-off={!bgColor ? '' : undefined}>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={strength}
              disabled={!bgColor}
              onChange={(e) => eng.setCanvasBgStrength(Number(e.target.value))}
              onDoubleClick={() => eng.setCanvasBgStrength(null)}
              title="Strength — double-click to restore the theme's own tint"
              aria-label="Background colour strength"
            />
            <span className="cv-bg-strength-val">{Math.round(strength)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
