import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { EditDock } from "@gavinmcfarland/canvas";
import { useEditMode } from "@gavinmcfarland/canvas/edit-surface";
import homeSource from "../content/home.md?raw";
import { ACCENT } from "../theme";
import { composeRegions, parseRegion, parseRegions } from "../lib/homeContent";
import { SaveStatus } from "./BlockEditor";
import { useBlockEditor } from "../hooks/useBlockEditor";

/* The in-page editor for the home page's prose — dev only. Home loads this
   module behind `import.meta.env.DEV`, so none of it is in a build.
 *
 * The same editing as a post's body (src/hooks/useBlockEditor.jsx has the keys), over each
 * region of src/content/home.md. The regions are one document: one history
 * (⌘/Ctrl+Z outside a field), one save back to the file through /__home/save
 * (vite-plugin-home-content.js) shortly after each change. The one Edit button
 * switches this and the staging canvas together.
 *
 * Two exports, mounted in different places so that loading this module never
 * remounts the page around them: <EditableRegion> is what each <HomeProse>
 * renders once it is here, and <HomeEditorChrome> (the Edit button, the save
 * state, undo) sits beside <main>. They share the document through the store
 * below rather than a provider, which would have to wrap the page. */

/* ── The document ── */
const file = parseRegions(homeSource);
let regions = file.regions;
const listeners = new Set();
const history = { past: [], future: [] };
/* Each mounted region's field-closing function, for undo to call. */
const closers = new Set();

const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const getRegions = () => regions;

function setRegion(name, text) {
  if (regions[name] === text) return;
  history.past.push(regions);
  history.future = [];
  regions = { ...regions, [name]: text };
  emit();
}

function step(redo) {
  const from = redo ? history.future : history.past;
  const to = redo ? history.past : history.future;
  if (!from.length) return false;
  to.push(regions);
  closers.forEach((close) => close());
  regions = from.pop();
  emit();
  return true;
}

const useRegions = () => useSyncExternalStore(subscribe, getRegions);

/* ── The Edit button, the save state, undo ── */
export function HomeEditorChrome({ rootRef }) {
  const [readOnly] = useEditMode();
  const current = useRegions();

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === "TEXTAREA" || ae.tagName === "INPUT" || ae.isContentEditable)) return;
      // The canvas has its own undo; leave its keys alone.
      if (ae?.closest?.(".canvas-root")) return;
      if (step(e.shiftKey)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── Saving ── */
  const baseRef = useRef(homeSource);
  const saved = useRef(current);
  const dirty = useRef(false);
  const chain = useRef(Promise.resolve());
  const [status, setStatus] = useState("idle"); // saving | saved | error | conflict

  const doSave = async (force = false) => {
    if (!dirty.current && !force) return;
    dirty.current = false;
    const snapshot = regions;
    setStatus("saving");
    try {
      const res = await fetch("/__home/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ base: baseRef.current, raw: composeRegions({ ...file, regions: snapshot }), force }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) {
        dirty.current = true;
        setStatus("conflict");
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      baseRef.current = json.raw;
      saved.current = snapshot;
      if (!dirty.current) setStatus("saved");
    } catch (err) {
      console.error("[home] save failed:", err);
      dirty.current = true;
      setStatus("error");
    }
  };
  const save = (force) => {
    chain.current = chain.current.then(() => doSave(force));
  };

  useEffect(() => {
    if (current === saved.current) return undefined;
    dirty.current = true;
    const t = setTimeout(() => save(), 600);
    return () => clearTimeout(t);
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => save(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <EditDock rootRef={rootRef} accent={ACCENT} label="this page" />
      {!readOnly &&
        status !== "idle" &&
        createPortal(
          <p className="home-save-status post-meta">
            <SaveStatus status={status} onRetry={() => save()} onOverwrite={() => save(true)} />
          </p>,
          document.body,
        )}
    </>
  );
}

/* ── One region's body, editable ──
   Rendered by <HomeProse> inside its `display: contents` wrapper, so the
   blocks stay siblings of the heading above them. */
// Loaded by a dynamic import, never hot-swapped in place, so fast refresh has nothing to keep.
// eslint-disable-next-line react-refresh/only-export-components
export const renderRegion = (name) => <EditableRegion name={name} />;

function EditableRegion({ name }) {
  const [readOnly] = useEditMode();
  const editing = !readOnly;
  const current = useRegions();
  const { parsed, active, close, openInsert, onBodyClick, blocks } = useBlockEditor({
    body: current[name] ?? "",
    setBody: (text) => setRegion(name, text),
    editing,
    parse: useCallback((text) => parseRegion(name, text), [name]),
    revealScope: `[data-home-region="${name}"]`,
    placeholder: "Write here",
  });

  useEffect(() => {
    closers.add(close);
    return () => closers.delete(close);
  });

  return (
    <div className={`contents${editing ? " writing-editing" : ""}`} onClick={editing ? onBodyClick : undefined}>
      {blocks}
      {/* A region with nothing in it has no block to click — offer one. */}
      {editing && !active && parsed.blocks.length === 0 && (
        <p className="indent">
          <button type="button" className="wb-add post-meta" onClick={() => openInsert(-1)}>
            + add a paragraph
          </button>
        </p>
      )}
    </div>
  );
}
