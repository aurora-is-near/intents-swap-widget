import { useEffect, useState } from 'react';
import { isBrowser } from 'browser-or-node';

type ThemeMode = 'light' | 'dark' | 'auto';

const applyThemeDataAttr = (theme: ThemeMode) => {
  if (isBrowser) {
    document.body?.setAttribute('data-sw-theme', theme);
  }
};

export const useToggleTheme = (
  defaultTheme?: ThemeMode,
  onChange?: (colorPalette: 'light' | 'dark') => void,
) => {
  const [colorPalette, setColorPalette] = useState<'light' | 'dark'>();
  const [theme, setTheme] = useState<ThemeMode | undefined>(() => {
    if (isBrowser && defaultTheme === undefined) {
      return (localStorage.getItem('theme') as ThemeMode) || 'dark';
    }

    return defaultTheme;
  });

  useEffect(() => {
    if (isBrowser) {
      if (theme === undefined) {
        setTheme((localStorage.getItem('theme') as ThemeMode) || 'dark');
      } else if (theme === 'auto') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const updateTheme = () => {
          const palette = mediaQuery.matches ? 'dark' : 'light';

          applyThemeDataAttr(palette);
          setColorPalette(palette);
          onChange?.(palette);
        };

        updateTheme();
        mediaQuery.addEventListener('change', updateTheme);
        localStorage.setItem('theme', 'auto');

        return () => mediaQuery.removeEventListener('change', updateTheme);
      } else {
        localStorage.setItem('theme', theme);
        applyThemeDataAttr(theme);
        setColorPalette(theme);
        onChange?.(theme);
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    if (!theme || theme === 'dark') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('auto');
    } else {
      setTheme('dark');
    }
  };

  return {
    theme,
    colorPalette,
    toggleTheme,
  };
};
