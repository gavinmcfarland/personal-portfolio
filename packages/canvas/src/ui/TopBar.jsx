import { Pencil, Sun, Moon, Monitor } from "lucide-react";
import { useCanvas } from "../CanvasProvider";
import { cx } from "../constants";
import PageTabs from "./PageTabs";
import BgColorMenu from "./BgColorMenu";

const EDIT_ICON = <Pencil />;

const SUN_ICON = <Sun />;
const MOON_ICON = <Moon />;
const SYSTEM_ICON = <Monitor />;

const THEME = {
  system: { icon: SYSTEM_ICON, label: "System" },
  light: { icon: SUN_ICON, label: "Light" },
  dark: { icon: MOON_ICON, label: "Dark" },
};

export default function TopBar() {
  const { brand, readOnly, EDITABLE, eng, theme, pages, nodes, classNames } = useCanvas();
  const mode = theme?.mode;
  const toggleTheme = theme?.toggle;
  const th = THEME[mode] || THEME.system;

  // Nothing renders for a plain read-only single-page board (no edit chip, no
  // theme toggle, and PageTabs bails for one page with no sections) — so don't
  // paint an empty panel (the stray little square). Mirror the child visibility
  // conditions. A single page is always the active one, so its sections live in
  // `nodes`.
  const hasSections = nodes.some((n) => n.type === "frame" || n.anchor);
  const hasContent = EDITABLE || !!theme || pages.length > 1 || hasSections;
  if (!hasContent) return null;

  return (
    <div className={cx("cv-ui cv-panel", classNames?.topbar)} data-cv-part="topbar">
      <PageTabs />
      {EDITABLE && !readOnly && <BgColorMenu />}
      {theme && (
        <button
          className="cv-chip"
          title="Cycle theme: system / light / dark"
          onClick={toggleTheme}
        >
          {th.icon}
          {th.label}
        </button>
      )}
      {EDITABLE && (
        <button
          className="cv-chip"
          data-on={!readOnly ? '' : undefined}
          title={readOnly ? "Edit this board" : "Editing — click to stop"}
          onClick={() => eng.setMode(!readOnly)}
        >
          {EDIT_ICON}
          <span>Edit</span>
        </button>
      )}
    </div>
  );
}
