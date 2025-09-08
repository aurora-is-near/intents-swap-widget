import type { DeepReadonly } from '@/types/utils';

import type { Context } from '../context';

export const getIsNearToIntentsSameAssetTransfer = (
  ctx: DeepReadonly<Context>,
): boolean => {
  return !!(
    ctx.targetToken &&
    ctx.sourceToken &&
    ctx.targetToken.isIntent &&
    ctx.sourceToken.assetId === ctx.targetToken.assetId
  );
};
