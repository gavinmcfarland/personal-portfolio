import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';

/* One playing <video> for a media asset. Plays automatically (muted + looped,
   which keeps browser autoplay policies happy — same feel as an animated GIF).
   As a standalone media node it shows a hover play/pause + scrub overlay; inside
   a grid it renders `bare` (no overlay — click opens the full-screen gallery,
   which has native controls). Either way it publishes its element into `mediaEls`
   under `mediaKey` so the lightbox can hand playback position off both ways. */
export default function VideoPlayer({ src, alt, mediaKey, bare, mediaStyle }) {
  const { mediaEls } = useCanvas();
  const vidRef = useRef(null);
  const fillRef = useRef(null);
  const scrub = useRef(null); // {wasPlaying} while dragging the bar
  const [playing, setPlaying] = useState(true);

  const setVid = (el) => {
    vidRef.current = el;
    if (el) mediaEls.set(mediaKey, el); else mediaEls.delete(mediaKey);
  };

  /* `playing` mirrors the element (autoplay can be blocked; loops fire events),
     and MediaRecorder WebMs need the over-seek duration fix so scrubbing works. */
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
  }, [src]);

  /* Progress fill is driven outside React (rAF + direct style write) so
     playback never causes re-renders and the bar moves at frame rate. */
  useEffect(() => {
    if (bare) return undefined;
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
  }, [bare]);

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
    <>
      <video ref={setVid} src={src || undefined} autoPlay muted loop playsInline aria-label={alt || ''} style={mediaStyle} />
      {!bare && (
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
      )}
    </>
  );
}
