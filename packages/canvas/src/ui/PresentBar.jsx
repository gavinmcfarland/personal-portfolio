import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Smartphone, X } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { sectionNodes, sectionLabel } from '../constants';

/* The only chrome left on screen while presenting: where we are, a way back and
   forward, the pairing code for the phone, and the way out.

   It hides itself. Three seconds after the last pointer move the bar fades, so
   the board is alone on the screen for the audience; any movement brings it
   back. A control that stays visible for the whole talk is a control the room
   spends the whole talk looking at. */

const IDLE_MS = 3000;

/* The pairing panel. The QR encoder is imported only when the panel opens —
   it's a chunk nobody who isn't pairing a phone should have to download, and
   pairing happens once, before anyone is watching. */
function RemotePanel({ room, relay, onClose }) {
  const [state, setState] = useState({ status: 'loading' });
  const canvasRef = useRef(null);

  useEffect(() => {
    let live = true;
    Promise.all([relay.link(room), import('qrcode')])
      .then(([link, QR]) => {
        if (!live) return;
        setState({ status: 'ready', url: link.url });
        // The canvas mounts in the same commit as this state, so paint on the
        // next frame rather than racing the ref.
        requestAnimationFrame(() => {
          if (live && canvasRef.current) {
            QR.default.toCanvas(canvasRef.current, link.url, { width: 200, margin: 1 }).catch(() => {});
          }
        });
      })
      .catch((e) => { if (live) setState({ status: 'error', error: String(e.message || e) }); });
    return () => { live = false; };
  }, [room, relay]);

  return (
    <div className="cv-present-remote cv-panel">
      <div className="cv-present-remote-head">
        <span>Remote</span>
        <button className="cv-present-btn" onClick={onClose} aria-label="Close">
          <X />
        </button>
      </div>
      {state.status === 'loading' && <p className="cv-present-remote-hint">Finding this machine on the network…</p>}
      {state.status === 'error' && (
        // Almost always "no network address": the dev server is bound to
        // localhost only, so there is nothing for a phone to connect to.
        <p className="cv-present-remote-hint">Couldn't build a remote link — {state.error}</p>
      )}
      {state.status === 'ready' && (
        <>
          <canvas ref={canvasRef} className="cv-present-qr" width="200" height="200" />
          <code className="cv-present-remote-url">{state.url}</code>
          <p className="cv-present-remote-hint">Same Wi-Fi, then scan. Room {room}.</p>
        </>
      )}
    </div>
  );
}

export default function PresentBar() {
  const { eng, nodes, focusedSectionId, presentRoom, presentRelay } = useCanvas();
  const [idle, setIdle] = useState(false);
  const [remote, setRemote] = useState(false);

  const secs = sectionNodes(nodes);
  const i = secs.findIndex((n) => n.id === focusedSectionId);
  const here = i >= 0 ? secs[i] : null;

  /* Fade out when the presenter stops moving the mouse — but never while the
     pairing panel is open, which is read off the screen at a standstill. */
  useEffect(() => {
    if (remote) { setIdle(false); return undefined; }
    let t = setTimeout(() => setIdle(true), IDLE_MS);
    const wake = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), IDLE_MS);
    };
    window.addEventListener('pointermove', wake);
    window.addEventListener('keydown', wake);
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('keydown', wake);
    };
  }, [remote]);

  return (
    <div className="cv-present" data-idle={idle ? '' : undefined} data-cv-part="present">
      {remote && presentRelay && (
        <RemotePanel room={presentRoom} relay={presentRelay} onClose={() => setRemote(false)} />
      )}
      <div className="cv-present-bar cv-panel">
        <button className="cv-present-btn" onClick={() => eng.applyPresentCmd('prev')} aria-label="Previous section">
          <ChevronLeft />
        </button>
        <span className="cv-present-pos">
          {i >= 0 ? i + 1 : '–'}<span className="cv-present-of">/{secs.length}</span>
        </span>
        <span className="cv-present-label">{here ? sectionLabel(here) : 'No section'}</span>
        <button className="cv-present-btn" onClick={() => eng.applyPresentCmd('next')} aria-label="Next section">
          <ChevronRight />
        </button>
        {/* Without a relay there is nothing for a phone to connect to, so the
            button would be a promise the build can't keep. */}
        {presentRelay && (
          <button
            className="cv-present-btn"
            data-active={remote ? '' : undefined}
            onClick={() => setRemote((v) => !v)}
            aria-label="Phone remote"
            title="Phone remote"
          >
            <Smartphone />
          </button>
        )}
        <button className="cv-present-btn cv-present-exit" onClick={() => eng.stopPresenting()} title="Exit presenting (Esc)">
          Done
        </button>
      </div>
    </div>
  );
}
