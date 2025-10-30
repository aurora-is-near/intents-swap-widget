import type { Context } from '../context';
import type { DeepReadonly } from '@/types/utils';

export const getIsNearToIntentsSameAssetTransfer = (
  ctx: DeepReadonly<Context>,
): boolean => {
  return !!(
    ctx.targetToken &&
    ctx.sourceToken &&
    ctx.targetToken.isIntent &&
    ctx.targetToken.blockchain === 'near' &&
    ctx.sourceToken.assetId === ctx.targetToken.assetId
  );
};
