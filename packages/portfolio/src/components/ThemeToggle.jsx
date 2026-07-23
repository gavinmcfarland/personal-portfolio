import { useTheme } from '../contexts/ThemeContext';

/* Styled to read as the same UI family as the canvas zoom control: a flat, square
   enamel panel (surface fill, hairline edge) wrapping a single icon button that
   fills with grey on hover. Positioning (which corner, which stacking context) is
   passed in via `className` so the same toggle can be scoped to a page or to the
   sliding overlay panel — see App.jsx. */
const PANEL = 'flex items-center justify-center border border-line bg-surface p-1';
const BUTTON =
  'flex h-7 w-7 items-center justify-center rounded-[8px] bg-transparent text-muted transition-colors duration-150 hover:bg-hover hover:text-ink';

/* Minimal single-button theme cycle — system → light → dark. */
const ThemeToggle = ({ className = 'fixed right-[22px] top-[22px] z-50' }) => {
  const { mode, toggleTheme } = useTheme();

  const icon = {
    system: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    ),
    light: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    ),
    dark: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    ),
  };

  return (
    <div className={`${PANEL} ${className}`}>
      <button
        onClick={toggleTheme}
        className={BUTTON}
        aria-label={`Theme: ${mode}. Click to change.`}
        title={`Theme: ${mode}`}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icon[mode]}
        </svg>
      </button>
    </div>
  );
};

export default ThemeToggle;
