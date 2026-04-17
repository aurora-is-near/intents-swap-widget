import type { CSSProperties } from 'react';

import type {
  ColorScheme,
  HexColor,
  Theme,
  ThemeBorderRadius,
} from '../types/theme';
import { createColorPalette } from './createColorPalette';

type ThemeCssVariables = CSSProperties & Record<`--${string}`, string>;

const setColorPaletteVariables = (
  variables: ThemeCssVariables,
  colorKey: string,
  colorScheme: ColorScheme,
  baseColor: HexColor,
  colorStop: 500 | 950,
) => {
  const palette = createColorPalette(baseColor, colorScheme, colorStop);

  Object.entries(palette).forEach(([stop, colorValue]) => {
    variables[`--c-sw-${colorKey}-${stop}`] = colorValue;
  });
};

const setBorderRadiusVariables = (
  variables: ThemeCssVariables,
  borderRadius: ThemeBorderRadius,
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

  variables['--r-sw-sm'] = `${values[borderRadius].sm}px`;
  variables['--r-sw-md'] = `${values[borderRadius].md}px`;
  variables['--r-sw-lg'] = `${values[borderRadius].lg}px`;
};

export const getThemeCssVariables = (
  theme?: Theme,
): ThemeCssVariables | undefined => {
  if (!theme) {
    return undefined;
  }

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

  const variables: ThemeCssVariables = {};

  if (accentColor) {
    setColorPaletteVariables(
      variables,
      'accent',
      colorScheme,
      accentColor,
      500,
    );

    if (stylePreset === 'bold') {
      setColorPaletteVariables(
        variables,
        'gray',
        colorScheme,
        accentColor,
        500,
      );
    }
  }

  if (backgroundColor && stylePreset === 'clean') {
    setColorPaletteVariables(
      variables,
      'gray',
      colorScheme,
      backgroundColor,
      950,
    );
  }

  if (successColor) {
    variables['--c-sw-status-success'] = successColor;
  }

  if (warningColor) {
    variables['--c-sw-status-warning'] = warningColor;
  }

  if (errorColor) {
    variables['--c-sw-status-error'] = errorColor;
  }

  setBorderRadiusVariables(variables, borderRadius);

  return variables;
};
