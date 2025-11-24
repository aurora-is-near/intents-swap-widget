import type { Context } from '../context';
import type { DeepReadonly } from '@/types/utils';

export const getIsSameAssetDiffChainWithdrawal = (
  ctx: DeepReadonly<Context>,
): boolean => {
  return !!(
    ctx.sourceToken &&
    ctx.targetToken &&
    ctx.sourceToken.isIntent &&
    ctx.targetToken.symbol === ctx.sourceToken.symbol &&
    ctx.sourceToken.assetId !== ctx.targetToken.assetId &&
    !['near', 'wnear'].includes(ctx.sourceToken.symbol.toLowerCase())
  );
};
