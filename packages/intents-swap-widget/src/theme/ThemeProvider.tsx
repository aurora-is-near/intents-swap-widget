import { createContext, type ReactNode, useEffect, useMemo } from 'react';
import { ColorPalette, ColorScheme, HexColor, Theme } from '../types/theme';
import { createColorPalette } from './createColorPalette';

const setColorVariables = (palette: ColorPalette, colorKey: string) => {
  Object.entries(palette).forEach(([key, value]) => {
    [...document.getElementsByClassName('sw')].forEach((el) => {
      (el as HTMLElement).style.setProperty(
        `--color-sw-${colorKey}-${key}`,
        value,
      );
    });
  });
};

const setColorPalette = (
  colorKey: string,
  baseColor?: HexColor,
  colorScheme?: ColorScheme,
) => {
  const palette = baseColor
    ? createColorPalette(baseColor, colorScheme ?? 'dark')
    : null;

  if (!palette) {
    return;
  }

  setColorVariables(palette, colorKey);
};

const loadTheme = ({ primaryColor, surfaceColor, colorScheme }: Theme) => {
  setColorPalette('mauve', primaryColor, colorScheme);
  setColorPalette('gray', surfaceColor, colorScheme);
};

export const ThemeContext = createContext<Theme | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
  theme?: Theme;
};

export const ThemeProvider = ({ children, theme }: ThemeProviderProps) => {
  const value = useMemo((): Theme | undefined => theme, [theme]);

  useEffect(() => {
    if (theme) {
      loadTheme(theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
