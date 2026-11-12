import type { Context } from '@/machine/context';
import type { ErrorType } from '@/machine/errors';

import { quoteSetStatus } from './quoteSetStatus';

const ctxWith = (error: ErrorType | null) =>
  ({ quoteStatus: 'pending', error }) as unknown as Context;

describe('quoteSetStatus', () => {
  it('clears the failure of the quote before once a quote succeeds', () => {
    const ctx = ctxWith({ code: 'QUOTE_PAIR_NOT_AVAILABLE' });

    quoteSetStatus(ctx, 'success');

    expect(ctx.quoteStatus).toBe('success');
    expect(ctx.error).toBeNull();
  });

  it('keeps an error that is not about the quote', () => {
    const ctx = ctxWith({ code: 'SOURCE_BALANCE_INSUFFICIENT' });

    quoteSetStatus(ctx, 'success');

    expect(ctx.error).toEqual({ code: 'SOURCE_BALANCE_INSUFFICIENT' });
  });

  it('keeps a quote error while the quote is not a success', () => {
    const ctx = ctxWith({ code: 'QUOTE_PAIR_NOT_AVAILABLE' });

    quoteSetStatus(ctx, 'pending');

    expect(ctx.error).toEqual({ code: 'QUOTE_PAIR_NOT_AVAILABLE' });
  });
});
