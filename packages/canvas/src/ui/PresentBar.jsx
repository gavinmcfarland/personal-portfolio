import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Copy, Files, Smartphone, X } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';

/* The only chrome left on screen while presenting: where we are, a way back and
   forward, the pairing code for the phone, and the way out.

   It hides itself. Three seconds after the last pointer move the bar fades, so
   the board is alone on the screen for the audience; any movement brings it
   back. A control that stays visible for the whole talk is a control the room
   spends the whole talk looking at. */

const IDLE_MS = 3000;
const COPIED_MS = 1600;

/* The remote link is served over plain http on a LAN address, so the panel can
   be looking at itself from a context the async Clipboard API refuses to run
   in. Fall back to the old selection trick there rather than leaving the
   button dead. */
function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.cssText = 'position:fixed;top:0;left:-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    el.remove();
    ok ? resolve() : reject(new Error('copy refused'));
  });
}

/* The whole line is the button: the URL is small type, and a presenter reaching
   for it mid-setup shouldn't have to hit an icon. */
function CopyUrl({ url }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      className="cv-present-remote-url"
      data-copied={copied ? '' : undefined}
      onClick={() => copyText(url).then(() => setCopied(true)).catch(() => {})}
      title="Copy link"
      aria-label={copied ? 'Link copied' : 'Copy link'}
    >
      <code>{url}</code>
      {copied ? <Check /> : <Copy />}
    </button>
  );
}

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
          <CopyUrl url={state.url} />
          <p className="cv-present-remote-hint">Same Wi-Fi, then scan. Room {room}.</p>
        </>
      )}
    </div>
  );
}

export default function PresentBar() {
  // `nodes` isn't read directly — it's what re-renders this when the board
  // moves, so eng.deck() below is recomputed rather than stale.
  const { eng, nodes, activePageId, pages, focusedSectionId, presentRoom, presentRelay } = useCanvas();
  const [idle, setIdle] = useState(false);
  const [remote, setRemote] = useState(false);
  const [pageMenu, setPageMenu] = useState(false);

  /* This page's slice of the deck. Stepping stops at a page's ends, so a
     board-wide "5 of 8" would count a run the chevrons can't walk — and the
     phone, which counts the same way, would read a different number beside the
     same section. Crossing a page stays the page switcher's job. */
  const list = eng.deck().filter((s) => s.pageId === activePageId);
  const i = list.findIndex((s) => s.id === focusedSectionId);
  const here = i >= 0 ? list[i] : null;
  const multiPage = pages.length > 1;

  /* Fade out when the presenter stops moving the mouse — but never while a
     panel is open, which is read off the screen at a standstill. */
  const held = remote || pageMenu;
  useEffect(() => {
    if (held) { setIdle(false); return undefined; }
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
  }, [held]);

  return (
    <div className="cv-present" data-idle={idle ? '' : undefined} data-cv-part="present">
      {remote && presentRelay && (
        <RemotePanel room={presentRoom} relay={presentRelay} onClose={() => setRemote(false)} />
      )}
      {/* Page switcher — the only way across a page boundary while presenting,
          now that stepping stays on the page it starts on. The top bar's page
          menu is gone while presenting, and mid-talk is no time to go looking
          for it. */}
      {pageMenu && multiPage && (
        <div className="cv-present-pages cv-panel">
          {pages.map((p) => (
            <button
              key={p.id}
              className="cv-present-page"
              data-active={p.id === activePageId ? '' : undefined}
              onClick={() => { eng.applyPresentCmd('page', p.id); setPageMenu(false); }}
            >
              {p.name || 'Untitled page'}
            </button>
          ))}
        </div>
      )}
      <div className="cv-present-bar cv-panel">
        <button className="cv-present-btn" onClick={() => eng.applyPresentCmd('prev')} aria-label="Previous section">
          <ChevronLeft />
        </button>
        <span className="cv-present-pos">
          {i >= 0 ? i + 1 : '–'}<span className="cv-present-of">/{list.length}</span>
        </span>
        <span className="cv-present-label">{here ? here.label : 'No section'}</span>
        <button className="cv-present-btn" onClick={() => eng.applyPresentCmd('next')} aria-label="Next section">
          <ChevronRight />
        </button>
        {multiPage && (
          <button
            className="cv-present-btn"
            data-active={pageMenu ? '' : undefined}
            onClick={() => setPageMenu((v) => !v)}
            aria-label="Change page"
            title={`Page: ${(pages.find((p) => p.id === activePageId) || {}).name || '—'}`}
          >
            <Files />
          </button>
        )}
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
