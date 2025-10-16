import { notReachable } from '@/utils/notReachable';

import type { Context } from '@/machine/context';
import { isQuoteError } from '@/machine/errors';

export type TokenSetAmountPayload = {
  variant: 'source' | 'target';
  amount: string;
};

export const tokenSetAmount = (
  ctx: Context,
  payload: TokenSetAmountPayload,
): void => {
  const { variant, amount } = payload;

  switch (variant) {
    case 'source':
      ctx.sourceTokenAmount = amount;
      ctx.quoteStatus = 'idle';
      if (ctx.error && isQuoteError(ctx.error)) {
        ctx.error = null;
      }
      break;
    case 'target':
      ctx.targetTokenAmount = amount;
      ctx.quoteStatus = 'idle';
      break;
    default:
      notReachable(variant, { throwError: false });
  }
};
