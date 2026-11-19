import { useLayoutEffect, useRef } from "react";

/* The pieces of the in-page editors (src/hooks/useBlockEditor.jsx, and the
   post and home editors that use it) that are components. Dev only. */

/* A textarea that grows with its text, set in whatever register its parent
   (or `className`) gives it. */
export function Field({ value, onChange, caret, singleLine, mono, className = "", ...rest }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  // A block field opens focused, with the caret where the action put it.
  useLayoutEffect(() => {
    if (caret === undefined) return;
    const el = ref.current;
    const at = caret === "end" ? el.value.length : Math.min(caret, el.value.length);
    el.focus({ preventScroll: true });
    el.setSelectionRange(at, at);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { onKeyDown, ...others } = rest;
  const keyDown = singleLine
    ? (e) => {
        if (e.key === "Enter" || e.key === "Escape") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }
    : onKeyDown;

  return (
    <textarea
      {...others}
      ref={ref}
      rows={1}
      spellCheck
      className={`writing-edit-field${mono ? " writing-edit-field--mono" : ""} ${className}`}
      value={value}
      onChange={(e) => onChange(singleLine ? e.target.value.replace(/\n/g, " ") : e.target.value)}
      onKeyDown={keyDown}
    />
  );
}

/* A word or two of save state — inline, so it never adds a line. */
export function SaveStatus({ status, onRetry, onOverwrite }) {
  if (status === "idle") return null;
  if (status === "saving") return <span aria-live="polite">saving…</span>;
  if (status === "saved") return <span aria-live="polite">saved</span>;
  if (status === "error")
    return (
      <span aria-live="polite">
        <span className="text-accent">save failed</span> —{" "}
        <button type="button" className="wb-link" onClick={onRetry}>
          retry
        </button>
      </span>
    );
  return (
    <span aria-live="polite">
      <span className="text-accent">changed on disk</span> —{" "}
      <button type="button" className="wb-link" onClick={() => window.location.reload()}>
        reload
      </button>{" "}
      or{" "}
      <button type="button" className="wb-link" onClick={onOverwrite}>
        overwrite
      </button>
    </span>
  );
}
