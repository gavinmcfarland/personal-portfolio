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

/* Light (paper) is the base canvas; the `dark` class flips the tokens. */
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
      return localStorage.getItem('theme-mode') || 'system';
    }
    return 'system';
  });

  /* The OS setting is state, not something read during render. It used to be
     read inline — `mode === 'system' ? getSystemTheme() : mode` — with the
     media-query listener calling applyTheme() directly. That kept the CLASS
     in step with the OS but never told React, so `resolved` was only ever
     recomputed when `mode` changed. Everything styled by CSS followed the
     system; everything that reads the theme THROUGH React did not, and went
     on using the palette from before the switch.

     The dithered textures are the visible casualty — they are painted, not
     styled, and take their inks from `theme` — so a Mac switching to light at
     dawn left a bone-on-graphite avatar sitting on a paper-white page until
     the next reload. Holding it in state means one source of truth for both. */
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  const resolved = mode === 'system' ? systemTheme : mode;

  // Track the OS setting whatever the mode is: cheap, and it means switching
  // back to `system` already knows the answer rather than reading it late.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    // The OS may have changed between the first render and this effect.
    setSystemTheme(getSystemTheme());
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Apply the resolved theme — so an OS switch moves the class too — and
  // persist the mode, which is the only part that is a preference.
  useEffect(() => {
    applyTheme(resolved);
    localStorage.setItem('theme-mode', mode);
  }, [resolved, mode]);

  // Cycle: system → light → dark → system
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
