import type { DeepReadonly } from '@/types/utils';

import type { Context } from '../context';

export const getIsParticipateWidget = (ctx: DeepReadonly<Context>): boolean => {
  return !!(
    ctx.sendAddress &&
    ctx.sendAddress.includes('lp') &&
    ctx.sendAddress.includes('sale-factory') &&
    ctx.sendAddress?.includes('.near')
  );
};
