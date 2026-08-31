import { useEffect } from 'react';
import { getAddress } from 'viem';
import { useQuery } from '@tanstack/react-query';

import { isValidChainAddress } from '@aurora-is-near/intents-swap-widget';
import type { Phase } from '@aurora-is-near/intents-connect';

import { PUSD } from '../constants';
import { ERC20_BALANCE_ABI, polygonPublic } from '../plan';

/** `null` means the chain is unknown to the validator, which is not a pass. */
export const isPolygonAddress = (address: string) =>
  isValidChainAddress('pol', address) === true;

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

  // The service reports success as soon as the operation settles, which can be
  // a beat before the transfer is readable on a public node.
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

  return { ...query, isValid };
};
