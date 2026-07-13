import { memo, useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { useRegister, useMediaSrc } from './common';

/* Dropped video object. Plays automatically on the board (muted + looped, which
   keeps browser autoplay policies happy — same feel as an animated GIF).
   Hovering reveals a play/pause + scrub bar overlay; it stops pointer
   propagation so using it never drags the node (edit) or pans / opens the
   lightbox (read-only). Double-click opens the lightbox, where the video gets
   native controls and sound. */
function VideoNode({ node }) {
  const { eng, mediaEls } = useCanvas();
  const { setRef, dataProps, style } = useRegister(node);
  const vidRef = useRef(null);
  /* Publish this element so the lightbox can pick up (and hand back) the live
     playback position — full-screen viewing resumes instead of restarting. */
  const setVid = (el) => {
    vidRef.current = el;
    if (el) mediaEls.set(node.id, el); else mediaEls.delete(node.id);
  };
  const fillRef = useRef(null);
  const scrub = useRef(null); // {wasPlaying} while dragging the bar
  const [playing, setPlaying] = useState(true);
  const src = useMediaSrc(node.src);
  const s = { ...style, width: (node.w || 320) + 'px', height: (node.h || 180) + 'px' };

  /* `playing` mirrors the element (autoplay can be blocked; loops fire events). */
  useEffect(() => {
    const v = vidRef.current;
    if (!v) return undefined;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    /* MediaRecorder-produced WebMs (screen recordings etc.) report
       duration: Infinity until the browser sees the end of the stream, which
       breaks seeking. The standard fix: over-seek once so Chromium resolves
       the real duration, then snap back to the start. */
    const onMeta = () => {
      if (v.duration !== Infinity) return;
      const done = () => { v.currentTime = 0; };
      v.addEventListener('seeked', done, { once: true });
      v.currentTime = 1e7;
    };
    setPlaying(!v.paused);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('loadedmetadata', onMeta);
    if (v.readyState >= 1) onMeta();
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('loadedmetadata', onMeta);
    };
  }, []);

  /* Progress fill is driven outside React (rAF + direct style write) so
     playback never causes re-renders and the bar moves at frame rate. */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = vidRef.current, fill = fillRef.current;
      if (v && fill && isFinite(v.duration) && v.duration > 0) {
        fill.style.width = (v.currentTime / v.duration) * 100 + '%';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggle = () => {
    const v = vidRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };
  const seek = (clientX, barEl) => {
    const v = vidRef.current;
    if (!v || !isFinite(v.duration) || !v.duration) return;
    const r = barEl.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    v.currentTime = f * v.duration;
  };
  /* Scrubbing pauses while dragging and resumes after, like every player. */
  const onScrubDown = (e) => {
    e.stopPropagation();
    const v = vidRef.current;
    if (!v) return;
    scrub.current = { wasPlaying: !v.paused };
    v.pause();
    e.currentTarget.setPointerCapture(e.pointerId);
    seek(e.clientX, e.currentTarget);
  };
  const onScrubMove = (e) => { if (scrub.current) seek(e.clientX, e.currentTarget); };
  const onScrubUp = () => {
    if (!scrub.current) return;
    if (scrub.current.wasPlaying) vidRef.current?.play();
    scrub.current = null;
  };

  return (
    <div
      ref={setRef}
      className="node video"
      {...dataProps}
      style={s}
      onDoubleClick={(e) => { e.stopPropagation(); eng.openFullscreen(node.id); }}
    >
      <video ref={setVid} src={src || undefined} autoPlay muted loop playsInline aria-label={node.alt || ''} />
      <div
        className="vctrl"
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button className="vplay" title={playing ? 'Pause' : 'Play'} onClick={toggle}>
          {playing ? <Pause /> : <Play />}
        </button>
        <div
          className="vbar"
          onPointerDown={onScrubDown}
          onPointerMove={onScrubMove}
          onPointerUp={onScrubUp}
          onPointerCancel={onScrubUp}
        >
          <div className="vtrack"><div className="vfill" ref={fillRef} /></div>
        </div>
      </div>
    </div>
  );
}

export default memo(VideoNode);
