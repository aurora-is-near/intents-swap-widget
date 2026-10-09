import { createContext, useContext, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

import type { WalletConnector } from '@aurora-is-near/intents-connect';
import {
  IntentsConnectProvider,
  useExecution,
} from '@aurora-is-near/intents-connect/react';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';

import type {
  Account,
  ConnectedWallet,
  WalletAccount,
} from '../accounts/types';
import { intentsConnectApi } from './api';
import {
  createConnector,
  createWalletTransfer,
  unsupportedReason,
} from './connectors';
import type { PayerRef } from './connectors';

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
  /**
   * Who sends the next deposit transfer: another of the account's wallets,
   * or null for the account's own. The account always signs.
   */
  setPayer: (wallet: ConnectedWallet | null) => void;
};

/** Identifies one outcome of the runner: a new attempt changes it. */
const outcomeKey = (exec: UseExecutionResult) =>
  `${exec.executionId ?? 'none'}:${exec.phase}:${exec.error?.message ?? ''}`;

const AppsRuntimeContext = createContext<AppsRuntime | null>(null);

const Runner = ({
  account,
  connector,
  payer,
  children,
}: PropsWithChildren<{
  account: WalletAccount;
  connector: WalletConnector;
  payer: PayerRef;
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
      setPayer: (wallet: ConnectedWallet | null) => {
        // eslint-disable-next-line no-param-reassign
        payer.current = wallet ? createWalletTransfer(wallet) : null;
      },
    }),
    [exec, connector, account, dismissed, key, payer],
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

  // Read by the connector at transfer time, so switching it needs no new
  // runner.
  const payer = useRef<PayerRef['current']>(null);

  // Per account: the runner rebuilds only when the signer changes.
  const connector = useMemo(
    () => (walletAccount ? createConnector(walletAccount, payer) : null),
    [walletAccount?.id, walletAccount?.address],
  );

  if (!walletAccount || !connector) {
    return <>{children}</>;
  }

  return (
    <IntentsConnectProvider api={intentsConnectApi} wallet={connector}>
      <Runner account={walletAccount} connector={connector} payer={payer}>
        {children}
      </Runner>
    </IntentsConnectProvider>
  );
};

/** The active wallet account's runner; null where apps aren't available. */
export const useAppsRuntime = () => useContext(AppsRuntimeContext);
