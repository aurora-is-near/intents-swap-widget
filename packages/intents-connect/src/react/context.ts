import { createContext, useContext } from 'react';
import type { IntentsConnectApi } from '@/api/types';
import type { ExecutionRunnerOptions } from '@/runner/types';
import type { WalletConnector } from '@/types/wallet';

/** Everything a `useExecution` call needs that is not per-execution. */
export type IntentsConnectContextValue = Omit<
  ExecutionRunnerOptions,
  'api' | 'wallet' | 'onEvent'
> & {
  api: IntentsConnectApi;
  /**
   * The connected wallet. `null` while disconnected — `useExecution` surfaces a
   * `WALLET_NOT_CONNECTED` guard rather than throwing at render time.
   */
  wallet: WalletConnector | null;
};

export const IntentsConnectContext =
  createContext<IntentsConnectContextValue | null>(null);

export const useIntentsConnect = (): IntentsConnectContextValue => {
  const value = useContext(IntentsConnectContext);

  if (!value) {
    throw new Error(
      'useIntentsConnect must be used inside an <IntentsConnectProvider>',
    );
  }

  return value;
};
