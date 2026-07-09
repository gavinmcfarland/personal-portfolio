import { useEffect } from 'react';
import { useCanvas } from '../CanvasProvider';

/* Full-screen viewer for image nodes. Opened via double-click on an image or the
   node context menu; dismissed by clicking the backdrop, the close button, or
   Escape. Works in both editing and read-only modes. */
export default function Lightbox() {
  const { fullscreenId, nodes, eng } = useCanvas();

  useEffect(() => {
    if (!fullscreenId) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') eng.closeFullscreen(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreenId, eng]);

  if (!fullscreenId) return null;
  const node = nodes.find((n) => n.id === fullscreenId);
  if (!node || node.type !== 'image') return null;

  return (
    <div id="lightbox" onPointerDown={() => eng.closeFullscreen()}>
      <button
        className="lb-close"
        title="Close (Esc)"
        onPointerDown={(e) => { e.stopPropagation(); eng.closeFullscreen(); }}
      >
        ✕
      </button>
      <img src={node.src} alt={node.alt || ''} draggable={false} onPointerDown={(e) => e.stopPropagation()} />
    </div>
  );
}
