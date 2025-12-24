import { useMemo } from 'react';

import { guardStates } from '@/machine/guards';
import { useUnsafeSnapshot } from '@/machine/snap';

export const useSummaryItemsCount = (hasIntentHash: boolean) => {
  const { ctx } = useUnsafeSnapshot();
  const isValidState = guardStates(ctx, ['transfer_success']);

  const summaryItemsCount = useMemo(() => {
    let count = 1;

    if (!isValidState) {
      return 0;
    }

    if (ctx.sourceToken.symbol !== ctx.targetToken.symbol) {
      count += 1;
    }

    if (ctx.sendAddress) {
      count += 1;
    }

    if (hasIntentHash) {
      count += 1;
    }

    return count;
  }, [hasIntentHash, ctx.sendAddress, ctx.sourceToken, ctx.targetToken]);

  return summaryItemsCount;
};
