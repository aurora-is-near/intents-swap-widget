import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ListenerProps } from './types';
import { useConfig } from '../../config';
import { guardStates } from '@/machine';
import { useAlchemyBalanceIntegration } from '@/ext/alchemy';
import { useIntentsBalance } from '@/hooks/useIntentsBalance';

import { useUnsafeSnapshot } from '@/machine/snap';

export type Props = ListenerProps & {
  alchemyApiKey: string | undefined;
};

export const useBalancesUpdateEffect = ({
  isEnabled,
  alchemyApiKey,
}: Props) => {
  const { connectedWallets } = useConfig();
  const { ctx } = useUnsafeSnapshot();
  const queryClient = useQueryClient();

  const { refetch: refetchIntentsBalances } = useIntentsBalance();
  const { refetch: refetchAlchemyBalances } = useAlchemyBalanceIntegration({
    isEnabled: false, // Don't enable Alchemy integration here, only use refetch
    connectedWallets,
    alchemyApiKey: alchemyApiKey ?? '',
  });

  useEffect(() => {
    const isValidState = guardStates(ctx, ['transfer_success']);

    if (!isEnabled || !isValidState) {
      return;
    }

    void (async () => {
      await refetchIntentsBalances();

      if (alchemyApiKey) {
        await new Promise((resolve) => {
          setTimeout(resolve, 10_000);
        });

        await refetchAlchemyBalances();
      }

      // Balances loaded with RPCs
      await queryClient.invalidateQueries({ queryKey: ['tokenBalance'] });
    })();
  }, [ctx.state, isEnabled, alchemyApiKey]);
};
