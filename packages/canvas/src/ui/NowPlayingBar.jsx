import { useRef, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Play, Pause } from "lucide-react";
import {
  toggle,
  element,
  subscribe,
  getSnapshot,
  allocHostId,
  joinHosts,
  subscribeHost,
  primaryHost,
} from "../playback-store";

const PLAY_ICON = <Play />;
const PAUSE_ICON = <Pause />;

/* The single, page-wide "now playing" bar. Every canvas renders one, but only the
   elected host paints (see the host election in playback-store) — so there's one
   bar however many boards are mounted, and it isn't gated on `editable` since
   sounds play in view/published boards too.

   It portals to <body> and is `position: fixed` at the bottom-right of the
   viewport. It reflects the module-level audio element (which outlives any board),
   so it keeps showing — and controlling — a sound after the canvas that started
   it has unmounted. Ultra-minimal: a play/pause toggle and a thin progress line;
   the fill is written directly from an rAF loop so playback never re-renders. */
export default function NowPlayingBar() {
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = allocHostId();
  const id = idRef.current;
  useEffect(() => joinHosts(id), [id]);

  const isHost = useSyncExternalStore(subscribeHost, () => primaryHost() === id, () => false);
  const { key, playing } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const fillRef = useRef(null);
  const shown = isHost && !!key;

  // Drive the progress fill outside React while a bar is shown. The track is
  // vertical, filling from the top down, so we write `height`.
  useEffect(() => {
    if (!shown) return undefined;
    let raf = 0;
    const tick = () => {
      const a = element(), fill = fillRef.current;
      if (a && fill) {
        const f = isFinite(a.duration) && a.duration > 0 ? a.currentTime / a.duration : 0;
        fill.style.height = f * 100 + "%";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shown]);

  // While a sound is loaded, Space toggles play/pause and swallows the browser's
  // default (scrolling the page down) — the usual media-player convention, and it
  // stops the "space jumps the page" annoyance. Left alone when focus is in a
  // field or on another control, which handle their own Space.
  useEffect(() => {
    if (!shown) return undefined;
    const onKey = (e) => {
      if (e.code !== "Space" || e.metaKey || e.ctrlKey || e.altKey) return;
      const ae = document.activeElement;
      const tag = ae && ae.tagName;
      if (ae && (ae.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A")) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown]);

  if (!shown || typeof document === "undefined") return null;

  return createPortal(
    <div className="cv-nowplaying" data-cv-part="nowplaying">
      <div className="cv-np-track">
        <div className="cv-np-fill" ref={fillRef} />
      </div>
      <button
        type="button"
        className="cv-np-btn"
        title={playing ? "Pause" : "Play"}
        aria-label={playing ? "Pause" : "Play"}
        onClick={toggle}
      >
        {playing ? PAUSE_ICON : PLAY_ICON}
      </button>
    </div>,
    document.body,
  );
}
