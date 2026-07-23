/* Page-wide audio playback, decoupled from any canvas.

   A single <audio> element lives here at the module level — never inside a React
   tree — so a sound keeps playing when the node/canvas that started it unmounts
   or the user navigates away from it. Only one sound plays at a time: starting
   another loads it into the same element (which is also what keeps the single
   "now playing" bar unambiguous).

   Sound nodes drive this instead of owning their own element, and the fixed
   NowPlayingBar reflects/controls it. Because both watch the same element's
   events, they stay in sync with no extra plumbing. The element's `src` is the
   already-resolved playable URL the node passes in (object URL / data / http);
   the canvas's render object URLs are never revoked, so it stays valid for the
   document's lifetime even after the source board is gone. */

let el = null;              // the single persistent HTMLAudioElement (created lazily)
let active = null;          // { key, name } currently loaded, or null when nothing is
let playing = false;
let loadSeq = 0;            // guards async load→play against rapid sound switches

const listeners = new Set();
let snapshot = { key: null, name: null, playing: false };
const refresh = () => { snapshot = { key: active ? active.key : null, name: active ? active.name : null, playing }; };
const emit = () => { refresh(); listeners.forEach((fn) => fn()); };

function ensureEl() {
  if (el) return el;
  el = new Audio();
  el.addEventListener('play', () => { playing = true; emit(); });
  el.addEventListener('pause', () => { playing = false; emit(); });
  el.addEventListener('ended', () => { active = null; playing = false; emit(); });
  return el;
}

/* Start (or resume) a sound. `key` is a stable identity (the node's raw src) so a
   node/bar can tell whether it's the one loaded. `url` is the resolved playable
   src. Deferring play() until metadata also lets us resolve the Infinity-duration
   quirk of MediaRecorder WebMs (over-seek once, snap back) before playback, so
   the progress bar has a real duration. */
export function play({ key, url, name }) {
  const a = ensureEl();
  if (active && active.key === key) { if (a.paused) a.play().catch(() => {}); return; }
  active = { key, name: name || 'Audio' };
  emit();
  const seq = (loadSeq += 1);
  a.src = url;
  a.load();
  const start = () => { if (seq === loadSeq) a.play().catch(() => {}); };
  const onMeta = () => {
    a.removeEventListener('loadedmetadata', onMeta);
    if (seq !== loadSeq) return; // a newer sound superseded this load
    if (a.duration === Infinity) {
      const done = () => { a.removeEventListener('seeked', done); a.currentTime = 0; start(); };
      a.addEventListener('seeked', done);
      a.currentTime = 1e7;
    } else { a.currentTime = 0; start(); }
  };
  a.addEventListener('loadedmetadata', onMeta);
}

export function pause() { if (el) el.pause(); }
export function toggle() { if (el) { if (el.paused) el.play().catch(() => {}); else el.pause(); } }

/* Fully stop and clear (e.g. dismiss). */
export function stop() { if (el) el.pause(); active = null; playing = false; emit(); }

export function seekFraction(f) {
  if (el && isFinite(el.duration) && el.duration > 0) el.currentTime = Math.max(0, Math.min(1, f)) * el.duration;
}

export function element() { return el; }
export function subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); }
export function getSnapshot() { return snapshot; }

/* ── Bar-host election ───────────────────────────────────────────────
   Every canvas mounts a NowPlayingBar, but only the earliest still-mounted one
   paints — so there's a single bar however many boards are on the page. Unlike
   the edit dock this is NOT gated on `editable`: sounds play in view/published
   boards too. In this app Home's canvas is always mounted (project pages overlay
   it), so the elected host is stable across navigation. */
let hosts = [];
let hostSeq = 0;
const hostListeners = new Set();
const notifyHosts = () => hostListeners.forEach((fn) => fn());

export function allocHostId() { return ++hostSeq; }
export function joinHosts(id) {
  hosts = [...hosts, id].sort((a, b) => a - b);
  notifyHosts();
  return () => { hosts = hosts.filter((x) => x !== id); notifyHosts(); };
}
export function subscribeHost(cb) { hostListeners.add(cb); return () => hostListeners.delete(cb); }
export function primaryHost() { return hosts[0]; }
