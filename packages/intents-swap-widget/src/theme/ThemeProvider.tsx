import { isBrowser } from 'browser-or-node';
import { createContext, type ReactNode, useEffect, useMemo } from 'react';

import { ColorPalette, ColorScheme, HexColor, Theme } from '../types/theme';
import { createColorPalette } from './createColorPalette';
import { useConfig } from '@/config';

const setColorVariables = (
  palette: ColorPalette,
  colorKey: string,
  parentEl: Element | null,
) => {
  if (isBrowser) {
    let parentElement = document.body;

    if (parentEl instanceof HTMLElement) {
      parentElement = parentEl;
    }

    Object.entries(palette).forEach(([key, value]) => {
      parentElement.style.setProperty(`--c-sw-${colorKey}-${key}`, value);
    });
  }
};

const setColorPalette = (
  colorKey: string,
  parentEl: Element | null,
  baseColor?: HexColor,
  colorScheme?: ColorScheme,
) => {
  const palette = baseColor
    ? createColorPalette(baseColor, colorScheme ?? 'dark')
    : null;

  if (!palette) {
    return;
  }

  setColorVariables(palette, colorKey, parentEl);
};

const loadTheme = (parentEl: Element | null, theme: Theme) => {
  const { primaryColor, surfaceColor, colorScheme } = theme;

  setColorPalette('accent', parentEl, primaryColor, colorScheme);
  setColorPalette('gray', parentEl, surfaceColor, colorScheme);
};

export const ThemeContext = createContext<Theme | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
  theme?: Theme;
};

export const ThemeProvider = ({ children, theme }: ThemeProviderProps) => {
  const { themeParentElementSelector } = useConfig();
  const value = useMemo((): Theme | undefined => theme, [theme]);

  useEffect(() => {
    if (theme && isBrowser) {
      const themeParentElement = themeParentElementSelector
        ? document.querySelector(themeParentElementSelector)
        : null;

      loadTheme(themeParentElement, theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
