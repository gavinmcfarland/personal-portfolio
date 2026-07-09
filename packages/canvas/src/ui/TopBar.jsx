import { Pencil, Upload, Check, TriangleAlert, Sun, Moon, Monitor } from "lucide-react";
import { useCanvas } from "../CanvasProvider";
import PageTabs from "./PageTabs";

const EDIT_ICON = <Pencil />;
const PUBLISH_ICON = <Upload />;
const CHECK_ICON = <Check />;
const WARN_ICON = <TriangleAlert />;

const SUN_ICON = <Sun />;
const MOON_ICON = <Moon />;
const SYSTEM_ICON = <Monitor />;

const PUBLISH = {
  idle: {
    icon: PUBLISH_ICON,
    label: "Publish",
    title: "Bake the current board into canvasState.json",
  },
  saving: {
    icon: PUBLISH_ICON,
    label: "Publishing…",
    title: "Writing canvasState.json…",
  },
  done: {
    icon: CHECK_ICON,
    label: "Published",
    title: "Saved — commit & deploy to go live",
  },
  error: {
    icon: WARN_ICON,
    label: "Failed",
    title: "Publish failed — see console",
  },
};

const THEME = {
  system: { icon: SYSTEM_ICON, label: "System" },
  light: { icon: SUN_ICON, label: "Light" },
  dark: { icon: MOON_ICON, label: "Dark" },
};

export default function TopBar() {
  const { brand, readOnly, EDITABLE, canPublish, publishState, eng, theme } = useCanvas();
  const mode = theme?.mode;
  const toggleTheme = theme?.toggle;
  const pub = PUBLISH[publishState] || PUBLISH.idle;
  const th = THEME[mode] || THEME.system;

  return (
    <div className="ui panel" id="topbar">
      <PageTabs />
      {EDITABLE && import.meta.env.DEV && (
        <button
          className={`chip${!readOnly ? " on" : ""}`}
          title={readOnly ? "Edit this board" : "Editing — click to stop"}
          onClick={() => eng.setMode(!readOnly)}
        >
          {EDIT_ICON}
          <span>Edit</span>
        </button>
      )}
      {theme && (
        <button
          className="chip"
          title="Cycle theme: system / light / dark"
          onClick={toggleTheme}
        >
          {th.icon}
          {th.label}
        </button>
      )}
      {canPublish && (
        <button
          className={`chip${publishState === "done" ? " on" : ""}`}
          title={pub.title}
          disabled={publishState === "saving"}
          onClick={() => eng.publish()}
        >
          {pub.icon}
          {pub.label}
        </button>
      )}
    </div>
  );
}
