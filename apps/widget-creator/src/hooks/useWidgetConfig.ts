import { useMemo } from 'react';
import type { WidgetConfig } from '@aurora-is-near/intents-swap-widget';
import '@aurora-is-near/intents-swap-widget/styles.css';

import { useCreator } from './useCreatorConfig';
import { DEFAULT_APP_KEY } from '@/constants';
import type { SerializableWidgetConfig } from '@/api/types';

export const useWidgetConfig = () => {
  const { state } = useCreator();
  const widgetConfig = useMemo(
    (): SerializableWidgetConfig & Partial<WidgetConfig> => ({
      appName: 'Near Intents',
      apiKey: DEFAULT_APP_KEY,
      connectedWallets: {},
      slippageTolerance: 100,
      enableAccountAbstraction: state.accountAbstractionMode === 'enabled',
      enableAutoTokensSwitching: true,
      chainsOrder: state.selectedNetworks,
      allowedChainsList: state.selectedNetworks,
      allowedTokensList:
        state.selectedTokenSymbols.length > 0
          ? state.selectedTokenSymbols
          : undefined,
      defaultSourceToken: state.enableSellToken
        ? state.defaultSellToken
        : undefined,
      sendAddress:
        state.widgetMode === 'deposit' && state.depositModeReceiverAddress
          ? state.depositModeReceiverAddress
          : undefined,
      defaultTargetToken:
        state.enableBuyToken || state.widgetMode === 'deposit'
          ? state.defaultBuyToken
          : undefined,
      showTransactionHistory: true,
      showConversionPreview: true,
    }),
    [state],
  );

  return { widgetConfig };
};
