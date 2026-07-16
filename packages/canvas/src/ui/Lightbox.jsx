import { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { useMediaSrc } from '../nodes/common';

/* Full-screen viewer for a media node's assets. Opened via double-click / tap or
   the node context menu; dismissed by clicking the backdrop, the close button, or
   Escape. A multi-asset node becomes a gallery: prev/next arrows and ←/→ keys
   page through it (wrapping). Videos get controls and sound here (the board keeps
   them muted for autoplay).

   Playback is handed off in both directions: opening a video seeds it from the
   inline cell's live position (so it resumes instead of restarting), and closing
   writes the position back. GIFs render as <img> and have no seek API, so they
   always restart. */
export default function Lightbox() {
  const { fullscreen, nodes, eng, mediaEls } = useCanvas();
  const found = fullscreen ? nodes.find((n) => n.id === fullscreen.id) : null;
  const node = found && (found.type === 'image' || found.type === 'video') ? found : null;
  const assets = node && node.assets ? node.assets : [];
  const index = fullscreen ? Math.max(0, Math.min(fullscreen.index, assets.length - 1)) : 0;
  const asset = assets[index] || null;
  const many = assets.length > 1;
  const mediaKey = node ? `${node.id}:${index}` : '';
  const src = useMediaSrc(asset ? asset.src : null);
  const srcDark = useMediaSrc(asset ? asset.srcDark : null);
  const vidRef = useRef(null);

  /* Hand the current full-screen position back to the inline cell, then close. */
  const close = useCallback(() => {
    const lb = vidRef.current;
    const inline = mediaKey ? mediaEls.get(mediaKey) : null;
    if (lb && inline && isFinite(lb.currentTime)) {
      try { inline.currentTime = lb.currentTime; } catch { /* seek not ready */ }
    }
    eng.closeFullscreen();
  }, [mediaKey, mediaEls, eng]);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') eng.stepFullscreen(1);
      else if (e.key === 'ArrowLeft') eng.stepFullscreen(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, close, eng]);

  /* Resume video playback from wherever the inline cell currently is. */
  const onVideoMeta = (e) => {
    const inline = mediaKey ? mediaEls.get(mediaKey) : null;
    const t = inline && isFinite(inline.currentTime) ? inline.currentTime : 0;
    const v = e.currentTarget;
    if (t > 0 && (!isFinite(v.duration) || t < v.duration)) v.currentTime = t;
  };

  if (!node || !asset) return null;

  const nav = (dir) => (e) => { e.stopPropagation(); eng.stepFullscreen(dir); };

  return (
    <div id="lightbox" onPointerDown={close}>
      <button
        className="lb-close"
        title="Close (Esc)"
        onPointerDown={(e) => { e.stopPropagation(); close(); }}
      >
        ✕
      </button>
      {many && (
        <button className="lb-nav lb-prev" title="Previous (←)" onPointerDown={nav(-1)}>
          <ChevronLeft />
        </button>
      )}
      {/* key forces a fresh element per asset so switching never shows a stale frame */}
      {asset.kind === 'video' ? (
        <video
          key={mediaKey}
          ref={vidRef}
          src={src || undefined}
          controls
          autoPlay
          loop
          playsInline
          onLoadedMetadata={onVideoMeta}
          onPointerDown={(e) => e.stopPropagation()}
        />
      ) : asset.srcDark ? (
        /* Dark-variant pair: both render, CSS on the `.dark` ancestor picks one
           (see canvas.css) — mirrors the inline node so the theme can flip while
           the lightbox is open. */
        <>
          <img
            key={`${mediaKey}:light`}
            className="cv-light"
            src={src || undefined}
            alt={asset.alt || ''}
            draggable={false}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <img
            key={`${mediaKey}:dark`}
            className="cv-dark"
            src={srcDark || undefined}
            alt={asset.alt || ''}
            draggable={false}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </>
      ) : (
        <img
          key={mediaKey}
          src={src || undefined}
          alt={asset.alt || ''}
          draggable={false}
          onPointerDown={(e) => e.stopPropagation()}
        />
      )}
      {many && (
        <button className="lb-nav lb-next" title="Next (→)" onPointerDown={nav(1)}>
          <ChevronRight />
        </button>
      )}
      {many && <div className="lb-count">{index + 1} / {assets.length}</div>}
    </div>
  );
}
