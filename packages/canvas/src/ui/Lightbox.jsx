import { useEffect } from 'react';
import { useCanvas } from '../CanvasProvider';
import { useMediaSrc } from '../nodes/common';

/* Full-screen viewer for image and video nodes. Opened via double-click or the
   node context menu; dismissed by clicking the backdrop, the close button, or
   Escape. Works in both editing and read-only modes. Videos get controls and
   sound here (the board keeps them muted for autoplay). */
export default function Lightbox() {
  const { fullscreenId, nodes, eng } = useCanvas();
  const found = fullscreenId ? nodes.find((n) => n.id === fullscreenId) : null;
  const node = found && (found.type === 'image' || found.type === 'video') ? found : null;
  const src = useMediaSrc(node ? node.src : null);

  useEffect(() => {
    if (!fullscreenId) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') eng.closeFullscreen(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreenId, eng]);

  if (!node) return null;

  return (
    <div id="lightbox" onPointerDown={() => eng.closeFullscreen()}>
      <button
        className="lb-close"
        title="Close (Esc)"
        onPointerDown={(e) => { e.stopPropagation(); eng.closeFullscreen(); }}
      >
        ✕
      </button>
      {node.type === 'video' ? (
        <video src={src || undefined} controls autoPlay loop playsInline onPointerDown={(e) => e.stopPropagation()} />
      ) : (
        <img src={src || undefined} alt={node.alt || ''} draggable={false} onPointerDown={(e) => e.stopPropagation()} />
      )}
    </div>
  );
}
