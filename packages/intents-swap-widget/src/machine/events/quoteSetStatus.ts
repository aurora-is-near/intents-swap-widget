import type { QueryStatus } from '@tanstack/react-query';

import type { Context } from '@/machine/context';
import { isQuoteError } from '@/machine/errors';

export type QuoteSetStatusPayload = QueryStatus | 'idle';

export const quoteSetStatus = (
  ctx: Context,
  payload: QuoteSetStatusPayload,
): void => {
  ctx.quoteStatus = payload;

  // A quote that succeeds clears the failure of the one before it. Quote
  // errors survive input validation, and a dry quote clears no error itself.
  if (payload === 'success' && ctx.error && isQuoteError(ctx.error)) {
    ctx.error = null;
  }
};
