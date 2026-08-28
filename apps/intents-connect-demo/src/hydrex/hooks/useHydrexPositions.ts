import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useIntentsConnectWallet } from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import type { Phase } from '@aurora-is-near/intents-connect';

import { fetchHydrexPositions } from '../positions';

/**
 * `phase` is passed in rather than read from `useExecution()` here: a runner is
 * built per hook call, so calling it again would yield a second runner stuck at
 * idle and the refetch below would never fire.
 */
export const useHydrexPositions = (phase: Phase) => {
  const { address, family } = useIntentsConnectWallet();

  const query = useQuery({
    queryKey: ['hydrex-positions', address],
    // Guarded by `enabled` — the query never runs without an EVM address.
    queryFn: () => fetchHydrexPositions(address as string),
    // A Solana address is not an EVM address and would fail to abi-encode.
    enabled: family === 'evm' && !!address,
    staleTime: 30_000,
    // The widget's shared client retries 3 times; against a public RPC that
    // turns one rate-limited load into four.
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { refetch } = query;

  // The service reports success as soon as the operation settles, which can be
  // a beat before the mint is readable at the block this query pins to.
  useEffect(() => {
    if (phase !== 'success') {
      return;
    }

    void refetch();
    const timer = setTimeout(() => {
      void refetch();
    }, 4000);

    return () => clearTimeout(timer);
  }, [phase, refetch]);

  return { ...query, isEvm: family === 'evm', address };
};
