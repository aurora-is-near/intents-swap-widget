import { useMemo } from 'react';
import type { WidgetConfig } from '@aurora-is-near/intents-swap-widget';
import '@aurora-is-near/intents-swap-widget/styles.css';

import { useCreator } from './useCreatorConfig';
import { DEFAULT_APP_KEY } from '@/constants';

export const useWidgetConfig = () => {
  const { state } = useCreator();
  const widgetConfig = useMemo(
    (): Partial<WidgetConfig> => ({
      appName: 'Near Intents',
      apiKey: DEFAULT_APP_KEY,
      enableAccountAbstraction: state.accountAbstractionMode === 'enabled',
      allowedChainsList: state.selectedNetworks,
      allowedTokensList: state.selectedTokenSymbols,
      defaultSourceToken: state.enableSellToken
        ? state.defaultSellToken
        : undefined,
      defaultTargetToken: state.enableBuyToken
        ? state.defaultBuyToken
        : undefined,
      showTransactionHistory: true,
    }),
    [state],
  );

  return { widgetConfig };
};
