import { useMemo } from 'react';
import { type WidgetConfig } from '@aurora-is-near/intents-swap-widget';
import { useCreator } from './useCreatorConfig';
import '@aurora-is-near/intents-swap-widget/styles.css';

export const useWidgetConfig = () => {
  const { state } = useCreator();

  const widgetConfig = useMemo(
    (): Partial<WidgetConfig> => ({
      appName: 'Widget Creator',
      enableAccountAbstraction: state.accountAbstractionMode === 'enabled',
      enableStandaloneMode: state.userAuthMode === 'standalone',
      allowedTargetChainsList: ['near'],
      allowedChainsList: state.selectedNetworks,
      allowedTokensList:
        state.selectedTokenSymbols.length > 0
          ? state.selectedTokenSymbols
          : undefined,
      defaultSourceToken: state.enableSellToken
        ? state.defaultSellToken
        : undefined,
      defaultTargetToken: state.enableBuyToken
        ? state.defaultBuyToken
        : undefined,
    }),
    [state],
  );

  return { widgetConfig };
};
