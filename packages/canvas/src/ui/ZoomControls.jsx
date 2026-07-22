import { useEffect, useState } from 'react';
import { Expand, Maximize, Minus, Plus, Shrink } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { cx } from '../constants';

/* Which element is currently in browser fullscreen (with the -webkit- fallback
   for older Safari). */
const fullscreenEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;

export default function ZoomControls() {
  const { eng, zoomLabelRef, rootRef, classNames, fullscreenButton, fullBleed, setFullBleed } = useCanvas();
  // The button can drive two expand behaviours: 'native' uses the browser
  // Fullscreen API (covers the whole screen, escapes the page), 'document'
  // toggles a full-bleed overlay that covers the document's viewport but stays
  // inside the page. `true` keeps the original native behaviour.
  const mode = fullscreenButton === 'document' ? 'document' : 'native';

  /* In native mode the browser owns the expanded state (tracked via
     fullscreenchange); in document mode it lives in the provider (`fullBleed`),
     which portals the board to <body> and applies the CSS. */
  const [nativeFull, setNativeFull] = useState(false);
  const isFull = mode === 'document' ? fullBleed : nativeFull;

  useEffect(() => {
    if (!fullscreenButton || mode !== 'native') return;
    const sync = () => setNativeFull(fullscreenEl() === rootRef.current);
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    sync();
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, [fullscreenButton, mode, rootRef]);

  /* Document mode: Esc exits the full-bleed overlay. */
  useEffect(() => {
    if (!fullscreenButton || mode !== 'document' || !fullBleed) return;
    const onKey = (e) => { if (e.key === 'Escape') setFullBleed(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreenButton, mode, fullBleed, setFullBleed]);

  const toggleFullscreen = () => {
    if (mode === 'document') { setFullBleed(!fullBleed); return; }
    const el = rootRef.current;
    if (!el) return;
    if (fullscreenEl()) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    } else {
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    }
  };

  return (
    <div className={cx('cv-ui cv-panel', classNames?.zoom)} data-cv-part="zoom">
      {fullscreenButton && (
        <>
          <button
            data-cv-part="zoom-fullscreen"
            title={isFull ? 'Exit fullscreen' : 'Open fullscreen'}
            aria-label={isFull ? 'Exit fullscreen' : 'Open fullscreen'}
            onClick={toggleFullscreen}
          >
            {isFull ? <Shrink /> : <Expand />}
          </button>
          <span className="cv-zoom-sep" />
        </>
      )}
      <button data-cv-part="zoom-fit" title="Frame all content" onClick={() => eng.fitAll()}>
        <Maximize />
      </button>
      <span className="cv-zoom-sep" />
      <button data-cv-part="zoom-out" title="Zoom out" onClick={() => eng.zoomCenter(1 / 1.25)}>
        <Minus />
      </button>
      <span className="cv-zoomval" title="Reset to 100%" ref={zoomLabelRef} onClick={() => eng.zoomTo(1)}>100%</span>
      <button data-cv-part="zoom-in" title="Zoom in" onClick={() => eng.zoomCenter(1.25)}>
        <Plus />
      </button>
    </div>
  );
}
