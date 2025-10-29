import type { Context } from '@/machine/context';

export const isQuoteIdle = (ctx: Context) => ctx.quoteStatus === 'idle';
