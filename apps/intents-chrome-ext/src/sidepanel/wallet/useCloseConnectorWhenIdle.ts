import { useEffect } from 'react';

import type { Phase } from '@aurora-is-near/intents-connect';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';

import { closeConnector } from './connectorWindow';
import type { ConnectedWallet } from './types';

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
  wallet,
  exec,
  depositViaWallet,
  isRetryingTransfer,
}: {
  wallet: ConnectedWallet | null;
  exec: UseExecutionResult;
  depositViaWallet: boolean;
  /** The wallet transfer failed and awaits a retry — nothing is pending. */
  isRetryingTransfer: boolean;
}) => {
  const usesConnector = wallet?.connection === 'extension';

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
