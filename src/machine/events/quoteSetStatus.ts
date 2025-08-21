import type { QueryStatus } from '@tanstack/react-query';

import type { Context } from '@/machine/context';

export type QuoteSetStatusPayload = QueryStatus | 'idle';

export const quoteSetStatus = (
  ctx: Context,
  payload: QuoteSetStatusPayload,
): void => {
  ctx.quoteStatus = payload;
};
