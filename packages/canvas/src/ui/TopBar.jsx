import { Sun, Moon, Monitor } from "lucide-react";
import { useCanvas } from "../CanvasProvider";
import { cx } from "../constants";
import PageTabs from "./PageTabs";
import BgColorMenu from "./BgColorMenu";

const SUN_ICON = <Sun />;
const MOON_ICON = <Moon />;
const SYSTEM_ICON = <Monitor />;

const THEME = {
  system: { icon: SYSTEM_ICON, label: "System" },
  light: { icon: SUN_ICON, label: "Light" },
  dark: { icon: MOON_ICON, label: "Dark" },
};

export default function TopBar() {
  const { brand, readOnly, EDITABLE, theme, pages, nodes, classNames } = useCanvas();
  const mode = theme?.mode;
  const toggleTheme = theme?.toggle;
  const th = THEME[mode] || THEME.system;

  // Nothing renders for a plain single-page board with no theme toggle and no
  // section tabs (PageTabs bails for one page with no sections), and the only
  // editable-only child — the background-colour menu — shows just while editing.
  // Mirror those child visibility conditions so we don't paint an empty panel
  // (the stray little square). A single page is always the active one, so its
  // sections live in `nodes`.
  const hasSections = nodes.some((n) => n.type === "frame" || n.anchor);
  const hasContent =
    (EDITABLE && !readOnly) || !!theme || pages.length > 1 || hasSections;
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
      {/* The Edit toggle is no longer here: it's a single page-wide fixed button
          (see EditModeButton), shared by every canvas on the page. */}
    </div>
  );
}
