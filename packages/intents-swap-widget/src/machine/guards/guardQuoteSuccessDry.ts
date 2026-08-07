import { isDryQuote } from './checks/isDryQuote';
import type { Context, QuoteSuccessDryContext } from '@/machine/context';

export const guardQuoteSuccessDry = (
  ctx: Context,
): ctx is QuoteSuccessDryContext => {
  return (
    !!ctx.quote &&
    ctx.quoteStatus === 'success' &&
    ctx.transferStatus.status === 'idle' &&
    isDryQuote(ctx) &&
    !!ctx.sourceToken &&
    !!ctx.targetToken
  );
};
