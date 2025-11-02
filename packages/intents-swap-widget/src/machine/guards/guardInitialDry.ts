import { isBalanceSufficient } from './checks/isBalanceSufficient';
import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';
import type { Context, InitialDryContext } from '@/machine/context';

export const guardInitialDry = (ctx: Context): ctx is InitialDryContext => {
  return (
    !ctx.quote &&
    ctx.quoteStatus === 'idle' &&
    ctx.transferStatus.status === 'idle' &&
    (!ctx.sourceToken ||
      !ctx.targetToken ||
      !isNotEmptyAmount(ctx.sourceTokenAmount) ||
      (!!ctx.walletAddress && !isBalanceSufficient(ctx)))
  );
};
