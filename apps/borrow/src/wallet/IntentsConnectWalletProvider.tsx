import type { IntentsApi } from '@aurora-is-near/intents-connect';
import { IntentsConnectProvider } from '@aurora-is-near/intents-connect/react';
import { useIntentsConnectWallet } from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import type { ReactNode } from 'react';

import { intentsConnectApi } from '../config';

type IntentsConnectWalletProviderProps = {
  children: ReactNode;
  /** The intents API client, which the SDK's account hooks (balances) need. */
  intentsApi?: IntentsApi;
};

/**
 * `IntentsConnectProvider` with the app's API client (create calls through the
 * API-key proxy) and the AppKit wallet, `null` while disconnected. Must sit
 * inside `WalletProvider`, whose AppKit the wallet hook reads. With
 * `intentsApi`, the account hooks (`useWalletBalances`) work too.
 */
export function IntentsConnectWalletProvider({
  children,
  intentsApi,
}: IntentsConnectWalletProviderProps) {
  const { wallet } = useIntentsConnectWallet();

  return (
    <IntentsConnectProvider
      api={intentsConnectApi}
      wallet={wallet ?? null}
      {...(intentsApi ? { intentsApi } : {})}>
      {children}
    </IntentsConnectProvider>
  );
}
