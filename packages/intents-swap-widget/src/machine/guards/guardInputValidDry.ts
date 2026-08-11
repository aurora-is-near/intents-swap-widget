import type { Context, InputValidDryContext } from '@/machine/context';
import { isDryQuote } from './checks/isDryQuote';

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
