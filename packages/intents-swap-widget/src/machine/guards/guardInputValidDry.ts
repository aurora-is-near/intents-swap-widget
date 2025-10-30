import { isBalanceSufficient } from './checks/isBalanceSufficient';
import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';
import type { Context, InputValidDryContext } from '@/machine/context';

export const guardInputValidDry = (
  ctx: Context,
): ctx is InputValidDryContext => {
  return (
    !ctx.quote &&
    ctx.quoteStatus !== 'success' &&
    ctx.transferStatus.status === 'idle' &&
    (!ctx.walletAddress ||
      (!!ctx.walletAddress && !isBalanceSufficient(ctx))) &&
    !!ctx.sourceToken &&
    !!ctx.targetToken &&
    isNotEmptyAmount(ctx.sourceTokenAmount)
  );
};
