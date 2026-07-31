import { useMemo } from 'react';
import type { WidgetConfig } from '@aurora-is-near/intents-swap-widget';
import '@aurora-is-near/intents-swap-widget/styles.css';

import { DEFAULT_APP_KEY, PLACEHOLDER_APP_KEY } from '@/constants';
import type { SerializableWidgetConfig } from '@/api/types';
import { getAllowedTokensList } from '@/utils/tokenSelection';
import { getConfigOverridesFromUrl } from '@/utils/get-url-param';
import { useTokensGroupedBySymbol } from './useTokens';
import { useCreator } from './useCreatorConfig';

const configOverrides = getConfigOverridesFromUrl();

export const useWidgetConfig = () => {
  const { state } = useCreator();
  const allTokens = useTokensGroupedBySymbol();
  const widgetConfig = useMemo((): SerializableWidgetConfig &
    Partial<WidgetConfig> => {
    const allTokenSymbols = allTokens.map((token) => token.symbol);

    const defaultSourceToken = state.enableSellToken
      ? state.defaultSellToken
      : undefined;

    const defaultTargetToken =
      state.enableBuyToken || state.widgetMode === 'deposit'
        ? state.defaultBuyToken
        : undefined;

    const allowedTokensList = getAllowedTokensList(
      state.selectedTokenSymbols,
      allTokenSymbols,
      [defaultSourceToken?.symbol, defaultTargetToken?.symbol],
    );

    return {
      apiKey:
        state.apiKey && state.apiKey !== PLACEHOLDER_APP_KEY
          ? state.apiKey
          : DEFAULT_APP_KEY,
      connectedWallets: {},
      slippageTolerance: 100,
      confidentialMode: state.confidentialMode,
      allowSwapWithExternalWallet: state.allowSwapWithExternalWallet,
      enableAccountAbstraction: state.accountAbstractionMode === 'enabled',
      enableAutoTokensSwitching: state.widgetMode !== 'deposit',
      chainsOrder: state.selectedNetworks,
      allowedChainsList: state.selectedNetworks,
      allowedTokensList,
      defaultSourceToken,
      sendAddress:
        state.widgetMode === 'deposit' && state.depositModeReceiverAddress
          ? state.depositModeReceiverAddress
          : undefined,
      defaultTargetToken,
      hideTokenInputHeadings: state.hideTokenInputHeadings,
      showTransactionHistory: true,
      showConversionPreview: true,
      extraQuoteParameters: {
        ...state.extraQuoteParameters,
        ...configOverrides?.extraQuoteParameters,
      },
    };
  }, [allTokens, state]);

  return { widgetConfig };
};
