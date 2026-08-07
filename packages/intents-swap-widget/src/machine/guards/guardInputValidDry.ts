import { isDryQuote } from './checks/isDryQuote';
import type { Context, InputValidDryContext } from '@/machine/context';

export const guardInputValidDry = (
  ctx: Context,
): ctx is InputValidDryContext => {
  return (
    !ctx.quote &&
    ctx.quoteStatus !== 'success' &&
    ctx.transferStatus.status === 'idle' &&
    isDryQuote(ctx) &&
    !!ctx.sourceToken &&
    !!ctx.targetToken
  );
};
