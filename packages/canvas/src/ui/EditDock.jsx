import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useEditMode, useEditSurface } from "../edit-surface";
import EditToggle from "./EditToggle";

/* The page-wide Edit button, for a page (or part of one) that isn't a canvas.

   A canvas paints its own dock (BottomDock), with its tools beside the button.
   This is the same button without a board behind it: it joins the same
   election, so whichever surface — canvas or not — was mounted or touched last
   paints the one button, and pressing it flips the shared mode for every
   surface on the page at once.

     <EditDock rootRef={articleRef} label="this page" />

   `enabled={false}` opts out entirely (no button, no `E` shortcut), which is
   how a host keeps it out of production. */
export default function EditDock({ enabled = true, rootRef, accent, label = "page" }) {
  const [readOnly, setReadOnly] = useEditMode();
  const isPrimary = useEditSurface({ enabled, rootRef });

  /* The global `E` shortcut, bound only by the primary surface so it fires
     once (a primary canvas binds its own). Ignored while typing. */
  useEffect(() => {
    if (!isPrimary) return undefined;
    const onKey = (e) => {
      if (e.key.toLowerCase() !== "e" || e.metaKey || e.ctrlKey || e.altKey) return;
      const ae = document.activeElement;
      if (ae && (ae.isContentEditable || ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;
      e.preventDefault();
      setReadOnly(!readOnly);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPrimary, readOnly, setReadOnly]);

  if (!isPrimary || typeof document === "undefined") return null;

  return createPortal(
    <div className="cv-dock">
      <EditToggle
        readOnly={readOnly}
        onToggle={() => setReadOnly(!readOnly)}
        accent={accent}
        label={label}
      />
    </div>,
    document.body,
  );
}
