import { IntentsConnectProvider } from '@aurora-is-near/intents-connect/react';
import type { ReactNode } from 'react';

import { intentsApi, intentsConnectApi } from '@/config';

import { useWallet } from '../hooks/useWallet';

/**
 * `IntentsConnectProvider` with the app's API clients (`intentsConnectApi`,
 * which sends the Intents Connect API key, and `intentsApi`, which the
 * account hooks such as `useWalletBalances` read through) and the connected
 * wallet (any family), `null` while disconnected. Must sit inside
 * `WalletSessionProvider`, whose session `useWallet` reads.
 *
 * The runner's auto-cancel on a declined signature is off: `useBorrowFlow`
 * cancels the execution itself, so its dialog can explain the second wallet
 * prompt before it opens.
 */
export function IntentsConnectWalletProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { wallet } = useWallet();

  return (
    <IntentsConnectProvider
      api={intentsConnectApi}
      autoCancelOnSignatureRejection={false}
      intentsApi={intentsApi}
      wallet={wallet ?? null}>
      {children}
    </IntentsConnectProvider>
  );
}
