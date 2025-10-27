import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';
import type { Context, QuoteSuccessDryContext } from '@/machine/context';
import { isBalanceSufficient } from './checks/isBalanceSufficient';

export const guardQuoteSuccessDry = (
  ctx: Context,
): ctx is QuoteSuccessDryContext => {
  return (
    !!ctx.quote &&
    ctx.quoteStatus === 'success' &&
    ctx.transferStatus.status === 'idle' &&
    (!ctx.walletAddress ||
      (!!ctx.walletAddress && !isBalanceSufficient(ctx))) &&
    !!ctx.sourceToken &&
    !!ctx.targetToken &&
    isNotEmptyAmount(ctx.sourceTokenAmount)
  );
};
