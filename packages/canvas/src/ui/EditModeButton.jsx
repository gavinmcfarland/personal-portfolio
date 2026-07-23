import { useRef, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Pencil } from "lucide-react";
import { useCanvas } from "../CanvasProvider";
import {
  getGlobalReadOnly,
  setGlobalReadOnly,
  subscribeMode,
  allocOwnerId,
  joinOwners,
  subscribeOwner,
  primaryOwner,
} from "../edit-mode";

const EDIT_ICON = <Pencil />;

/* The button paints into <body>, outside `.canvas-root`, so it can't read the
   `--cv-accent` token the board is skinned with. Mirror the board's `accent`
   prop onto the button as inline vars instead (light + dark, since `.dark` on
   <body> picks which). Falls through to the CSS purple default when unset. */
function accentVars(accent) {
  if (!accent) return undefined;
  if (typeof accent === "string") {
    return { "--cv-fab-accent": accent, "--cv-fab-accent-dark": accent };
  }
  const vars = {};
  if (accent.light) vars["--cv-fab-accent"] = accent.light;
  if (accent.dark) vars["--cv-fab-accent-dark"] = accent.dark;
  return vars;
}

/* The single, page-wide Edit toggle. Every editable canvas renders one of these,
   but only the earliest-mounted instance actually paints (the owner election in
   edit-mode.js) — so there is exactly one button no matter how many boards are
   on the page. It portals to <body> and is `position: fixed`, so it sits at the
   bottom-left of the viewport rather than inside any one board's TopBar, and
   isn't clipped by a board's stacking/overflow context.

   It drives the shared global mode directly (no canvas engine needed): every
   CanvasProvider listens for that change and flips together. */
export default function EditModeButton() {
  const { accent } = useCanvas();

  // Stable id for this instance, claimed once. Registering happens in the effect
  // below so an unmount cleanly hands ownership to the next board.
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = allocOwnerId();
  const id = idRef.current;

  useEffect(() => joinOwners(id), [id]);

  const isPrimary = useSyncExternalStore(
    subscribeOwner,
    () => primaryOwner() === id,
    () => false, // server: nothing to paint
  );
  const readOnly = useSyncExternalStore(
    subscribeMode,
    getGlobalReadOnly,
    () => true, // server: default to view mode
  );

  if (!isPrimary || typeof document === "undefined") return null;

  return createPortal(
    // A frosted `cv-panel`-style container holding one control, mirroring the
    // in-canvas groups (zoom/topbar). The accent vars live on the container so
    // the inner button inherits them for its "currently editing" state.
    <div className="cv-edit-fab" data-cv-part="edit" style={accentVars(accent)}>
      <button
        type="button"
        data-on={!readOnly ? "" : undefined}
        title={readOnly ? "Edit boards" : "Editing — click to stop"}
        aria-pressed={!readOnly}
        onClick={() => setGlobalReadOnly(!readOnly)}
      >
        {EDIT_ICON}
        <span>{readOnly ? "Edit" : "Done"}</span>
      </button>
    </div>,
    document.body,
  );
}
