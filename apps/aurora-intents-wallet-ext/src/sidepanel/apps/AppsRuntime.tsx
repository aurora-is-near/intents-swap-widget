import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import type { WalletConnector } from '@aurora-is-near/intents-connect';
import {
  IntentsConnectProvider,
  useExecution,
} from '@aurora-is-near/intents-connect/react';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';

import type { Account, WalletAccount } from '../accounts/types';
import { intentsConnectApi } from './api';
import { createConnector, unsupportedReason } from './connectors';

type AppsRuntime = {
  exec: UseExecutionResult;
  connector: WalletConnector;
  account: WalletAccount;
};

const AppsRuntimeContext = createContext<AppsRuntime | null>(null);

const Runner = ({
  account,
  connector,
  children,
}: PropsWithChildren<{
  account: WalletAccount;
  connector: WalletConnector;
}>) => {
  const exec = useExecution();
  const value = useMemo(
    () => ({ exec, connector, account }),
    [exec, connector, account],
  );

  return (
    <AppsRuntimeContext.Provider value={value}>
      {children}
    </AppsRuntimeContext.Provider>
  );
};

/**
 * One Intents Connect runner for the active wallet account, above the
 * screens: a deposit keeps being followed (and can still be retried) when the
 * user leaves the app's screen. Passkey accounts and wallets Intents Connect
 * can't resolve get none.
 */
export const AppsRuntimeProvider = ({
  account,
  children,
}: PropsWithChildren<{ account: Account | null }>) => {
  const walletAccount =
    account?.kind === 'wallet' && !unsupportedReason(account) ? account : null;

  // Per account: the runner rebuilds only when the signer changes.
  const connector = useMemo(
    () => (walletAccount ? createConnector(walletAccount) : null),
    [walletAccount?.id, walletAccount?.address],
  );

  if (!walletAccount || !connector) {
    return <>{children}</>;
  }

  return (
    <IntentsConnectProvider api={intentsConnectApi} wallet={connector}>
      <Runner account={walletAccount} connector={connector}>
        {children}
      </Runner>
    </IntentsConnectProvider>
  );
};

/** The active wallet account's runner; null where apps aren't available. */
export const useAppsRuntime = () => useContext(AppsRuntimeContext);
