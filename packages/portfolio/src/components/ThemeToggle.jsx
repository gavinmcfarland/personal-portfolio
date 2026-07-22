import { useTheme } from '../contexts/ThemeContext';

/* The button's look, kept constant across placements. Positioning (which corner,
   which stacking context) is passed in via `className` so the same toggle can be
   scoped to a page or to the sliding overlay panel — see App.jsx. */
const BASE =
  'flex h-9 w-9 items-center justify-center rounded-full border border-line bg-transparent text-muted transition-colors duration-200 hover:text-ink';

/* Minimal single-button theme cycle — system → light → dark. */
const ThemeToggle = ({ className = 'fixed right-4 top-4 z-50 sm:right-6 sm:top-6' }) => {
  const { mode, toggleTheme } = useTheme();

  const icon = {
    system: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    ),
    light: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    ),
    dark: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    ),
  };

  return (
    <button
      onClick={toggleTheme}
      className={`${BASE} ${className}`}
      aria-label={`Theme: ${mode}. Click to change.`}
      title={`Theme: ${mode}`}
    >
      <svg className="h-[17px] w-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icon[mode]}
      </svg>
    </button>
  );
};

export default ThemeToggle;
