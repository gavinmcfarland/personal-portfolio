/* React bindings for the page-wide edit mode in ./edit-mode, for things that
   are NOT a canvas but should still switch with the one Edit button — a host
   page's editable text, say.

   Plain JS, no JSX and no engine imports, so a host can reach it through the
   `./edit-surface` subpath without pulling the canvas into its chunk (the same
   reasoning as `./code`). The button itself is <EditDock>, from the main entry.

     useEditMode()          → [readOnly, setReadOnly], shared with every canvas
     useEditSurface(opts)   → joins the "who paints the dock" election, returns
                              whether this surface is the one that paints it */
import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
  getGlobalReadOnly,
  setGlobalReadOnly,
  subscribeMode,
  allocOwnerId,
  joinOwners,
  setActiveCanvas,
  subscribeOwner,
  primaryOwner,
} from './edit-mode';

/* The global mode, as React state. Flipping it here flips every mounted canvas
   too: they subscribe to the same event (see CanvasProvider). */
export function useEditMode() {
  const readOnly = useSyncExternalStore(subscribeMode, getGlobalReadOnly, () => true);
  return [readOnly, setGlobalReadOnly];
}

/* Register as an edit surface: a thing on the page that the Edit button
   switches. Surfaces and editable canvases share one election, so exactly one
   of them paints the dock — the one mounted or interacted with last. Pass the
   surface's root element as `rootRef` so a pointerdown inside it claims the
   dock back from a canvas. */
export function useEditSurface({ enabled = true, rootRef } = {}) {
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = allocOwnerId();
  const id = idRef.current;

  useEffect(() => {
    if (!enabled) return undefined;
    const leave = joinOwners(id);
    setActiveCanvas(id);
    return leave;
  }, [enabled, id]);

  useEffect(() => {
    const el = rootRef?.current;
    if (!enabled || !el) return undefined;
    const onDown = () => setActiveCanvas(id);
    el.addEventListener('pointerdown', onDown, true);
    return () => el.removeEventListener('pointerdown', onDown, true);
  }, [enabled, id, rootRef]);

  return useSyncExternalStore(
    subscribeOwner,
    () => enabled && primaryOwner() === id,
    () => false,
  );
}
