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
      accentColor: getValidThemeColor(state.accentColor),
      successColor: getValidThemeColor(state.successColor),
      warningColor: getValidThemeColor(state.warningColor),
      errorColor: getValidThemeColor(state.errorColor),
      colorScheme: state.defaultMode,
      borderRadius: state.borderRadius,
      stylePreset: state.stylePreset,
    };

    if (state.stylePreset === 'clean') {
      theme.backgroundColor = getValidThemeColor(state.backgroundColor);
    }

    if (state.showContainerWrapper) {
      theme.showContainer = true;
    }

    return theme;
  }, [state]);

  return { themeConfig };
};
