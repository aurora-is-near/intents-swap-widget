import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';

import type { Context, QuoteSuccessDryContext } from '@/machine/context';

export const guardQuoteSuccessDry = (
  ctx: Context,
): ctx is QuoteSuccessDryContext => {
  return (
    !!ctx.quote &&
    ctx.quoteStatus === 'success' &&
    ctx.transferStatus.status === 'idle' &&
    !ctx.sendAddress &&
    !!ctx.sourceToken &&
    !!ctx.targetToken &&
    isNotEmptyAmount(ctx.sourceTokenAmount)
  );
};
