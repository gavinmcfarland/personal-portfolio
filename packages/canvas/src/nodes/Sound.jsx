import { memo, useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { useRegister, useMediaSrc } from './common';

/* Dropped / pasted / recorded audio object. A fixed-size player card: a
   play/pause button, the clip name, and a scrub bar with an elapsed / total
   time readout. Controls stop pointer propagation so using them never drags the
   node (edit) or pans the board (read-only) — so viewers can play a clip on a
   published board without moving it. */
function fmt(t) {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function SoundNode({ node }) {
  const { eng, editingId } = useCanvas();
  const { setRef, dataProps, style } = useRegister(node);
  const audRef = useRef(null);
  const fillRef = useRef(null);
  const nameRef = useRef(null);
  const scrub = useRef(null); // {wasPlaying} while dragging the bar
  const cancelRename = useRef(false); // Esc sets this so the blur commit is skipped
  const [playing, setPlaying] = useState(false);
  const [dur, setDur] = useState(node.dur || 0);
  const [cur, setCur] = useState(0);
  // Double-click routes through the engine's editingId (pointer capture on the
  // node steals the node's own dblclick — see Canvas.onDoubleClick).
  const renaming = editingId === node.id;
  const src = useMediaSrc(node.src);
  const s = { ...style, width: (node.w || 260) + 'px', height: (node.h || 56) + 'px' };

  /* `playing`/`dur` mirror the element. MediaRecorder-produced WebMs report
     duration: Infinity until the browser sees the end of the stream (same quirk
     as video screen recordings); the standard fix is to over-seek once so the
     real duration resolves, then snap back to the start. */
  useEffect(() => {
    const a = audRef.current;
    if (!a) return undefined;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => setPlaying(false);
    const onMeta = () => {
      if (a.duration === Infinity) {
        const done = () => { a.currentTime = 0; setDur(isFinite(a.duration) ? a.duration : 0); };
        a.addEventListener('seeked', done, { once: true });
        a.currentTime = 1e7;
      } else setDur(a.duration || 0);
    };
    setPlaying(!a.paused);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnd);
    a.addEventListener('loadedmetadata', onMeta);
    if (a.readyState >= 1) onMeta();
    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnd);
      a.removeEventListener('loadedmetadata', onMeta);
    };
  }, [src]);

  /* Progress fill is driven outside React (rAF + direct style write) so playback
     never causes re-renders and the bar moves at frame rate. */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const a = audRef.current, fill = fillRef.current;
      if (a && fill && isFinite(a.duration) && a.duration > 0) {
        fill.style.width = (a.currentTime / a.duration) * 100 + '%';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* The numeric time label only needs to tick a few times a second. */
  useEffect(() => {
    const id = setInterval(() => { const a = audRef.current; if (a) setCur(a.currentTime); }, 250);
    return () => clearInterval(id);
  }, []);

  const toggle = () => {
    const a = audRef.current;
    if (!a) return;
    if (a.paused) a.play(); else a.pause();
  };
  const seek = (clientX, barEl) => {
    const a = audRef.current;
    if (!a || !isFinite(a.duration) || !a.duration) return;
    const r = barEl.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    a.currentTime = f * a.duration;
    setCur(a.currentTime);
  };
  /* Scrubbing pauses while dragging and resumes after, like every player. */
  const onScrubDown = (e) => {
    e.stopPropagation();
    const a = audRef.current;
    if (!a) return;
    scrub.current = { wasPlaying: !a.paused };
    a.pause();
    e.currentTarget.setPointerCapture(e.pointerId);
    seek(e.clientX, e.currentTarget);
  };
  const onScrubMove = (e) => { if (scrub.current) seek(e.clientX, e.currentTarget); };
  const onScrubUp = () => {
    if (!scrub.current) return;
    if (scrub.current.wasPlaying) audRef.current?.play();
    scrub.current = null;
  };

  /* Renaming (entered by double-click, handled in Canvas.onDoubleClick → the
     engine's editingId). Commit on Enter / blur; Esc cancels via the ref flag so
     the unmount blur doesn't overwrite the name. */
  useEffect(() => {
    if (renaming && nameRef.current) { cancelRename.current = false; nameRef.current.focus(); nameRef.current.select(); }
  }, [renaming]);
  const commitRename = () => {
    if (!cancelRename.current && nameRef.current) {
      eng.updateNode(node.id, { name: nameRef.current.value.trim() || 'Audio' });
    }
    if (editingId === node.id) eng.stopEditing();
  };

  const timeLabel = dur ? `${fmt(cur)} / ${fmt(dur)}` : '';

  return (
    <div ref={setRef} className="cv-node cv-sound" {...dataProps} style={s}>
      <audio ref={audRef} src={src || undefined} preload="metadata" />
      <button
        className="cv-splay"
        title={playing ? 'Pause' : 'Play'}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); toggle(); }}
      >
        {playing ? <Pause /> : <Play />}
      </button>
      <div className="cv-sbody">
        <div className="cv-srow">
          {renaming ? (
            <input
              ref={nameRef}
              className="cv-sname-input"
              defaultValue={node.name || ''}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={commitRename}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') { e.currentTarget.blur(); }
                if (e.key === 'Escape') { cancelRename.current = true; e.currentTarget.blur(); }
              }}
            />
          ) : (
            <span className="cv-sname" title="Double-click to rename">{node.name || 'Audio'}</span>
          )}
          <span className="cv-stime">{timeLabel}</span>
        </div>
        <div
          className="cv-sbar"
          onPointerDown={onScrubDown}
          onPointerMove={onScrubMove}
          onPointerUp={onScrubUp}
          onPointerCancel={onScrubUp}
        >
          <div className="cv-strack"><div className="cv-sfill" ref={fillRef} /></div>
        </div>
      </div>
    </div>
  );
}

export default memo(SoundNode);
