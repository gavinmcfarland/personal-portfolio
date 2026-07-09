import { useCanvas } from "../CanvasProvider";
import PageTabs from "./PageTabs";

const EDIT_ICON = (
  <>
    <path d="M4 20h4L18 10l-4-4L4 16v4z" />
    <path d="M13.5 6.5l4 4" />
  </>
);
const PUBLISH_ICON = (
  <>
    <path d="M12 19V6" />
    <path d="M6 12l6-6 6 6" />
    <path d="M5 21h14" />
  </>
);
const CHECK_ICON = <path d="M5 13l4 4L19 7" />;
const WARN_ICON = (
  <>
    <path d="M12 9v4m0 4h.01" />
    <path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </>
);

const SUN_ICON = (
  <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
);
const MOON_ICON = <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />;
const SYSTEM_ICON = (
  <>
    <rect x="3" y="4" width="18" height="12" rx="1" />
    <path d="M8 20h8M12 16v4" />
  </>
);

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
          <svg viewBox="0 0 24 24">{EDIT_ICON}</svg>
          <span>Edit</span>
        </button>
      )}
      {theme && (
        <button
          className="chip"
          title="Cycle theme: system / light / dark"
          onClick={toggleTheme}
        >
          <svg viewBox="0 0 24 24">{th.icon}</svg>
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
          <svg viewBox="0 0 24 24">{pub.icon}</svg>
          {pub.label}
        </button>
      )}
    </div>
  );
}
