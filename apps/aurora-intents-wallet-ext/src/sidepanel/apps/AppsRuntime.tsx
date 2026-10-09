import { createContext, useContext, useMemo, useState } from 'react';
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
  /**
   * The runner's current outcome (success or failure) was seen and left:
   * screens show their form again instead of it. Lives with the runner, so
   * it survives leaving the screen.
   */
  isOutcomeDismissed: boolean;
  dismissOutcome: () => void;
};

/** Identifies one outcome of the runner: a new attempt changes it. */
const outcomeKey = (exec: UseExecutionResult) =>
  `${exec.executionId ?? 'none'}:${exec.phase}:${exec.error?.message ?? ''}`;

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
  const [dismissed, setDismissed] = useState<string>();
  const key = outcomeKey(exec);

  const value = useMemo(
    () => ({
      exec,
      connector,
      account,
      isOutcomeDismissed: dismissed === key,
      dismissOutcome: () => setDismissed(key),
    }),
    [exec, connector, account, dismissed, key],
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
