import { useEffect, useState } from 'react';
import { isBrowser } from 'browser-or-node';

type ThemeMode = 'light' | 'dark' | 'auto';

const applyThemeDataAttr = (theme: ThemeMode) => {
  if (isBrowser) {
    document.documentElement
      .querySelector('body')
      ?.setAttribute('data-sw-theme', theme);
  }
};

export const useToggleTheme = (defaultTheme?: ThemeMode) => {
  const [theme, setTheme] = useState<ThemeMode | undefined>(defaultTheme);

  useEffect(() => {
    if (isBrowser) {
      if (theme === undefined) {
        setTheme((localStorage.getItem('theme') as ThemeMode) || 'dark');
      } else if (theme === 'auto') {
        if (
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches
        ) {
          localStorage.setItem('theme', 'auto');
          applyThemeDataAttr('dark');
        } else {
          localStorage.setItem('theme', 'auto');
          applyThemeDataAttr('light');
        }
      } else {
        localStorage.setItem('theme', theme);
        applyThemeDataAttr(theme);
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    if (
      !localStorage.getItem('theme') ||
      localStorage.getItem('theme') === 'dark'
    ) {
      setTheme('light');
    } else if (localStorage.getItem('theme') === 'light') {
      setTheme('auto');
    } else {
      setTheme('dark');
    }
  };

  return {
    theme,
    toggleTheme,
  };
};
