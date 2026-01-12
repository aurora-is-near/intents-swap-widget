import { useCallback, useMemo } from 'react';
import { Theme } from '@aurora-is-near/intents-swap-widget';
import { useCreator } from './useCreatorConfig';
import '@aurora-is-near/intents-swap-widget/styles.css';
import { isHexColor } from '../utils/is-hex-color';

const getValidThemeColor = (color: string): `#${string}` | undefined => {
  return isHexColor(color) ? color : undefined;
};

export const useThemeConfig = () => {
  const { state } = useCreator();

  const getColorScheme = useCallback(() => {
    if (state.defaultMode === 'auto') {
      // Check system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }

    return state.defaultMode;
  }, [state.defaultMode]);

  const colorScheme = getColorScheme();

  const themeConfig = useMemo((): Theme => {
    const theme: Theme = {
      primaryColor: getValidThemeColor(state.primaryColor),
      backgroundColor: getValidThemeColor(state.backgroundColor),
      successColor: getValidThemeColor(state.successColor),
      warningColor: getValidThemeColor(state.warningColor),
      errorColor: getValidThemeColor(state.errorColor),
      colorScheme: colorScheme ?? 'dark',
      borderRadius: state.borderRadius,
      stylePreset: state.stylePreset,
    };

    if (state.stylePreset === 'clean') {
      theme.surfaceColor = getValidThemeColor(state.surfaceColor);
    }

    return theme;
  }, [state, colorScheme]);

  return { themeConfig };
};
