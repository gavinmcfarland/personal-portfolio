import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

/* Dark is the default canvas; the `light` class flips the tokens. */
const applyTheme = (resolved) => {
  const root = document.documentElement;
  const body = document.body;
  if (resolved === 'light') {
    root.classList.add('light');
    body.classList.add('light');
  } else {
    root.classList.remove('light');
    body.classList.remove('light');
  }
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme-mode') || 'dark';
    }
    return 'dark';
  });

  const resolved = mode === 'system' ? getSystemTheme() : mode;

  // Apply theme and persist whenever mode changes
  useEffect(() => {
    applyTheme(mode === 'system' ? getSystemTheme() : mode);
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  // Listen for OS theme changes when in system mode
  useEffect(() => {
    if (mode !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(getSystemTheme());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: resolved, mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
