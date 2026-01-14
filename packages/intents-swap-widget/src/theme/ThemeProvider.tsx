import { createContext, type ReactNode, useEffect, useMemo } from 'react';

import {
  ColorPalette,
  ColorScheme,
  HexColor,
  Theme,
  ThemeBorderRadius,
} from '../types/theme';
import { ColorStop, createColorPalette } from './createColorPalette';
import { useConfig } from '@/config';

const setVariable = (key: string, value: string, parentEl: Element | null) => {
  let parentElement = document.body;

  if (parentEl instanceof HTMLElement) {
    parentElement = parentEl;
  }

  parentElement.style.setProperty(key, value);
};

const setColorVariable = (
  key: string,
  value: string,
  parentEl: Element | null,
) => {
  setVariable(`--c-sw-${key}`, value, parentEl);
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

const setBorderRadiusVariables = (
  borderRadius: ThemeBorderRadius,
  parentEl: Element | null,
) => {
  const values: Record<
    'none' | 'sm' | 'md' | 'lg',
    { sm: number; md: number; lg: number }
  > = {
    none: { sm: 0, md: 0, lg: 0 },
    sm: { sm: 4, md: 6, lg: 10 },
    md: { sm: 6, md: 10, lg: 16 },
    lg: { sm: 8, md: 24, lg: 24 },
  };

  setVariable('--r-sw-sm', `${values[borderRadius].sm}px`, parentEl);
  setVariable('--r-sw-md', `${values[borderRadius].md}px`, parentEl);
  setVariable('--r-sw-lg', `${values[borderRadius].lg}px`, parentEl);
};

const loadTheme = (parentEl: Element | null, theme: Theme) => {
  const {
    primaryColor,
    surfaceColor,
    containerColor,
    successColor,
    warningColor,
    errorColor,
    colorScheme = 'dark',
    borderRadius = 'md',
    stylePreset = 'clean',
  } = theme;

  if (primaryColor) {
    setColorPalette('accent', 500, parentEl, primaryColor, colorScheme);

    if (stylePreset === 'bold') {
      setColorPalette('gray', 50, parentEl, primaryColor, colorScheme);
    }
  }

  if (surfaceColor && stylePreset === 'clean') {
    setColorPalette('gray', 950, parentEl, surfaceColor, colorScheme);
  }

  if (containerColor) {
    setColorVariable('container', containerColor, parentEl);
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

  if (borderRadius) {
    setBorderRadiusVariables(borderRadius, parentEl);
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
