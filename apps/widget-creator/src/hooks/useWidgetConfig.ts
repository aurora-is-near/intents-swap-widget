import { useMemo, useState } from 'react';
import {
  type WidgetConfig,
} from '@aurora-is-near/intents-swap-widget';
import { useCreator } from './useCreatorConfig';
import '@aurora-is-near/intents-swap-widget/styles.css';
import { useAppKitWallet } from './useAppKitWallet';

export const useWidgetConfig = () => {
  const { state } = useCreator();
  const { address: walletAddress } = useAppKitWallet();

  const appBalanceMode = walletAddress ? 'with-balance' : 'all';

  const widgetConfig = useMemo(
    (): Partial<WidgetConfig> =>
      ({
        appName: 'Widget Creator',
        connectedWallets: { default: walletAddress },
        intentsAccountType: 'near',
        chainsFilter: {
          target: {
            intents: 'all',
            external: 'all',
          },
          source: {
            intents: appBalanceMode,
            external: walletAddress ? 'wallet-supported' : 'all',
          },
        },
        allowedTargetChainsList: ['near'],
        allowedChainsList:
          state.selectedNetworks.length > 0
            ? state.selectedNetworks
            : undefined,
        allowedTokensList:
          state.selectedTokenSymbols.length > 0
            ? state.selectedTokenSymbols
            : undefined,
      }),
    [state, appBalanceMode, walletAddress],
  );

  return { widgetConfig };
}
