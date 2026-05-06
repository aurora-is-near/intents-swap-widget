import type { DeepReadonly } from '@/types/utils';
import type { Context } from '../context';

export const getIsDirectNearTokenWithdrawal = (
  ctx: DeepReadonly<Context>,
): boolean => {
  return !!(
    ctx.sourceToken &&
    ctx.targetToken &&
    ctx.sourceToken.isIntent &&
    !ctx.targetToken.isIntent &&
    ctx.targetToken.symbol === ctx.sourceToken.symbol &&
    ctx.targetToken.blockchain === 'near' &&
    ctx.sourceToken.blockchain === 'near'
  );
};
