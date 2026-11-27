import { useIntentsConnect } from '@aurora-is-near/intents-connect/react';
import { useQuery } from '@tanstack/react-query';

import { readEnv } from '@/env';
import { useWallet } from '@/domains/wallet/hooks/useWallet';

const intermediaryQueryKey = (address: string, publicKey: string | undefined) =>
  ['intermediary', address, publicKey ?? null] as const;

/**
 * Dev only: an address whose positions are shown instead of the wallet's,
 * such as an account with known loans. Ignored outside `vite dev`.
 */
const debugOwner = () =>
  import.meta.env.DEV
    ? readEnv(import.meta.env.VITE_DEBUG_POSITIONS_OWNER)?.toLowerCase()
    : undefined;

export type OwnerAccounts = {
  /**
   * The accounts whose loans are read, lowercase: the intermediary first,
   * then the connected wallet when it is an EVM address. Empty while
   * disconnected or while the intermediary is looked up.
   */
  owners: string[];
  /** The account Borrow's loans sit under; Borrow manages only its loans. */
  intermediary: string | undefined;
  status: 'idle' | 'pending' | 'error' | 'success';
  refetch: () => void;
};

/**
 * Whose loans My positions shows. Borrow opens each loan under the wallet's
 * intermediary (the execution's own EVM account, not the wallet), which the
 * Intents Connect API names for any wallet family without a signature, so it
 * is looked up once per wallet. An EVM wallet's own loans, opened elsewhere,
 * are read too and shown read-only.
 */
export const useOwnerAccounts = (): OwnerAccounts => {
  const { address, family, wallet } = useWallet();
  const { api } = useIntentsConnect();
  const publicKey = wallet?.getPublicKey?.();
  const override = debugOwner();

  const intermediary = useQuery({
    queryKey: intermediaryQueryKey(address ?? '', publicKey),
    queryFn: async () =>
      (
        await api.getIntermediary(address ?? '', { publicKey })
      ).evm.toLowerCase(),
    enabled: address !== undefined && override === undefined,
    // Deterministic per wallet.
    staleTime: Infinity,
  });

  const refetch = () => {
    void intermediary.refetch();
  };

  if (override) {
    return {
      owners: [override],
      intermediary: override,
      status: 'success',
      refetch,
    };
  }

  if (!address) {
    return { owners: [], intermediary: undefined, status: 'idle', refetch };
  }

  if (intermediary.status !== 'success') {
    return {
      owners: [],
      intermediary: undefined,
      status: intermediary.status,
      refetch,
    };
  }

  const wallets = family === 'evm' ? [address.toLowerCase()] : [];

  return {
    owners: [...new Set([intermediary.data, ...wallets])],
    intermediary: intermediary.data,
    status: 'success',
    refetch,
  };
};
