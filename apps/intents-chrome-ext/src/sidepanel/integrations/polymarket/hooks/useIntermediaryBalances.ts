import { useEffect } from 'react';
import { getAddress } from 'viem';
import { useQuery } from '@tanstack/react-query';

import { useIntentsConnect } from '@aurora-is-near/intents-connect/react';
import type { Phase } from '@aurora-is-near/intents-connect';

import { PUSD, USDC } from '../constants';
import { ERC20_BALANCE_ABI, polygonPublic } from '../plan';

const SETTLED: readonly Phase[] = ['success', 'failed', 'cancelled'];

const readBalance = (token: string, owner: `0x${string}`) =>
  polygonPublic.readContract({
    address: getAddress(token),
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [owner],
  });

/**
 * The wallet's Intents Connect account on Polygon (the intermediary that runs
 * the deposit steps) and what it holds of the two assets the Polymarket
 * recipe touches. Normally zero — anything here is a leftover from a failed
 * or partial execution.
 */
export const useIntermediaryBalances = (phase: Phase) => {
  const { api, wallet } = useIntentsConnect();
  const address = wallet?.getAddress();

  const query = useQuery({
    queryKey: ['intermediary-polygon-balances', address?.toLowerCase()],
    enabled: !!address,
    queryFn: async () => {
      if (!address) {
        throw new Error('No wallet connected');
      }

      const { evm } = await api.getIntermediary(address);
      const owner = getAddress(evm);
      const [usdc, pusd] = await Promise.all([
        readBalance(USDC, owner),
        readBalance(PUSD, owner),
      ]);

      return { address: owner, usdc: usdc.toString(), pusd: pusd.toString() };
    },
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { refetch } = query;
  const isSettled = SETTLED.includes(phase);

  // A public node can lag the service's settlement by a beat.
  useEffect(() => {
    if (!isSettled || !address) {
      return;
    }

    void refetch();
    const timer = setTimeout(() => {
      void refetch();
    }, 4000);

    return () => clearTimeout(timer);
  }, [isSettled, address, refetch]);

  return query;
};
