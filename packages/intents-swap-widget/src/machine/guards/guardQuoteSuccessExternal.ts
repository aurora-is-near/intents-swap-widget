import { isBalanceSufficient } from './checks/isBalanceSufficient';
import type { Context, QuoteSuccessExternalContext } from '@/machine/context';

export const guardQuoteSuccessExternal = (
  ctx: Context,
): ctx is QuoteSuccessExternalContext => {
  return (
    !!ctx.quote &&
    ctx.quoteStatus === 'success' &&
    !!ctx.sendAddress &&
    !!ctx.walletAddress &&
    !!ctx.sourceToken &&
    !!ctx.targetToken &&
    (ctx.transferStatus.status === 'pending' ||
      ctx.transferStatus.status === 'idle' ||
      ctx.transferStatus.status === 'error') &&
    (isBalanceSufficient(ctx) || ctx.isDepositFromExternalWallet)
  );
};
