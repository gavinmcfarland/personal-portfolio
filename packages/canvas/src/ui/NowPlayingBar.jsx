import { useRef, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Play, Pause } from "lucide-react";
import {
  toggle,
  stop,
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

// How long Space must be held before it stops + closes the player (vs. a tap,
// which just toggles play/pause).
const HOLD_MS = 550;

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
  const holdRef = useRef(null); // pending hold timer while Space is held
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

  // Space controls the loaded sound and swallows the browser default (scrolling
  // the page down). A quick TAP toggles play/pause; HOLDING it down stops the
  // audio and closes the player. Left alone when focus is in a field or on another
  // control, which handle their own Space.
  useEffect(() => {
    if (!shown) return undefined;
    const guarded = () => {
      const ae = document.activeElement;
      if (!ae) return false;
      const tag = ae.tagName;
      if (ae.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      // A focused button/link normally consumes Space. Let it through only for the
      // audio controls themselves — the sound node's play button and the bar's own
      // button — so hold-to-close works right after pressing play, without having
      // to click away first. Other controls keep their native Space.
      if ((tag === "BUTTON" || tag === "A") && !ae.closest(".cv-splay, .cv-np-btn")) return true;
      return false;
    };
    const onDown = (e) => {
      if (e.code !== "Space" || e.metaKey || e.ctrlKey || e.altKey || guarded()) return;
      e.preventDefault(); // suppress the page scroll for the whole press
      if (e.repeat || holdRef.current != null) return; // ignore key auto-repeat
      holdRef.current = setTimeout(() => {
        holdRef.current = null;
        // Drop focus before closing: the user is still holding Space, and once the
        // bar unmounts our listeners are gone — so a still-focused audio button
        // (e.g. the sound node's play button) would otherwise be re-activated on
        // release and reopen the player.
        const ae = document.activeElement;
        if (ae && ae.blur) ae.blur();
        stop();
      }, HOLD_MS);
    };
    const onUp = (e) => {
      if (e.code !== "Space" || holdRef.current == null) return;
      clearTimeout(holdRef.current); // released before the hold fired → a tap
      holdRef.current = null;
      toggle();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      if (holdRef.current != null) { clearTimeout(holdRef.current); holdRef.current = null; }
    };
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
