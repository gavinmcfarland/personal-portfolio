import { useEffect, useRef, useState } from 'react';
import {
  MousePointer2, Hand, StickyNote, Type, FileCode, Code, Pen, Anchor,
  Slash, ArrowUpRight, Square, Circle, Mic,
  AlignLeft, AlignCenter, AlignRight, GripVertical,
} from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { COLORS, DRAW_TOOLS, FILLABLE_SHAPES, FONTS, themeInk, cx } from '../constants';

/* Vector shape tools grouped behind a single dropdown button in the toolbar. */
const SHAPE_TOOLS = [
  { t: 'line', label: 'Line', key: 'L', icon: <Slash /> },
  { t: 'arrow', label: 'Arrow', key: 'A', icon: <ArrowUpRight /> },
  { t: 'rect', label: 'Rectangle', key: 'R', icon: <Square /> },
  { t: 'ellipse', label: 'Ellipse', key: 'O', icon: <Circle /> },
];

const ALIGNS = [
  ['left', 'Align left', <AlignLeft />],
  ['center', 'Align centre', <AlignCenter />],
  ['right', 'Align right', <AlignRight />],
];

const TOOLS = [
  { t: 'select', label: 'Select / Move', key: 'V', icon: <MousePointer2 /> },
  { t: 'hand', label: 'Pan', key: 'H', icon: <Hand /> },
  { sep: true },
  { t: 'note', label: 'Sticky note', key: 'N', icon: <StickyNote /> },
  { t: 'text', label: 'Text', key: 'T', icon: <Type /> },
  { t: 'md', label: 'Markdown', key: 'M', icon: <FileCode /> },
  { t: 'code', label: 'Code', key: 'C', icon: <Code /> },
  { record: true },
  { sep: true },
  { t: 'pen', label: 'Draw / Pen', key: 'P', icon: <Pen /> },
  { shapeMenu: true },
  { sep: true },
  { t: 'frame', label: 'Anchor / Section', key: 'F', icon: <Anchor /> },
];

function ShapeMenu() {
  const { tool, eng } = useCanvas();
  const [open, setOpen] = useState(false);
  const [lastShape, setLastShape] = useState('arrow');
  const wrapRef = useRef(null);

  const activeShape = SHAPE_TOOLS.find((s) => s.t === tool);
  const shown =
    activeShape ||
    SHAPE_TOOLS.find((s) => s.t === lastShape) ||
    SHAPE_TOOLS[0];

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

  const pick = (t) => { setLastShape(t); eng.setTool(t); setOpen(false); };

  return (
    <div className="cv-shape-menu-wrap" ref={wrapRef}>
      {open && (
        <div className="cv-ui cv-panel cv-shape-menu">
          {SHAPE_TOOLS.map((s) => (
            <button
              key={s.t}
              className="cv-tool"
              data-active={tool === s.t ? '' : undefined}
              title={`${s.label} (${s.key})`}
              onClick={() => pick(s.t)}
            >
              {s.icon}
            </button>
          ))}
        </div>
      )}
      <button
        className="cv-tool"
        data-active={activeShape ? '' : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="cv-tip">Shapes</span>
        {shown.icon}
        <span className="cv-shape-caret" />
      </button>
    </div>
  );
}

/* Record-audio button. A one-shot action (not a click-to-place tool): pressing
   it requests the mic and starts capturing straight away; the floating recorder
   panel then drives stop/cancel. Hidden entirely where the browser can't record. */
function RecordButton() {
  const { recording, eng } = useCanvas();
  if (!eng.recordingSupported()) return null;
  return (
    <button
      className="cv-tool"
      data-active={recording ? '' : undefined}
      data-recording={recording ? '' : undefined}
      data-tool="record"
      onClick={() => { if (!recording) eng.startRecording(); }}
    >
      <span className="cv-tip">Record sound<b>S</b></span>
      <Mic />
    </button>
  );
}

/* Value shared by every item in a list, or undefined when they differ — used to
   highlight the active swatch only when the whole selection agrees. */
function commonValue(items, get) {
  if (!items.length) return undefined;
  const first = get(items[0]);
  return items.every((x) => get(x) === first) ? first : undefined;
}

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/* Floating properties panel, docked bottom-right of the canvas; drag its
   header to move it anywhere. Depending on context it either sets the
   defaults for the next shape/note or live-edits the current selection:
   - note tool, or a sticky note selected → note colours
   - a draw tool active, or shapes selected → Stroke row (+ Fill row for
     rectangles/ellipses). */
function Swatches() {
  const {
    tool, noteColor, textFont, strokeColor, fillColor,
    setNoteColor, setTextFont, setStrokeColor, setFillColor,
    selected, nodes, shapes, eng, classNames,
  } = useCanvas();
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  // null → default docked spot (bottom-right); {x, y} once the user drags it.
  const [pos, setPos] = useState(null);

  const startDrag = (e) => {
    const panel = panelRef.current;
    const host = panel?.offsetParent;
    if (!host) return;
    const r = panel.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: r.left - h.left, oy: r.top - h.top };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const moveDrag = (e) => {
    const d = dragRef.current;
    const panel = panelRef.current;
    const host = panel?.offsetParent;
    if (!d || !host) return;
    setPos({
      x: clamp(d.ox + e.clientX - d.sx, 0, Math.max(host.clientWidth - panel.offsetWidth, 0)),
      y: clamp(d.oy + e.clientY - d.sy, 0, Math.max(host.clientHeight - panel.offsetHeight, 0)),
    });
  };
  const endDrag = () => { dragRef.current = null; };

  const isSelect = tool === 'select';
  const selShapes = selected
    .filter((it) => it.kind === 'shape')
    .map((it) => shapes.find((s) => s.id === it.id))
    .filter(Boolean);
  const selNodesOfType = (type) => selected
    .filter((it) => it.kind === 'node')
    .map((it) => nodes.find((n) => n.id === it.id))
    .filter((n) => n && n.type === type);
  const selStickies = selNodesOfType('sticky');
  const selTexts = selNodesOfType('tblock');
  const editingShapes = isSelect && selShapes.length > 0;
  const editingStickies = isSelect && selStickies.length > 0;
  const editingTexts = isSelect && selTexts.length > 0;
  const fillableSel = selShapes.filter((s) => FILLABLE_SHAPES.includes(s.type));

  const showNote = tool === 'note' || editingStickies;
  const showFont = tool === 'text' || editingTexts;
  const showStroke = DRAW_TOOLS.includes(tool) || editingShapes;
  const showFill = FILLABLE_SHAPES.includes(tool) || fillableSel.length > 0;

  if (!showNote && !showFont && !showStroke && !showFill) return <div className={cx('cv-ui cv-panel', classNames?.properties)} data-cv-part="properties" />;

  const pickNote = (name) => {
    if (editingStickies) selStickies.forEach((n) => eng.updateNode(n.id, { color: name }));
    else setNoteColor(name);
  };
  const pickFont = (name) => {
    if (editingTexts) selTexts.forEach((n) => eng.updateNode(n.id, { font: name }));
    else setTextFont(name);
  };
  const pickAlign = (dir) => selTexts.forEach((n) => eng.updateNode(n.id, { align: dir }));
  const pickStroke = (hex) => {
    if (editingShapes) selShapes.forEach((s) => eng.updateShape(s.id, { stroke: hex }));
    else setStrokeColor(hex);
  };
  const pickFill = (hex) => {
    if (editingShapes) fillableSel.forEach((s) => eng.updateShape(s.id, { fill: hex }));
    else setFillColor(hex);
  };

  const curNote = editingStickies ? commonValue(selStickies, (n) => n.color) : noteColor;
  const curFont = editingTexts ? commonValue(selTexts, (n) => n.font || 'serif') : textFont;
  const curAlign = commonValue(selTexts, (n) => n.align || 'left');
  const curStroke = editingShapes ? commonValue(selShapes, (s) => s.stroke) : strokeColor;
  const curFill = fillableSel.length
    ? commonValue(fillableSel, (s) => s.fill || 'none')
    : fillColor;

  return (
    <div
      className={cx('cv-ui cv-panel', classNames?.properties)}
      data-open=""
      data-cv-part="properties"
      ref={panelRef}
      style={pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined}
    >
      <div
        className="cv-props-handle"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <GripVertical />
        Properties
      </div>
      {showNote && (
        <div className="cv-swatch-row">
          {COLORS.note.map(([hex, name]) => (
            <button
              key={name}
              className="cv-swatch"
              data-active={curNote === name ? '' : undefined}
              // Follow the --cv-note-<hue> token so a reskinned palette shows in
              // the picker too; the constant's hex is the token's default value.
              style={{ background: `var(--cv-note-${name}, ${hex})` }}
              title={name}
              onClick={() => pickNote(name)}
            />
          ))}
        </div>
      )}
      {showFont && (
        <div className="cv-swatch-row">
          {FONTS.map(([name, label]) => (
            <button
              key={name}
              className="cv-font-btn"
              data-active={curFont === name ? '' : undefined}
              data-font={name}
              title={label}
              onClick={() => pickFont(name)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {editingTexts && (
        <div className="cv-swatch-row">
          {ALIGNS.map(([dir, label, icon]) => (
            <button
              key={dir}
              className="cv-align-btn"
              data-active={curAlign === dir ? '' : undefined}
              title={label}
              onClick={() => pickAlign(dir)}
            >
              {icon}
            </button>
          ))}
        </div>
      )}
      {showStroke && (
        <div className="cv-swatch-row">
          <span className="cv-swatch-label">Stroke</span>
          {COLORS.stroke.map(([hex]) => (
            <button
              key={hex}
              className="cv-swatch"
              data-active={curStroke === hex ? '' : undefined}
              // Black flips to white in dark mode so the chip matches the stroke it draws.
              style={{ background: themeInk(hex) }}
              onClick={() => pickStroke(hex)}
            />
          ))}
        </div>
      )}
      {showFill && (
        <div className="cv-swatch-row">
          <span className="cv-swatch-label">Fill</span>
          {COLORS.fill.map(([hex, name]) => {
            const none = hex === 'none';
            return (
              <button
                key={hex}
                className={`cv-swatch${none ? ' cv-swatch-none' : ''}`}
                data-active={curFill === hex ? '' : undefined}
                // Composite the translucent fill over white so the chip reads the
                // same over any board bg. Black flips to white in dark mode (themeInk)
                // to match the fill it draws.
                style={none ? undefined : { backgroundColor: '#fff', backgroundImage: `linear-gradient(${themeInk(hex)},${themeInk(hex)})` }}
                title={none ? name : undefined}
                onClick={() => pickFill(hex)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Toolbar() {
  const { tool, eng, classNames } = useCanvas();
  return (
    <>
      <Swatches />
      <div className={cx('cv-ui cv-panel', classNames?.toolbar)} data-cv-part="toolbar">
        {TOOLS.map((item, i) =>
          item.sep ? (
            <span className="cv-sep" key={`sep-${i}`} />
          ) : item.shapeMenu ? (
            <ShapeMenu key="shape-menu" />
          ) : item.record ? (
            <RecordButton key="record" />
          ) : (
            <button
              key={item.t}
              className="cv-tool"
              data-active={tool === item.t ? '' : undefined}
              data-tool={item.t}
              onClick={() => eng.setTool(item.t)}
            >
              <span className="cv-tip">{item.label}<b>{item.key}</b></span>
              {item.icon}
            </button>
          )
        )}
      </div>
    </>
  );
}
