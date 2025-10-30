import type { Context } from '../context';
import type { DeepReadonly } from '@/types/utils';

export const getIsDirectNonNearWithdrawal = (
  ctx: DeepReadonly<Context>,
): boolean => {
  return !!(
    ctx.sourceToken?.isIntent &&
    !ctx.targetToken?.isIntent &&
    ctx.sourceToken?.blockchain !== 'near' &&
    ctx.sourceToken?.assetId === ctx.targetToken?.assetId
  );
};
