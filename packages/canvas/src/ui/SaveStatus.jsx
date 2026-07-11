import { Upload, Check, TriangleAlert } from "lucide-react";
import { useCanvas } from "../CanvasProvider";

const PUBLISH_ICON = <Upload />;
const CHECK_ICON = <Check />;
const WARN_ICON = <TriangleAlert />;

/* Passive background-save status, pinned to the bottom-right of the canvas.
   The board auto-saves through the host's onPublish adapter as the user edits,
   so this is an indicator, not a button — an icon only, no label. Opt out via
   the `saveStatus={false}` prop. */
const PUBLISH = {
  idle: null, // nothing to show when there's no save in flight
  saving: { icon: PUBLISH_ICON, title: "Saving changes…" },
  done: { icon: CHECK_ICON, title: "All changes saved" },
  error: { icon: WARN_ICON, title: "Save failed — see console" },
};

export default function SaveStatus() {
  const { canPublish, publishState, saveStatus } = useCanvas();
  if (!saveStatus || !canPublish) return null;
  const pub = PUBLISH[publishState];
  if (!pub) return null;
  return (
    <span className="ui save-status" title={pub.title} aria-live="polite">
      {pub.icon}
    </span>
  );
}
