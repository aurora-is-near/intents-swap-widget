import { useMemo } from 'react';
import type { WidgetConfig } from '@aurora-is-near/intents-swap-widget';
import '@aurora-is-near/intents-swap-widget/styles.css';

import type { SerializableWidgetConfig } from '@/api/types';
import { getAllowedTokensList } from '@/utils/tokenSelection';
import { getAllowedChainsList } from '@/utils/networkSelection';
import { getConfigOverridesFromUrl } from '@/utils/get-url-param';
import { getWidgetApiKey } from '@/utils/get-widget-api-key';
import { useAvailableChains, useTokensGroupedBySymbol } from './useTokens';
import { useCreator } from './useCreatorConfig';

const configOverrides = getConfigOverridesFromUrl();

export const useWidgetConfig = () => {
  const { state } = useCreator();
  const allTokens = useTokensGroupedBySymbol();
  const availableChains = useAvailableChains();
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
      apiKey: getWidgetApiKey(state.apiKey),
      connectedWallets: {},
      slippageTolerance: 100,
      confidentialMode: state.confidentialMode,
      allowSwapWithExternalWallet: state.allowSwapWithExternalWallet,
      enableAccountAbstraction: state.accountAbstractionMode === 'enabled',
      enableAutoTokensSwitching: state.widgetMode !== 'deposit',
      chainsOrder: state.selectedNetworks,
      allowedChainsList: getAllowedChainsList(
        state.selectedNetworks,
        availableChains.map((chain) => chain.id),
      ),
      attachWalletAddressToQuote: true,
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
        customRecipientMsg: 'test',
      },
    };
  }, [allTokens, availableChains, state]);

  return { widgetConfig };
};
