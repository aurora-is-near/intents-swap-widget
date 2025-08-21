import { useEffect } from 'react';

import { useWalletBalance } from '@/hooks/useWalletBalance';
import { useAlchemyBalanceIntegration } from '@/ext/alchemy';

import { fireEvent } from '@/machine';
import { guardStates } from '@/machine/guards';
import { useUnsafeSnapshot } from '@/machine/snap';

import type { ListenerProps } from './types';

export type Props = ListenerProps & {
  alchemyApiKey: string | undefined;
};

export const useAlchemyBalanceEffect = ({
  isEnabled,
  alchemyApiKey,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { setWalletBalance } = useWalletBalance(ctx.walletAddress);
  const { balances: alchemyBalances } = useAlchemyBalanceIntegration({
    walletAddress: ctx.walletAddress,
    alchemyApiKey: alchemyApiKey ?? '',
  });

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const validState = guardStates(ctx, ['initial_wallet']);

    if (validState) {
      setWalletBalance(ctx.walletAddress, alchemyBalances);

      if (
        ctx.sourceToken &&
        Object.keys(alchemyBalances).includes(ctx.sourceToken.assetId)
      ) {
        fireEvent('tokenSetBalance', alchemyBalances[ctx.sourceToken.assetId]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, alchemyBalances, ctx.walletAddress]);
};
