import { useMemo } from 'react';
import type { WidgetConfig } from '@aurora-is-near/intents-swap-widget';
import '@aurora-is-near/intents-swap-widget/styles.css';

import { useCreator } from './useCreatorConfig';
import { useTokensGroupedBySymbol } from './useTokens';

import { DEFAULT_APP_KEY, PLACEHOLDER_APP_KEY } from '@/constants';
import type { SerializableWidgetConfig } from '@/api/types';

export const useWidgetConfig = () => {
  const { state } = useCreator();
  const allTokens = useTokensGroupedBySymbol();
  const widgetConfig = useMemo((): SerializableWidgetConfig &
    Partial<WidgetConfig> => {
    const allTokenSymbols = allTokens.map((token) => token.symbol);
    const hasExplicitAllowedTokens = state.selectedTokenSymbols.length > 0;
    const hasAllTokensSelected =
      hasExplicitAllowedTokens &&
      allTokenSymbols.length > 0 &&
      state.selectedTokenSymbols.length === allTokenSymbols.length &&
      allTokenSymbols.every((symbol) =>
        state.selectedTokenSymbols.includes(symbol),
      );

    return {
      apiKey:
        state.apiKey && state.apiKey !== PLACEHOLDER_APP_KEY
          ? state.apiKey
          : DEFAULT_APP_KEY,
      connectedWallets: {},
      slippageTolerance: 100,
      enableAccountAbstraction: state.accountAbstractionMode === 'enabled',
      enableAutoTokensSwitching: true,
      chainsOrder: state.selectedNetworks,
      allowedChainsList: state.selectedNetworks,
      allowedTokensList:
        hasExplicitAllowedTokens && !hasAllTokensSelected
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
    };
  }, [allTokens, state]);

  return { widgetConfig };
};
