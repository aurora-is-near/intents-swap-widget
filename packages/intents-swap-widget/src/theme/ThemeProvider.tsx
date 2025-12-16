import { isBrowser } from 'browser-or-node';
import { createContext, type ReactNode, useEffect, useMemo } from 'react';

import { ColorPalette, ColorScheme, HexColor, Theme } from '../types/theme';
import { ColorStop, createColorPalette } from './createColorPalette';
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
  colorStop: ColorStop,
  parentEl: Element | null,
  baseColor: HexColor,
  colorScheme: ColorScheme,
) => {
  const palette = createColorPalette(baseColor, colorScheme, colorStop);

  if (!palette) {
    return;
  }

  setColorVariables(palette, colorKey, parentEl);
};

const loadTheme = (parentEl: Element | null, theme: Theme) => {
  const { primaryColor, surfaceColor, colorScheme = 'dark' } = theme;

  if (primaryColor) {
    setColorPalette('accent', 500, parentEl, primaryColor, colorScheme);
  }

  if (surfaceColor) {
    setColorPalette('gray', 950, parentEl, surfaceColor, colorScheme);
  }
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
