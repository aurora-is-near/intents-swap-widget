import { createContext, type ReactNode, useEffect, useMemo } from 'react';

import { ColorPalette, ColorScheme, HexColor, Theme } from '../types/theme';
import { ColorStop, createColorPalette } from './createColorPalette';
import { useConfig } from '@/config';

const setColorVariable = (
  key: string,
  value: string,
  parentEl: Element | null,
) => {
  let parentElement = document.body;

  if (parentEl instanceof HTMLElement) {
    parentElement = parentEl;
  }

  parentElement.style.setProperty(`--c-sw-${key}`, value);
};

const setColorVariables = (
  palette: ColorPalette,
  colorKey: string,
  parentEl: Element | null,
) => {
  Object.entries(palette).forEach(([key, value]) => {
    setColorVariable(`${colorKey}-${key}`, value, parentEl);
  });
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
  const {
    primaryColor,
    surfaceColor,
    successColor,
    warningColor,
    errorColor,
    colorScheme = 'dark',
  } = theme;

  if (primaryColor) {
    setColorPalette('accent', 500, parentEl, primaryColor, colorScheme);
  }

  if (surfaceColor) {
    setColorPalette('gray', 950, parentEl, surfaceColor, colorScheme);
  }

  if (successColor) {
    setColorVariable('status-success', successColor, parentEl);
  }

  if (warningColor) {
    setColorVariable('status-warning', warningColor, parentEl);
  }

  if (errorColor) {
    setColorVariable('status-error', errorColor, parentEl);
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
    if (theme) {
      const themeParentElement = themeParentElementSelector
        ? document.querySelector(themeParentElementSelector)
        : null;

      loadTheme(themeParentElement, theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={value}>
      <div className="sw">{children}</div>
    </ThemeContext.Provider>
  );
};
