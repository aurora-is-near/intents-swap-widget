import type { Context } from '../context';
import type { DeepReadonly } from '@/types/utils';

export const getIsDirectNearDeposit = (ctx: DeepReadonly<Context>): boolean => {
  return !!(
    ctx.sourceToken &&
    ctx.targetToken &&
    !ctx.sourceToken.isIntent &&
    ctx.targetToken.assetId === ctx.sourceToken.assetId &&
    ctx.targetToken.blockchain === 'near'
  );
};
