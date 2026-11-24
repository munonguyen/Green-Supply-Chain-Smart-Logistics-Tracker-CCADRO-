import React, { createContext, useContext, useState, useEffect } from 'react';
import { triggerCircularThemeReveal } from '../shared/effects/motionTokens';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('ccadro_theme') || 'dark';
      }
    } catch (_) {
      // ignore storage errors
    }
    return 'dark';
  });

  useEffect(() => {
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('ccadro_theme', theme);
      }
    } catch (_) {
      // ignore storage errors
    }
  }, [theme]);

  const toggleTheme = (event) => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const applyDom = () => {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', nextTheme);
      }
      setTheme(nextTheme);
    };
    triggerCircularThemeReveal(event, applyDom);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return { theme: 'dark', toggleTheme: () => {}, isDark: true };
  }
  return context;
}

export default ThemeContext;
