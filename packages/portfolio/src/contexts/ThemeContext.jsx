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

const applyTheme = (resolved) => {
  const root = document.documentElement;
  const body = document.body;
  if (resolved === 'dark') {
    root.classList.add('dark');
    body.classList.add('dark');
  } else {
    root.classList.remove('dark');
    body.classList.remove('dark');
  }
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    if (typeof window !== 'undefined') {
      // Clean up old localStorage key from previous implementation
      localStorage.removeItem('theme');
      return localStorage.getItem('theme-mode') || 'system';
    }
    return 'system';
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
    setMode(prev => {
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
