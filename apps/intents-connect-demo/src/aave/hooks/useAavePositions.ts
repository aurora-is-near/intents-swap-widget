import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useIntentsConnectWallet } from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import type { Phase } from '@aurora-is-near/intents-connect';

import { fetchAavePositions } from '../positions';

export const useAavePositions = (phase: Phase) => {
  const { address, family } = useIntentsConnectWallet();
  const isEvm = family === 'evm';
  const enabled = isEvm && !!address;

  const query = useQuery({
    queryKey: ['aave-monad-positions', address],
    queryFn: () => fetchAavePositions(address as string),
    enabled,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { refetch } = query;

  // Use the tab's runner phase. Another useExecution() would create an idle
  // runner. Guard manual refetch too: it bypasses React Query's enabled flag.
  useEffect(() => {
    if (phase !== 'success' || !enabled) {
      return;
    }

    void refetch();
    const timer = setTimeout(() => {
      void refetch();
    }, 4000);

    return () => clearTimeout(timer);
  }, [phase, enabled, address, refetch]);

  return { ...query, isEvm, address };
};
