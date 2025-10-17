import type { DeepReadonly } from '@/types/utils';

import type { Context } from '../context';

export const getIsDirectNonNearWithdrawal = (
  ctx: DeepReadonly<Context>,
): boolean => {
  return !!(
    ctx.sourceToken?.isIntent &&
    ctx.sourceToken?.blockchain !== 'near' &&
    ctx.sourceToken?.assetId === ctx.targetToken?.assetId
  );
};
