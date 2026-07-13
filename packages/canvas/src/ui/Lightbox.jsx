import { useCallback, useEffect, useRef } from 'react';
import { useCanvas } from '../CanvasProvider';
import { useMediaSrc } from '../nodes/common';

/* Full-screen viewer for image and video nodes. Opened via double-click or the
   node context menu; dismissed by clicking the backdrop, the close button, or
   Escape. Works in both editing and read-only modes. Videos get controls and
   sound here (the board keeps them muted for autoplay).

   Playback is handed off in both directions: opening seeds the full-screen
   <video> from the inline node's live position (so it resumes instead of
   restarting), and closing writes the position back so the board picks up
   where the viewer left off. GIFs render as <img> and have no seek API, so
   they always restart. */
export default function Lightbox() {
  const { fullscreenId, nodes, eng, mediaEls } = useCanvas();
  const found = fullscreenId ? nodes.find((n) => n.id === fullscreenId) : null;
  const node = found && (found.type === 'image' || found.type === 'video') ? found : null;
  const src = useMediaSrc(node ? node.src : null);
  const vidRef = useRef(null);

  /* Hand the current full-screen position back to the inline node, then close. */
  const close = useCallback(() => {
    const lb = vidRef.current;
    const inline = fullscreenId ? mediaEls.get(fullscreenId) : null;
    if (lb && inline && isFinite(lb.currentTime)) {
      try { inline.currentTime = lb.currentTime; } catch { /* seek not ready */ }
    }
    eng.closeFullscreen();
  }, [fullscreenId, mediaEls, eng]);

  useEffect(() => {
    if (!fullscreenId) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreenId, close]);

  /* Resume from wherever the inline video currently is. */
  const onVideoMeta = (e) => {
    const inline = fullscreenId ? mediaEls.get(fullscreenId) : null;
    const t = inline && isFinite(inline.currentTime) ? inline.currentTime : 0;
    const v = e.currentTarget;
    if (t > 0 && (!isFinite(v.duration) || t < v.duration)) v.currentTime = t;
  };

  if (!node) return null;

  return (
    <div id="lightbox" onPointerDown={close}>
      <button
        className="lb-close"
        title="Close (Esc)"
        onPointerDown={(e) => { e.stopPropagation(); close(); }}
      >
        ✕
      </button>
      {node.type === 'video' ? (
        <video
          ref={vidRef}
          src={src || undefined}
          controls
          autoPlay
          loop
          playsInline
          onLoadedMetadata={onVideoMeta}
          onPointerDown={(e) => e.stopPropagation()}
        />
      ) : (
        <img src={src || undefined} alt={node.alt || ''} draggable={false} onPointerDown={(e) => e.stopPropagation()} />
      )}
    </div>
  );
}
