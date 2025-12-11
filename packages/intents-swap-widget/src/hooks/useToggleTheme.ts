import { useEffect, useState } from 'react';
import { isBrowser } from 'browser-or-node';

import { useConfig } from '@/config';

type ThemeMode = 'light' | 'dark' | 'auto';

const applyThemeDataAttr = (theme: ThemeMode, parentEl: Element | null) => {
  if (isBrowser) {
    (parentEl ?? document.body).setAttribute('data-sw-theme', theme);
  }
};

export const useToggleTheme = (
  defaultTheme?: ThemeMode,
  onChange?: (colorPalette: 'light' | 'dark') => void,
) => {
  const { themeParentElementSelector } = useConfig();
  const [colorPalette, setColorPalette] = useState<'light' | 'dark'>();
  const [theme, setTheme] = useState<ThemeMode | undefined>(() => {
    if (isBrowser && defaultTheme === undefined) {
      return (localStorage.getItem('theme') as ThemeMode) || 'dark';
    }

    return defaultTheme;
  });

  useEffect(() => {
    if (isBrowser) {
      const themeParentElement = themeParentElementSelector
        ? document.querySelector(themeParentElementSelector)
        : null;

      if (theme === undefined) {
        setTheme((localStorage.getItem('theme') as ThemeMode) || 'dark');
      } else if (theme === 'auto') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const updateTheme = () => {
          const palette = mediaQuery.matches ? 'dark' : 'light';

          applyThemeDataAttr(palette, themeParentElement);
          setColorPalette(palette);
          onChange?.(palette);
        };

        updateTheme();
        mediaQuery.addEventListener('change', updateTheme);
        localStorage.setItem('theme', 'auto');

        return () => mediaQuery.removeEventListener('change', updateTheme);
      } else {
        localStorage.setItem('theme', theme);
        applyThemeDataAttr(theme, themeParentElement);
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
