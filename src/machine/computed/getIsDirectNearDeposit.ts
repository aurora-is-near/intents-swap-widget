import type { DeepReadonly } from '@/types/utils';

import type { Context } from '../context';

export const getIsDirectNearDeposit = (ctx: DeepReadonly<Context>): boolean => {
  return !!(
    ctx.sourceToken &&
    ctx.targetToken &&
    !ctx.sourceToken.isIntent &&
    ctx.targetToken.assetId === ctx.sourceToken.assetId &&
    ctx.targetToken.blockchain === 'near'
  );
};
