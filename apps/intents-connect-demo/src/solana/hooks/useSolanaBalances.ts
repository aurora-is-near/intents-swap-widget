import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIntentsConnect } from '@aurora-is-near/intents-connect/react';
import type { Phase } from '@aurora-is-near/intents-connect';

import { API_URL } from '../../shared/config';
import { SOLANA_RPC_URL } from '../config';
import { getSolanaConnection } from '../client';
import { fetchSolanaBalances } from '../balances';

const SETTLED: readonly Phase[] = ['success', 'failed', 'cancelled'];

/**
 * The Connect account's ORCA / KMNO / USDC balances. Refetched right after —
 * and four seconds after — any of the given execution phases settles, so a
 * purchase, a sale or a withdrawal shows up without a manual refresh.
 */
export const useSolanaBalances = (...phases: Phase[]) => {
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
  // Changes only when a phase enters, leaves or changes its settled state, so
  // the intermediate phases of a running flow do not each trigger a refetch.
  const settledKey = phases
    .map((phase) => (SETTLED.includes(phase) ? phase : ''))
    .join();

  useEffect(() => {
    if (!address || !phases.some((phase) => SETTLED.includes(phase))) {
      return;
    }

    void refetch();
    const timer = setTimeout(() => {
      void refetch();
    }, 4000);

    return () => clearTimeout(timer);
    // `phases` is a fresh array per render; `settledKey` is its identity.
  }, [address, standard, settledKey, refetch]);

  return { ...query, address };
};
