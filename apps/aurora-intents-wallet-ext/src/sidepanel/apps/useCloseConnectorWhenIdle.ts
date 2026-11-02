import { useEffect } from 'react';

import type { Phase } from '@aurora-is-near/intents-connect';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';

import type { WalletAccount } from '../accounts/types';
import { closeConnector } from '../wallet/connectorWindow';

/** Phases in which the runner may still ask the wallet to sign. */
const SIGNING_PHASES: readonly Phase[] = [
  'resolving-identity',
  'planning',
  'creating',
  'awaiting-signature',
  'submitting',
];

/**
 * Closes the connector window as soon as a deposit no longer needs the
 * wallet: after the transfer is sent, or after signing when the funds come
 * from elsewhere (deposit address). Anything later that needs the wallet
 * again — a retry, a cancel signature — reopens it on demand.
 */
export const useCloseConnectorWhenIdle = ({
  account,
  exec,
  depositViaWallet,
  isRetryingTransfer,
}: {
  account: WalletAccount;
  exec: UseExecutionResult;
  depositViaWallet: boolean;
  /** The wallet transfer failed and awaits a retry — nothing is pending. */
  isRetryingTransfer: boolean;
}) => {
  // Mobile wallets sign over WalletConnect; browser wallets in that window.
  const usesConnector = account.source !== 'walletconnect';

  const awaitsWalletTransfer =
    exec.phase === 'awaiting-deposit' &&
    depositViaWallet &&
    !exec.depositTxHash &&
    !isRetryingTransfer;

  const needsWallet =
    exec.isCancelling ||
    SIGNING_PHASES.includes(exec.phase) ||
    awaitsWalletTransfer;

  useEffect(() => {
    // `idle`: nothing has run yet, so there is nothing to clean up.
    if (usesConnector && exec.phase !== 'idle' && !needsWallet) {
      void closeConnector();
    }
  }, [usesConnector, exec.phase, needsWallet]);
};
