import { memo, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Play, Pause } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { useRegister, useMediaSrc } from './common';
import { play, pause, toggle, seekFraction, element, subscribe, getSnapshot } from '../playback-store';

/* Dropped / pasted / recorded audio object. A fixed-size player card: a
   play/pause button, the clip name, and a scrub bar with an elapsed / total
   time readout. Controls stop pointer propagation so using them never drags the
   node (edit) or pans the board (read-only) — so viewers can play a clip on a
   published board without moving it.

   Playback itself is NOT owned here: it runs on a single page-wide <audio>
   element in playback-store, so a clip keeps playing when this node/canvas
   unmounts or the user navigates away. This card is a view/controller of that
   element while its own clip is the one loaded (`isActive`); otherwise it just
   shows the idle state. */
function fmt(t) {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function SoundNode({ node }) {
  const { eng, editingId } = useCanvas();
  const { setRef, dataProps, style } = useRegister(node);
  const fillRef = useRef(null);
  const nameRef = useRef(null);
  const scrub = useRef(null); // {wasPlaying} while dragging the bar
  const cancelRename = useRef(false); // Esc sets this so the blur commit is skipped
  const [dur, setDur] = useState(node.dur || 0);
  const [cur, setCur] = useState(0);
  // Double-click routes through the engine's editingId (pointer capture on the
  // node steals the node's own dblclick — see Canvas.onDoubleClick).
  const renaming = editingId === node.id;
  const src = useMediaSrc(node.src);
  const s = { ...style, width: (node.w || 260) + 'px', height: (node.h || 56) + 'px' };

  // This card is "active" when the shared element is loaded with its clip. The
  // raw `node.src` is the stable identity the store keys on.
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const isActive = !!node.src && snap.key === node.src;
  const playing = isActive && snap.playing;

  /* Progress fill is driven outside React (rAF + direct style write) so playback
     never causes re-renders and the bar moves at frame rate — but only while this
     card is the one playing; otherwise it rests at zero. */
  useEffect(() => {
    const fill = fillRef.current;
    if (!isActive) { if (fill) fill.style.width = '0%'; return undefined; }
    let raf = 0;
    const tick = () => {
      const a = element(), f = fillRef.current;
      if (a && f) {
        const frac = isFinite(a.duration) && a.duration > 0 ? a.currentTime / a.duration : 0;
        f.style.width = frac * 100 + '%';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive]);

  /* The numeric time label only needs to tick a few times a second. When active,
     read the live element (its duration also resolves the WebM Infinity quirk);
     otherwise show the stored duration at a standstill. */
  useEffect(() => {
    if (!isActive) { setCur(0); setDur(node.dur || 0); return undefined; }
    const id = setInterval(() => {
      const a = element();
      if (a) { setCur(a.currentTime); if (isFinite(a.duration) && a.duration > 0) setDur(a.duration); }
    }, 250);
    return () => clearInterval(id);
  }, [isActive, node.dur]);

  const onToggle = () => {
    if (isActive) toggle();
    else if (src) play({ key: node.src, url: src, name: node.name || 'Audio' });
  };
  /* Scrubbing seeks the shared element; it pauses while dragging and resumes
     after, like every player. Only meaningful while this card is the active one. */
  const seekAt = (clientX, barEl) => {
    const r = barEl.getBoundingClientRect();
    seekFraction((clientX - r.left) / r.width);
    const a = element(); if (a) setCur(a.currentTime);
  };
  const onScrubDown = (e) => {
    e.stopPropagation();
    if (!isActive) return;
    scrub.current = { wasPlaying: playing };
    pause();
    e.currentTarget.setPointerCapture(e.pointerId);
    seekAt(e.clientX, e.currentTarget);
  };
  const onScrubMove = (e) => { if (scrub.current) seekAt(e.clientX, e.currentTarget); };
  const onScrubUp = () => {
    if (!scrub.current) return;
    if (scrub.current.wasPlaying) toggle();
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
      <button
        className="cv-splay"
        title={playing ? 'Pause' : 'Play'}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
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
