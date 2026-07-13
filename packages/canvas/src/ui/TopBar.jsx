import { Pencil, Sun, Moon, Monitor } from "lucide-react";
import { useCanvas } from "../CanvasProvider";
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
  const { brand, readOnly, EDITABLE, eng, theme, pages } = useCanvas();
  const mode = theme?.mode;
  const toggleTheme = theme?.toggle;
  const th = THEME[mode] || THEME.system;

  // Nothing renders for a plain read-only single-page board (no edit chip, no
  // theme toggle, and PageTabs bails for one page) — so don't paint an empty
  // panel (the stray little square). Mirror the child visibility conditions.
  const hasContent = EDITABLE || !!theme || pages.length > 1;
  if (!hasContent) return null;

  return (
    <div className="ui panel" id="topbar">
      <PageTabs />
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
    </div>
  );
}
