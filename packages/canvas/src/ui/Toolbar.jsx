import { useEffect, useRef, useState } from 'react';
import {
  MousePointer2, Hand, StickyNote, Type, FileCode, Code, Pen, Anchor,
  Slash, ArrowUpRight, Square, Circle, Mic,
} from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { COLORS, DRAW_TOOLS, FILLABLE_SHAPES, FONTS } from '../constants';

/* Vector shape tools grouped behind a single dropdown button in the toolbar. */
const SHAPE_TOOLS = [
  { t: 'line', label: 'Line', key: 'L', icon: <Slash /> },
  { t: 'arrow', label: 'Arrow', key: 'A', icon: <ArrowUpRight /> },
  { t: 'rect', label: 'Rectangle', key: 'R', icon: <Square /> },
  { t: 'ellipse', label: 'Ellipse', key: 'O', icon: <Circle /> },
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
    <div className="shape-menu-wrap" ref={wrapRef}>
      {open && (
        <div className="ui panel shape-menu">
          {SHAPE_TOOLS.map((s) => (
            <button
              key={s.t}
              className={`tool${tool === s.t ? ' active' : ''}`}
              title={`${s.label} (${s.key})`}
              onClick={() => pick(s.t)}
            >
              {s.icon}
            </button>
          ))}
        </div>
      )}
      <button
        className={`tool${activeShape ? ' active' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="tip">Shapes</span>
        {shown.icon}
        <span className="shape-caret" />
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
      className={`tool${recording ? ' active recording' : ''}`}
      data-tool="record"
      onClick={() => { if (!recording) eng.startRecording(); }}
    >
      <span className="tip">Record sound<b>S</b></span>
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

/* Colour palette below the toolbar. Depending on context it either sets the
   defaults for the next shape/note or live-edits the current selection:
   - note tool, or a sticky note selected → note colours
   - a draw tool active, or shapes selected → Stroke row (+ Fill row for
     rectangles/ellipses). */
function Swatches() {
  const {
    tool, noteColor, textFont, strokeColor, fillColor,
    setNoteColor, setTextFont, setStrokeColor, setFillColor,
    selected, nodes, shapes, eng,
  } = useCanvas();

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

  if (!showNote && !showFont && !showStroke && !showFill) return <div className="ui panel" id="swatches" />;

  const pickNote = (name) => {
    if (editingStickies) selStickies.forEach((n) => eng.updateNode(n.id, { color: name }));
    else setNoteColor(name);
  };
  const pickFont = (name) => {
    if (editingTexts) selTexts.forEach((n) => eng.updateNode(n.id, { font: name }));
    else setTextFont(name);
  };
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
  const curStroke = editingShapes ? commonValue(selShapes, (s) => s.stroke) : strokeColor;
  const curFill = fillableSel.length
    ? commonValue(fillableSel, (s) => s.fill || 'none')
    : fillColor;

  return (
    <div className="ui panel show" id="swatches">
      {showNote && (
        <div className="swatch-row">
          {COLORS.note.map(([hex, name]) => (
            <button
              key={name}
              className={`swatch${curNote === name ? ' active' : ''}`}
              style={{ background: hex }}
              title={name}
              onClick={() => pickNote(name)}
            />
          ))}
        </div>
      )}
      {showFont && (
        <div className="swatch-row">
          {FONTS.map(([name, label]) => (
            <button
              key={name}
              className={`font-btn${curFont === name ? ' active' : ''}`}
              data-font={name}
              title={label}
              onClick={() => pickFont(name)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {showStroke && (
        <div className="swatch-row">
          <span className="swatch-label">Stroke</span>
          {COLORS.stroke.map(([hex]) => (
            <button
              key={hex}
              className={`swatch${curStroke === hex ? ' active' : ''}`}
              style={{ background: hex }}
              onClick={() => pickStroke(hex)}
            />
          ))}
        </div>
      )}
      {showFill && (
        <div className="swatch-row">
          <span className="swatch-label">Fill</span>
          {COLORS.fill.map(([hex, name]) => {
            const none = hex === 'none';
            return (
              <button
                key={hex}
                className={`swatch${none ? ' swatch-none' : ''}${curFill === hex ? ' active' : ''}`}
                // Composite the translucent fill over white so the chip looks
                // the same in both themes (on the board it sits over the actual bg).
                style={none ? undefined : { backgroundColor: '#fff', backgroundImage: `linear-gradient(${hex},${hex})` }}
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
  const { tool, eng } = useCanvas();
  return (
    <>
      <Swatches />
      <div className="ui panel" id="toolbar">
        {TOOLS.map((item, i) =>
          item.sep ? (
            <span className="sep" key={`sep-${i}`} />
          ) : item.shapeMenu ? (
            <ShapeMenu key="shape-menu" />
          ) : item.record ? (
            <RecordButton key="record" />
          ) : (
            <button
              key={item.t}
              className={`tool${tool === item.t ? ' active' : ''}`}
              data-tool={item.t}
              onClick={() => eng.setTool(item.t)}
            >
              <span className="tip">{item.label}<b>{item.key}</b></span>
              {item.icon}
            </button>
          )
        )}
      </div>
    </>
  );
}
