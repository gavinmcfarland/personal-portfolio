/* Shared edit/view mode + the single global Edit button.

   Edit mode is ONE global state for the whole page, not per board: toggling it
   flips every canvas at once. The mode lives under a single localStorage key,
   and a custom event keeps same-document canvases in sync (the native `storage`
   event only fires cross-tab). This module owns that read/write/subscribe
   contract so the provider and the standalone button share one source of truth.

   It also runs a tiny "who paints the button" election: every editable canvas
   registers on mount, but only the earliest still-mounted registrant renders the
   fixed Edit button — so there is exactly one button however many boards exist. */

const GLOBAL_MODE_KEY = 'canvas-global-mode';
const MODE_EVENT = 'canvas:mode';

/* ── Global edit/view mode ──────────────────────────────────────── */
export function getGlobalReadOnly() {
  try { return localStorage.getItem(GLOBAL_MODE_KEY) === 'view'; } catch { return false; }
}

export function setGlobalReadOnly(ro) {
  try { localStorage.setItem(GLOBAL_MODE_KEY, ro ? 'view' : 'edit'); } catch { /* storage unavailable */ }
  try { window.dispatchEvent(new CustomEvent(MODE_EVENT, { detail: ro })); } catch { /* no window */ }
}

/* Fires the callback whenever the mode changes — from another canvas in this
   document (custom event) or another tab (storage event). The callback re-reads
   the value with getGlobalReadOnly(); localStorage is already written by the
   time either event fires. Returns an unsubscribe fn. */
export function subscribeMode(cb) {
  const onMode = () => cb();
  const onStorage = (e) => { if (e.key === GLOBAL_MODE_KEY) cb(); };
  window.addEventListener(MODE_EVENT, onMode);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(MODE_EVENT, onMode);
    window.removeEventListener('storage', onStorage);
  };
}

/* ── Primary-canvas election ─────────────────────────────────────────
   `owners` holds the ids of every mounted editable canvas; exactly one is the
   "primary" that paints the shared dock and receives its tool actions. The
   primary is the ACTIVE canvas — the one the user last mounted or interacted
   with — so on a page where a project board opens over the (still-mounted) home
   board, the dock follows the board actually on screen. When the active canvas
   unmounts, ownership falls back to the most recently added survivor. */
let owners = [];
let ownerSeq = 0;
let activeId = null;
const ownerListeners = new Set();
const notifyOwners = () => ownerListeners.forEach((fn) => fn());

/* Called once per canvas (during render) to claim a stable id. */
export function allocOwnerId() { return ++ownerSeq; }

/* Called from an effect: joins the election, returns the leave() cleanup. */
export function joinOwners(id) {
  owners = [...owners, id].sort((a, b) => a - b);
  notifyOwners();
  return () => {
    owners = owners.filter((x) => x !== id);
    notifyOwners();
  };
}

/* Mark a canvas as the active one (on mount, and on pointer interaction). */
export function setActiveCanvas(id) {
  if (activeId === id) return;
  activeId = id;
  notifyOwners();
}

export function subscribeOwner(cb) {
  ownerListeners.add(cb);
  return () => ownerListeners.delete(cb);
}

/* The active canvas if it's still mounted, else the most recently added one. */
export function primaryOwner() {
  if (activeId != null && owners.includes(activeId)) return activeId;
  return owners.length ? owners[owners.length - 1] : undefined;
}
