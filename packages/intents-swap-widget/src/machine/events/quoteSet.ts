import { Quote } from '@/types/quote';

import type { Context } from '@/machine/context';

export type QuoteSetPayload = Quote | undefined;

export const quoteSet = (ctx: Context, payload: QuoteSetPayload): void => {
  ctx.quote = payload;
};
