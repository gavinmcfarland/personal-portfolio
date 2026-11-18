import { createPortal } from "react-dom";
import { useCanvas } from "../CanvasProvider";
import { cx } from "../constants";
import { ToolsPanel } from "./Toolbar";
import EditToggle from "./EditToggle";

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
      <EditToggle readOnly={readOnly} onToggle={() => eng.setMode(!readOnly)} accent={accent} />
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
