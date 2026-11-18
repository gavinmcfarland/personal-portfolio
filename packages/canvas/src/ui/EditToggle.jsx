import { Pencil } from "lucide-react";

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

/* The Edit/Done button on its own. Shared by the canvas's BottomDock and the
   standalone <EditDock>, so the two can never look different. */
export default function EditToggle({ readOnly, onToggle, accent, label = "boards" }) {
  return (
    <div className="cv-edit-fab" style={accentVars(accent)}>
      <button
        type="button"
        data-on={!readOnly ? "" : undefined}
        title={readOnly ? `Edit ${label} (E)` : "Editing — click to stop (E)"}
        aria-pressed={!readOnly}
        onClick={onToggle}
      >
        {EDIT_ICON}
        <span>{readOnly ? "Edit" : "Done"}</span>
      </button>
    </div>
  );
}
