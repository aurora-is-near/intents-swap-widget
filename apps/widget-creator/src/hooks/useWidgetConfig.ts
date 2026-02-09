import { useMemo } from 'react';
import { type WidgetConfig } from '@aurora-is-near/intents-swap-widget';
import '@aurora-is-near/intents-swap-widget/styles.css';

import { useCreator } from './useCreatorConfig';
import { DEFAULT_APP_KEY, PLACEHOLDER_APP_KEY } from '@/constants';

export const useWidgetConfig = () => {
  const { state } = useCreator();

  const widgetConfig = useMemo(
    (): Partial<WidgetConfig> => ({
      appName: 'Widget Creator',
      apiKey:
        // we don't want to expose our default app key to the exported code
        // but want a widget to function in a studio so we swap them here
        state.apiKey === PLACEHOLDER_APP_KEY ? DEFAULT_APP_KEY : state.apiKey,
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
