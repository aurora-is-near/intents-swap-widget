import { IntentsConnectProvider } from '@aurora-is-near/intents-connect/react';
import { useIntentsConnectWallet } from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import type { ReactNode } from 'react';

import { intentsConnectApi } from '../config';

type IntentsConnectWalletProviderProps = {
  children: ReactNode;
};

/**
 * `IntentsConnectProvider` with the app's API client (create calls through the
 * API-key proxy) and the AppKit wallet, `null` while disconnected. Must sit
 * inside `WalletProvider`, whose AppKit the wallet hook reads.
 */
export function IntentsConnectWalletProvider({
  children,
}: IntentsConnectWalletProviderProps) {
  const { wallet } = useIntentsConnectWallet();

  return (
    <IntentsConnectProvider api={intentsConnectApi} wallet={wallet ?? null}>
      {children}
    </IntentsConnectProvider>
  );
}
