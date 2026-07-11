import { Pencil, Upload, Check, TriangleAlert, Sun, Moon, Monitor } from "lucide-react";
import { useCanvas } from "../CanvasProvider";
import PageTabs from "./PageTabs";
import BgColorMenu from "./BgColorMenu";

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
    label: "Save",
    title: "Save this board through the host's onPublish adapter",
  },
  saving: {
    icon: PUBLISH_ICON,
    label: "Saving…",
    title: "Saving…",
  },
  done: {
    icon: CHECK_ICON,
    label: "Saved",
    title: "Saved",
  },
  error: {
    icon: WARN_ICON,
    label: "Failed",
    title: "Save failed — see console",
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
      {EDITABLE && (
        <button
          className={`chip${!readOnly ? " on" : ""}`}
          title={readOnly ? "Edit this board" : "Editing — click to stop"}
          onClick={() => eng.setMode(!readOnly)}
        >
          {EDIT_ICON}
          <span>Edit</span>
        </button>
      )}
      {EDITABLE && !readOnly && <BgColorMenu />}
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
