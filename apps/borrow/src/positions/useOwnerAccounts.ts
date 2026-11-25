import { useIntentsConnectWallet } from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { isAddress } from 'viem';

import { intentsConnectApi } from '../config';
import { readEnv } from '../env';

/** A lowercase EVM address, or `undefined` for anything else. */
const evmAddress = (value: string | undefined) =>
  value !== undefined && isAddress(value, { strict: false })
    ? value.toLowerCase()
    : undefined;

/**
 * Outside `positions`: invalidating the positions must not look the
 * intermediary up again, it never changes for a wallet.
 */
export const intermediaryQueryKey = (
  address: string,
  publicKey: string | undefined,
) => ['intermediary', address, publicKey ?? null] as const;

type DebugOwnerEnv = {
  DEV?: boolean;
  VITE_DEBUG_POSITIONS_OWNER?: string;
};

/**
 * `VITE_DEBUG_POSITIONS_OWNER`, honoured only in development
 * (`import.meta.env.DEV`): an EVM address whose positions are read instead of
 * the connected wallet's, connected or not. Ignored in a production build and
 * when it is not an EVM address.
 */
export const readDebugPositionsOwner = (
  env: DebugOwnerEnv,
): string | undefined =>
  env.DEV === true
    ? evmAddress(readEnv(env.VITE_DEBUG_POSITIONS_OWNER))
    : undefined;

export type OwnerAccounts = {
  /** The accounts to read positions for: the intermediary first. */
  owners: readonly string[];
  /** Where Borrow's loans sit; repaid loans are looked for only here. */
  intermediary: string | undefined;
  /** The intermediary is still being looked up. */
  isLoading: boolean;
  /** The intermediary lookup failed; the wallet is still listed. */
  error: Error | null;
  /** Looks the intermediary up again. */
  refetch: () => void;
};

/**
 * The accounts whose loans are listed: the connected wallet's intermediary,
 * where Borrow opens loans (`owner: ctx.intermediary`), and the wallet itself
 * when it is an EVM address, for loans opened elsewhere.
 *
 * The intermediary is `GET /intermediary` (`api.getIntermediary`), no
 * signature, for EVM and Solana wallets alike: a Solana wallet passes its
 * public key, which is its address. It is deterministic per wallet, so it is
 * read once per wallet (`staleTime: Infinity`).
 *
 * In development, `VITE_DEBUG_POSITIONS_OWNER` replaces both.
 */
export const useOwnerAccounts = ({
  enabled = true,
}: { enabled?: boolean } = {}): OwnerAccounts => {
  const { address, wallet } = useIntentsConnectWallet();
  const debugOwner = readDebugPositionsOwner(import.meta.env);
  const publicKey = wallet?.getPublicKey?.();
  const lookup = enabled && debugOwner === undefined && address !== undefined;

  const intermediary = useQuery({
    queryKey: intermediaryQueryKey(address ?? '', publicKey),
    queryFn: async () => {
      if (address === undefined) {
        throw new Error('No wallet to look the intermediary up for');
      }

      const { evm } = await intentsConnectApi.getIntermediary(address, {
        publicKey,
      });

      const found = evmAddress(evm);

      if (!found) {
        throw new Error('The intermediary has no EVM address');
      }

      return found;
    },
    enabled: lookup,
    staleTime: Infinity,
  });

  const { refetch: refetchIntermediary } = intermediary;
  const refetch = useCallback(() => {
    void refetchIntermediary();
  }, [refetchIntermediary]);

  if (!enabled) {
    return {
      owners: [],
      intermediary: undefined,
      isLoading: false,
      error: null,
      refetch,
    };
  }

  if (debugOwner !== undefined) {
    return {
      owners: [debugOwner],
      intermediary: debugOwner,
      isLoading: false,
      error: null,
      refetch,
    };
  }

  const intermediaryAddress = lookup ? intermediary.data : undefined;
  const owners = [intermediaryAddress, evmAddress(address)].filter(
    (owner, index, all): owner is string =>
      owner !== undefined && all.indexOf(owner) === index,
  );

  return {
    owners,
    intermediary: intermediaryAddress,
    isLoading: lookup && intermediary.isPending,
    error: lookup ? intermediary.error : null,
    refetch,
  };
};
