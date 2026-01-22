import { useMemo } from 'react';
import { Theme } from '@aurora-is-near/intents-swap-widget';
import { useCreator } from './useCreatorConfig';
import { isHexColor } from '../utils/is-hex-color';

const getValidThemeColor = (color: string): `#${string}` | undefined => {
  return isHexColor(color) ? color : undefined;
};

export const useThemeConfig = () => {
  const { state } = useCreator();

  const themeConfig = useMemo((): Theme => {
    const theme: Theme = {
      primaryColor: getValidThemeColor(state.primaryColor),
      backgroundColor: getValidThemeColor(state.backgroundColor),
      successColor: getValidThemeColor(state.successColor),
      warningColor: getValidThemeColor(state.warningColor),
      errorColor: getValidThemeColor(state.errorColor),
      borderRadius: state.borderRadius,
      stylePreset: state.stylePreset,
    };

    if (state.stylePreset === 'clean') {
      theme.surfaceColor = getValidThemeColor(state.surfaceColor);
    }

    if (state.showContainerWrapper) {
      theme.showContainer = true;
      theme.containerColor = getValidThemeColor(state.containerColor);
    }

    return theme;
  }, [state]);

  return { themeConfig };
};
