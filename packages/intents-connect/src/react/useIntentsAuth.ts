import { useCallback, useRef } from 'react';
import { useSnapshot } from 'valtio';

import { getWalletIntentsAccountId } from '@/account';
import { proofRpcUrls } from '@/near/rpcUrls';
import { getProofSignerId } from '@/ownership/payload';
import type { OwnershipVerdict } from '@/ownership/types';
import { type IntentsSessionStatus, SessionError } from '@/session';
import { verifyWallet } from '@/verification';
import { useIntentsAccountContext } from '@/react/accountContext';
import { useIntentsConnect } from '@/react/context';

export type AuthorizeResult = {
  authorized: boolean;
  /** Set when `verify` was requested. A failed verdict skips authorization. */
  verdict?: OwnershipVerdict;
};

export type UseIntentsAuthResult = {
  status: IntentsSessionStatus;
  intentsAccountId?: string;
  /** Epoch milliseconds. Past this the user must authorize again. */
  refreshTokenExpiresAt?: number;
  error?: Error;
  /**
   * Opens a session for the provider wallet (one wallet prompt). With
   * `verify: true` the same signature is first simulated on `intents.near`
   * and recorded as verified — still one prompt.
   *
   * Rejects with a `SessionError` `SUPERSEDED` when the wallet's account
   * changed before it finished.
   */
  authorize: (options?: { verify?: boolean }) => Promise<AuthorizeResult>;
  logout: () => Promise<void>;
};

/**
 * The user session that unlocks confidential balances. A stored session is
 * restored automatically when the wallet's account changes.
 */
export const useIntentsAuth = (): UseIntentsAuthResult => {
  const { session, verification, intentsApi } = useIntentsAccountContext();
  const { wallet } = useIntentsConnect();
  const snapshot = useSnapshot(session.state);

  const walletRef = useRef(wallet);

  walletRef.current = wallet;

  const authorize = useCallback(
    async ({ verify = false }: { verify?: boolean } = {}) => {
      const { current } = walletRef;

      if (!current) {
        throw new SessionError('WALLET_NOT_CONNECTED', 'no wallet connected');
      }

      if (!verify) {
        await session.authorize(current);

        return { authorized: true };
      }

      const { verdict, proof } = await verifyWallet(current, {
        store: verification,
        rpcUrls: proofRpcUrls(intentsApi),
      });

      if (!verdict.ok) {
        return { authorized: false, verdict };
      }

      // The wallet may have switched accounts during the prompt; a proof for
      // the previous account must not open a session under the new one.
      if (
        getProofSignerId(proof) !== getWalletIntentsAccountId(walletRef.current)
      ) {
        throw new SessionError(
          'SUPERSEDED',
          'the wallet changed accounts while signing',
        );
      }

      await session.authorize(current, { proof });

      return { authorized: true, verdict };
    },
    [session, verification, intentsApi],
  );

  return {
    status: snapshot.status,
    intentsAccountId: snapshot.intentsAccountId,
    refreshTokenExpiresAt: snapshot.refreshTokenExpiresAt,
    error: snapshot.error,
    authorize,
    logout: session.logout,
  };
};
