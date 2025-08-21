import type { Context, QuoteSuccessInternalContext } from '@/machine/context';

import { isBalanceSufficient } from './checks/isBalanceSufficient';

export const guardQuoteSuccessInternal = (
  ctx: Context,
): ctx is QuoteSuccessInternalContext => {
  return (
    !!ctx.quote &&
    ctx.quoteStatus === 'success' &&
    !ctx.sendAddress &&
    !!ctx.walletAddress &&
    !!ctx.sourceToken &&
    !!ctx.targetToken &&
    (ctx.transferStatus.status === 'pending' ||
      ctx.transferStatus.status === 'idle' ||
      ctx.transferStatus.status === 'error') &&
    isBalanceSufficient(ctx)
  );
};
