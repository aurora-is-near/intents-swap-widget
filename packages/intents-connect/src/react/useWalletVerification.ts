import { useCallback, useRef, useState } from 'react';
import { useSnapshot } from 'valtio';

import { getWalletIntentsAccountId } from '@/account';
import { proofRpcUrls } from '@/near/rpcUrls';
import type { OwnershipVerdict } from '@/ownership/types';
import { SessionError } from '@/session';
import { verifyWallet, type VerifyWalletResult } from '@/verification';
import { useIntentsAccountContext } from '@/react/accountContext';
import { useIntentsConnect } from '@/react/context';

export type WalletVerificationStatus =
  | 'idle'
  | 'verifying'
  | 'verified'
  | 'rejected'
  | 'error';

export type UseWalletVerificationResult = {
  /** Verified on this device before (or just now). */
  isVerified: boolean;
  status: WalletVerificationStatus;
  /** The last verification's outcome, when it reached the contract. */
  verdict?: OwnershipVerdict;
  error?: Error;
  /**
   * Signs an ownership proof (one wallet prompt) and has `intents.near`
   * simulate it. Resolves with the proof too, valid for 5 minutes.
   */
  verify: () => Promise<VerifyWalletResult>;
};

/** Whether the provider wallet can sign for its intents account. */
export const useWalletVerification = (): UseWalletVerificationResult => {
  const { verification, intentsApi } = useIntentsAccountContext();
  const { wallet } = useIntentsConnect();
  const snapshot = useSnapshot(verification.state);

  // Each attempt is recorded with the account it ran for, so switching
  // wallets mid-prompt (or after) never shows one account's result as the
  // other's.
  const [attempt, setAttempt] = useState<{
    intentsAccountId?: string;
    status: WalletVerificationStatus;
    verdict?: OwnershipVerdict;
    error?: Error;
  }>({ status: 'idle' });

  const walletRef = useRef(wallet);

  walletRef.current = wallet;

  const verify = useCallback(async () => {
    const { current } = walletRef;

    if (!current) {
      throw new SessionError('WALLET_NOT_CONNECTED', 'no wallet connected');
    }

    const intentsAccountId = getWalletIntentsAccountId(current);

    setAttempt({ intentsAccountId, status: 'verifying' });

    try {
      const result = await verifyWallet(current, {
        store: verification,
        rpcUrls: proofRpcUrls(intentsApi),
      });

      setAttempt({
        intentsAccountId,
        status: result.verdict.ok ? 'verified' : 'rejected',
        verdict: result.verdict,
      });

      return result;
    } catch (caught) {
      const failure =
        caught instanceof Error ? caught : new Error(String(caught));

      setAttempt({ intentsAccountId, status: 'error', error: failure });
      throw failure;
    }
  }, [verification, intentsApi]);

  const current =
    attempt.intentsAccountId === getWalletIntentsAccountId(wallet)
      ? attempt
      : { status: 'idle' as const };

  return {
    isVerified: verification.isVerified(wallet, snapshot.verified),
    status: current.status,
    verdict: current.verdict,
    error: current.error,
    verify,
  };
};
