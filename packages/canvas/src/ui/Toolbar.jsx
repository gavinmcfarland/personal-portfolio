import { useEffect, useRef, useState } from 'react';
import {
  MousePointer2, Hand, StickyNote, Type, FileCode, Pen, Anchor,
  Slash, ArrowUpRight, Square, Circle,
} from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { COLORS, DRAW_TOOLS } from '../constants';

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

function Swatches() {
  const { tool, noteColor, strokeColor, setNoteColor, setStrokeColor, selected, nodes, eng } = useCanvas();
  const kind = tool === 'note' ? 'note' : 'stroke';
  const show = tool === 'note' || DRAW_TOOLS.includes(tool);
  if (!show) return <div className="ui panel" id="swatches" />;
  const current = kind === 'note' ? noteColor : strokeColor;
  return (
    <div className="ui panel show" id="swatches">
      {COLORS[kind].map(([hex, name]) => {
        const val = kind === 'note' ? name : hex;
        return (
          <button
            key={hex}
            className={`swatch${current === val ? ' active' : ''}`}
            style={{ background: hex }}
            onClick={() => {
              if (kind === 'note') {
                setNoteColor(name);
                selected.forEach((it) => {
                  if (it.kind !== 'node') return;
                  const n = nodes.find((x) => x.id === it.id);
                  if (n && n.type === 'sticky') eng.updateNode(n.id, { color: name });
                });
              } else setStrokeColor(hex);
            }}
          />
        );
      })}
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
