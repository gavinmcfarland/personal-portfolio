import { useCanvas } from '../CanvasProvider';
import { useTheme } from '../../contexts/ThemeContext';

const EDIT_ICON = <><path d="M4 20h4L18 10l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></>;
const VIEW_ICON = <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>;

export default function TopBar() {
  const { brand, readOnly, EDITABLE, eng } = useCanvas();
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';

  return (
    <div className="ui panel" id="topbar">
      <span className="brand">{brand.title}<small>{brand.subtitle}</small></span>

      {EDITABLE && (
        <button
          className={`chip${!readOnly ? ' on' : ''}`}
          title={readOnly ? 'Read-only — click to edit' : 'Editing — click for read-only'}
          onClick={() => eng.setMode(!readOnly)}
        >
          <svg viewBox="0 0 24 24">{readOnly ? VIEW_ICON : EDIT_ICON}</svg>
          <span>{readOnly ? 'Viewing' : 'Editing'}</span>
        </button>
      )}

      <button className="chip" title="Frame all content" onClick={() => eng.fitAll()}>
        <svg viewBox="0 0 24 24"><path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" /></svg>
        Fit
      </button>

      <button className="chip" title="Toggle light / dark" onClick={toggleTheme}>
        <svg viewBox="0 0 24 24">
          {dark
            ? <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            : <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />}
        </svg>
        {dark ? 'Light' : 'Dark'}
      </button>

      {EDITABLE && (
        <button
          className="chip"
          title="Clear notes & drawings, restore layout"
          onClick={() => { if (confirm('Clear all notes & drawings and restore the original layout?')) eng.resetBoard(); }}
        >
          <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4" /></svg>
          Reset
        </button>
      )}
    </div>
  );
}
