import { isTargetAmountChanged } from './isTargetAmountChanged';
import { logger } from '@/logger';

import type { Context, ContextChange } from '@/machine/context';

export const isAmountChangedFromQuote = (
  ctx: Context,
  changes: ContextChange[],
  debug: boolean,
) => {
  if (!ctx.quote || ctx.quote.type === 'QUOTE_DEPOSIT_ANY_AMOUNT') {
    return false;
  }

  if (isTargetAmountChanged(ctx, changes)) {
    const newTargetAmount = changes.find(
      (change) => change?.key === 'targetTokenAmount',
    );

    if (
      ctx.quote &&
      newTargetAmount &&
      ctx.quote.amountOut === newTargetAmount.value
    ) {
      if (debug) {
        logger.debug(`[WIDGET] Quote fetched. Current content is:`, ctx);
      }

      return true;
    }
  }

  return false;
};
