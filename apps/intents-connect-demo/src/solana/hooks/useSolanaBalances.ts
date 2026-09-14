import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIntentsConnect } from '@aurora-is-near/intents-connect/react';
import type { Phase } from '@aurora-is-near/intents-connect';

import { API_URL } from '../../shared/config';
import { SOLANA_RPC_URL } from '../config';
import { getSolanaConnection } from '../client';
import { fetchSolanaBalances } from '../balances';

export const useSolanaBalances = (phase: Phase) => {
  const { api, wallet } = useIntentsConnect();
  const address = wallet?.getAddress();
  const standard = wallet?.signingStandard;
  const query = useQuery({
    queryKey: [
      'solana-connect-balances',
      API_URL,
      SOLANA_RPC_URL,
      standard,
      address,
    ],
    enabled: !!address,
    queryFn: async () => {
      if (!address) {
        throw new Error('Connect a wallet to see its Solana account');
      }

      const { solana } = await api.getIntermediary(address, {
        publicKey: wallet?.getPublicKey?.(),
      });

      if (!solana) {
        throw new Error(
          'Solana accounts are unavailable on this Connect deployment',
        );
      }

      return {
        intermediary: solana,
        balances: await fetchSolanaBalances(getSolanaConnection(), solana),
      };
    },
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { refetch } = query;

  useEffect(() => {
    if (!address || !['success', 'failed', 'cancelled'].includes(phase)) {
      return;
    }

    void refetch();
    const timer = setTimeout(() => {
      void refetch();
    }, 4000);

    return () => clearTimeout(timer);
  }, [address, standard, phase, refetch]);

  return { ...query, address };
};
