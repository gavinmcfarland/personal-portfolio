import { createPortal } from "react-dom";
import { Pencil } from "lucide-react";
import { useCanvas } from "../CanvasProvider";
import { cx } from "../constants";
import { ToolsPanel } from "./Toolbar";

const EDIT_ICON = <Pencil />;

/* The Edit toggle paints into <body>, outside `.canvas-root`, so it can't read
   the `--cv-accent` token the board is skinned with. Mirror the board's `accent`
   prop onto the toggle as inline vars instead (light + dark, since `.dark` on
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

/* The single, page-wide bottom-left dock: the Edit/Done toggle and — while
   editing — the tools bar to its right. Only the elected primary editable canvas
   paints it (see `isPrimaryCanvas` in CanvasProvider), so there is exactly one
   dock however many boards are on the page.

   It portals to <body> and is `position: fixed`, so it sits at the bottom-left
   of the viewport and isn't re-anchored by the page's transformed panels. React
   context still flows through the portal, so the tools drive THIS (primary)
   board through useCanvas()/eng. The tools are wrapped in a nested `.canvas-root`
   (carrying the same root classNames, e.g. the enamel skin) so they inherit the
   full canvas skin + tokens and match the in-canvas zoom controls; `accentId`
   reuses the board's already-injected accent <style> for the active-tool tint. */
export default function BottomDock({ accentId }) {
  const { isPrimaryCanvas, readOnly, eng, accent, classNames } = useCanvas();

  if (!isPrimaryCanvas || typeof document === "undefined") return null;

  return createPortal(
    <div className="cv-dock">
      <div className="cv-edit-fab" style={accentVars(accent)}>
        <button
          type="button"
          data-on={!readOnly ? "" : undefined}
          title={readOnly ? "Edit boards" : "Editing — click to stop"}
          aria-pressed={!readOnly}
          onClick={() => eng.setMode(!readOnly)}
        >
          {EDIT_ICON}
          <span>{readOnly ? "Edit" : "Done"}</span>
        </button>
      </div>
      {!readOnly && (
        <div
          className={cx("canvas-root cv-dock-canvas", classNames?.root)}
          data-cv-accent={accent ? accentId : undefined}
        >
          <ToolsPanel />
        </div>
      )}
    </div>,
    document.body,
  );
}
