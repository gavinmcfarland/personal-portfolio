import { useCanvas } from '../CanvasProvider';

function anchorName(node) {
  if (node.type === 'frame') return (node.name || '').trim() || 'Untitled';
  if (node.type === 'md') {
    const first = (node.text || '')
      .split('\n')
      .map((l) => l.replace(/^#+\s*/, '').trim())
      .find(Boolean);
    return first ? first.slice(0, 32) : 'Markdown';
  }
  const txt = (node.text || '').replace(/\s+/g, ' ').trim();
  return txt ? txt.slice(0, 32) : node.type.charAt(0).toUpperCase() + node.type.slice(1);
}

export default function SectionsNav() {
  const { nodes, eng } = useCanvas();
  const items = nodes
    .filter((n) => n.type === 'frame' || n.anchor)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  return (
    <div className={`ui panel${items.length ? ' show' : ''}`} id="nav">
      <div className="nav-head">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" /><path d="M12 7v13M5 12a7 7 0 0 0 14 0" /></svg>
        Sections
      </div>
      <div id="navList">
        {items.map((n, i) => (
          <button key={n.id} className="nav-item" onClick={() => eng.flyTo(n.id)}>
            <span className="ni-num">{i + 1}</span>
            <span className="ni-name">{anchorName(n)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
