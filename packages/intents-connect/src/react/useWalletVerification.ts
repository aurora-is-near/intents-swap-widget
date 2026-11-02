import { useCallback, useRef, useState } from 'react';
import { useSnapshot } from 'valtio';

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

  const [status, setStatus] = useState<WalletVerificationStatus>('idle');
  const [verdict, setVerdict] = useState<OwnershipVerdict>();
  const [error, setError] = useState<Error>();

  const walletRef = useRef(wallet);

  walletRef.current = wallet;

  const verify = useCallback(async () => {
    const { current } = walletRef;

    if (!current) {
      throw new SessionError('WALLET_NOT_CONNECTED', 'no wallet connected');
    }

    setStatus('verifying');
    setError(undefined);

    try {
      const result = await verifyWallet(current, {
        store: verification,
        rpcUrls: proofRpcUrls(intentsApi),
      });

      setVerdict(result.verdict);
      setStatus(result.verdict.ok ? 'verified' : 'rejected');

      return result;
    } catch (caught) {
      const failure =
        caught instanceof Error ? caught : new Error(String(caught));

      setError(failure);
      setStatus('error');
      throw failure;
    }
  }, [verification, intentsApi]);

  return {
    isVerified: verification.isVerified(wallet, snapshot.verified),
    status,
    verdict,
    error,
    verify,
  };
};
