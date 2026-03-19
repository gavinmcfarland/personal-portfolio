import { useTheme } from '../contexts/ThemeContext';
import { useState, useEffect } from 'react';

const Navigation = () => {
  const { mode, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled
        ? 'bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl'
        : ''
    }`}>
      <div className="w-full max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
        <a href="#" className="text-black dark:text-white group" aria-label="Home">
          <svg className="w-8 h-8 transition-transform duration-300 group-hover:scale-105" viewBox="0 0 32 32" fill="currentColor">
            <path d="M8 8h8v8H8zM16 16h8v8h-8z" />
            <path d="M8 16h8v8H8z" opacity="0.2" />
            <path d="M16 8h8v8h-8z" opacity="0.5" />
          </svg>
        </a>

        <div className="flex items-center gap-8">
          <nav className="hidden md:flex items-center gap-8">
            {['Work', 'About', 'Contact'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="relative text-sm font-medium text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors duration-300"
              >
                {item}
              </a>
            ))}
          </nav>

          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors duration-300"
            aria-label="Toggle theme"
          >
            {mode === 'system' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            ) : mode === 'light' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
