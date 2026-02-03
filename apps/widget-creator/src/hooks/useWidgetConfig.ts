import { useMemo } from 'react';
import { type WidgetConfig } from '@aurora-is-near/intents-swap-widget';
import { useCreator } from './useCreatorConfig';
import '@aurora-is-near/intents-swap-widget/styles.css';

export const useWidgetConfig = () => {
  const { state } = useCreator();

  const widgetConfig = useMemo(
    (): Partial<WidgetConfig> => ({
      appName: 'Widget Creator',
      appKey: 'ade8b6fa-a564-46ff-a892-6b80fb601678',
      enableAccountAbstraction: state.accountAbstractionMode === 'enabled',
      enableStandaloneMode: state.userAuthMode === 'standalone',
      allowedChainsList: state.selectedNetworks,
      allowedTokensList: state.selectedTokenSymbols,
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
