import type { Context } from '../context';
import type { DeepReadonly } from '@/types/utils';

export const getIsDirectTransfer = (ctx: DeepReadonly<Context>): boolean => {
  return !!(
    ctx.sourceToken &&
    ctx.targetToken &&
    ctx.sourceToken.isIntent &&
    ctx.targetToken.symbol === ctx.sourceToken.symbol &&
    ctx.targetToken.blockchain === 'near'
  );
};
