import { useEffect } from 'react';

import type { ListenerProps } from './types';
import { useMergedBalance } from '@/hooks/useMergedBalance';
import { getTokenBalanceKey } from '@/utils/intents/getTokenBalanceKey';

import { fireEvent } from '@/machine';
import { useUnsafeSnapshot } from '@/machine/snap';

export const useSetTokenBalanceEffect = ({ isEnabled }: ListenerProps) => {
  const { ctx } = useUnsafeSnapshot();

  const { mergedBalance } = useMergedBalance();

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    if (!ctx.sourceToken || !ctx.walletAddress) {
      fireEvent('tokenSetBalance', undefined);

      return;
    }

    const tokenBalanceKey = getTokenBalanceKey(ctx.sourceToken);

    fireEvent('tokenSetBalance', mergedBalance[tokenBalanceKey]);
  }, [mergedBalance, ctx.sourceToken]);
};
