import { useTheme } from "../contexts/ThemeContext";

const items = [
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const Navigation = () => {
  const { mode, toggleTheme } = useTheme();

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav className="tile fade flex items-center gap-1 bg-surface/80 px-2 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl rounded-full">
        {/* Monogram */}
        <a
          href="#top"
          aria-label="Home"
          className="mr-1 flex h-9 items-center gap-2.5 rounded-full pl-1.5 pr-[0px]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-display text-[13px] font-bold text-[color:var(--accent-ink)]">
            G
          </span>
        </a>

        <div className="hidden items-center gap-0.5 sm:flex">
          {items.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-full px-3.5 py-2 font-mono text-[12px] uppercase tracking-[0.08em] text-muted transition-colors duration-300 hover:bg-surface-2 hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </div>

        <button
          onClick={toggleTheme}
          className="ml-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink transition-colors duration-300 hover:bg-surface-2"
          aria-label={`Theme: ${mode}. Click to change.`}
          title={`Theme: ${mode}`}
        >
          {mode === "system" ? (
            <svg
              className="h-[17px] w-[17px]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          ) : mode === "light" ? (
            <svg
              className="h-[17px] w-[17px]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg
              className="h-[17px] w-[17px]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>
      </nav>
    </header>
  );
};

export default Navigation;
