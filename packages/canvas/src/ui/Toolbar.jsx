import { useCanvas } from '../CanvasProvider';
import { COLORS, DRAW_TOOLS } from '../constants';

const TOOLS = [
  { t: 'select', label: 'Select / Move', key: 'V', icon: <path d="M4 3l7 17 2.5-6.5L20 11 4 3z" /> },
  { t: 'hand', label: 'Pan', key: 'H', icon: <path d="M8 13V6a1.5 1.5 0 0 1 3 0m0 0V5a1.5 1.5 0 0 1 3 0v1m0 0a1.5 1.5 0 0 1 3 0v5m0 0a1.5 1.5 0 0 1 3 0v3a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.9-3.2L5 15.5a1.6 1.6 0 0 1 2.6-1.8L8 14" /> },
  { sep: true },
  { t: 'note', label: 'Sticky note', key: 'N', icon: <><path d="M4 4h16v10l-6 6H4V4z" /><path d="M20 14h-6v6" /></> },
  { t: 'text', label: 'Text', key: 'T', icon: <path d="M5 5h14M12 5v14M9 19h6" /> },
  { t: 'md', label: 'Markdown', key: 'M', icon: <><rect x="3" y="6" width="18" height="12" rx="1.5" /><path d="M6 15v-6l2.5 3L11 9v6M15 9v4m0 0l-1.6-1.6M15 13l1.6-1.6" /></> },
  { sep: true },
  { t: 'pen', label: 'Draw / Pen', key: 'P', icon: <><path d="M4 20c3-1 4-3 7-8s5-6 7-6 1 3-2 7-6 6-9 7z" /><path d="M4 20l1.5-3.5" /></> },
  { t: 'line', label: 'Line', key: 'L', icon: <path d="M5 19L19 5" /> },
  { t: 'arrow', label: 'Arrow', key: 'A', icon: <path d="M5 19L19 5M11 5h8v8" /> },
  { t: 'rect', label: 'Rectangle', key: 'R', icon: <rect x="4" y="6" width="16" height="12" rx="1.5" /> },
  { t: 'ellipse', label: 'Ellipse', key: 'O', icon: <ellipse cx="12" cy="12" rx="8" ry="6" /> },
  { sep: true },
  { t: 'frame', label: 'Anchor / Section', key: 'F', icon: <><circle cx="12" cy="5" r="2" /><path d="M12 7v13M5 12a7 7 0 0 0 14 0M5 12H3m16 0h2" /></> },
];

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
                if (selected && selected.kind === 'node') {
                  const n = nodes.find((x) => x.id === selected.id);
                  if (n && n.type === 'sticky') eng.updateNode(n.id, { color: name });
                }
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
          ) : (
            <button
              key={item.t}
              className={`tool${tool === item.t ? ' active' : ''}`}
              data-tool={item.t}
              onClick={() => eng.setTool(item.t)}
            >
              <span className="tip">{item.label}<b>{item.key}</b></span>
              <svg viewBox="0 0 24 24">{item.icon}</svg>
            </button>
          )
        )}
      </div>
    </>
  );
}
