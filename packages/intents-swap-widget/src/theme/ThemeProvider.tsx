import {
  createContext,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import {
  ColorPalette,
  ColorScheme,
  HexColor,
  Theme,
  ThemeBorderRadius,
} from '../types/theme';
import { ColorStop, createColorPalette } from './createColorPalette';
import { useConfig } from '@/config';

const setVariable = (key: string, value: string, elements: HTMLElement[]) => {
  elements.forEach((el) => {
    el.style.setProperty(key, value, 'important');
  });
};

const setColorVariable = (
  key: string,
  value: string,
  elements: HTMLElement[],
) => {
  setVariable(`--c-sw-${key}`, value, elements);
};

const setColorVariables = (
  palette: ColorPalette,
  colorKey: string,
  elements: HTMLElement[],
) => {
  Object.entries(palette).forEach(([key, value]) => {
    setColorVariable(`${colorKey}-${key}`, value, elements);
  });
};

const setColorPalette = (
  colorKey: string,
  colorStop: ColorStop,
  elements: HTMLElement[],
  baseColor: HexColor,
  colorScheme: ColorScheme,
) => {
  const palette = createColorPalette(baseColor, colorScheme, colorStop);

  if (!palette) {
    return;
  }

  setColorVariables(palette, colorKey, elements);
};

const setBorderRadiusVariables = (
  borderRadius: ThemeBorderRadius,
  elements: HTMLElement[],
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

  setVariable('--r-sw-sm', `${values[borderRadius].sm}px`, elements);
  setVariable('--r-sw-md', `${values[borderRadius].md}px`, elements);
  setVariable('--r-sw-lg', `${values[borderRadius].lg}px`, elements);
};

const loadTheme = (theme: Theme, elements: HTMLElement[]) => {
  const {
    accentColor,
    backgroundColor,
    successColor,
    warningColor,
    errorColor,
    colorScheme = 'dark',
    borderRadius = 'md',
    stylePreset = 'clean',
  } = theme;

  if (accentColor) {
    setColorPalette('accent', 500, elements, accentColor, colorScheme);

    if (stylePreset === 'bold') {
      setColorPalette('gray', 500, elements, accentColor, colorScheme);
    }
  }

  if (backgroundColor && stylePreset === 'clean') {
    setColorPalette('gray', 950, elements, backgroundColor, colorScheme);
  }

  if (successColor) {
    setColorVariable('status-success', successColor, elements);
  }

  if (warningColor) {
    setColorVariable('status-warning', warningColor, elements);
  }

  if (errorColor) {
    setColorVariable('status-error', errorColor, elements);
  }

  if (borderRadius) {
    setBorderRadiusVariables(borderRadius, elements);
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!theme) {
      return;
    }

    const themeParentElement = themeParentElementSelector
      ? document.querySelector(themeParentElementSelector)
      : null;

    // The variables are set on a parent element (document.body by default) so
    // they can be used outside of the widget, such as the background of the
    // widget creator.
    const parentEl =
      themeParentElement instanceof HTMLElement
        ? themeParentElement
        : document.body;

    const elements: HTMLElement[] = [parentEl];

    // It is important to set the variables on the container element as,
    // otherwise the variables set in the CSS files will take precedence.
    if (containerRef.current) {
      elements.push(containerRef.current);
    }

    loadTheme(theme, elements);
  }, [theme]);

  return (
    <ThemeContext.Provider value={value}>
      <div ref={containerRef} className="sw">
        {children}
      </div>
    </ThemeContext.Provider>
  );
};
