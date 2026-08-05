import { moveTo } from '@/machine';
import { guardStates } from '@/machine/guards';
import type { Context } from '@/machine/context';

import { fireEvent } from './utils/fireEvent';

export const retryExternalDeposit = (ctx: Context): void => {
  // Read before the events land - `quoteReset` takes the quote that decides
  // which of the two states this belongs to away with it.
  const isInternalQuote = guardStates(ctx, ['quote_success_internal']);

  fireEvent('externalDepositTxSet', undefined);
  fireEvent('transferSetStatus', { status: 'idle' });
  fireEvent('quoteReset', null);
  fireEvent('errorSet', null);

  moveTo(isInternalQuote ? 'input_valid_internal' : 'input_valid_external');
};
