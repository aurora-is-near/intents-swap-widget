import type { Context } from '@/machine/context';

export const quoteReset = (ctx: Context): void => {
  ctx.quote = undefined;
  ctx.quoteStatus = 'idle';

  // emulate amount change to trigger a new quote
  const previousSourceAmount = ctx.sourceTokenAmount;

  ctx.sourceTokenAmount = '';
  ctx.sourceTokenAmount = previousSourceAmount;
};
