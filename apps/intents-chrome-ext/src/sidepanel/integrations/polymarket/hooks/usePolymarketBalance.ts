import { useEffect } from 'react';
import { getAddress } from 'viem';
import { useQuery } from '@tanstack/react-query';

import type { Phase } from '@aurora-is-near/intents-connect';

import { PUSD } from '../constants';
import { ERC20_BALANCE_ABI, polygonPublic } from '../plan';
import { isPolygonAddress } from './usePolymarketAccount';

/** The Polymarket account's pUSD — what a successful deposit increases. */
export const usePolymarketBalance = (account: string, phase: Phase) => {
  const isValid = isPolygonAddress(account);

  const query = useQuery({
    queryKey: ['polymarket-pusd', account.toLowerCase()],
    queryFn: () =>
      polygonPublic.readContract({
        address: getAddress(PUSD),
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [getAddress(account)],
      }),
    enabled: isValid,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { refetch } = query;

  useEffect(() => {
    if (phase !== 'success' || !isValid) {
      return;
    }

    void refetch();
    const timer = setTimeout(() => {
      void refetch();
    }, 4000);

    return () => clearTimeout(timer);
  }, [phase, isValid, refetch]);

  return query;
};
