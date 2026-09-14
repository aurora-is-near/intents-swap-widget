import { failGuard } from '@/errors';
import * as guards from '@/machine/guards';
import type { Execution } from '@/types/execution';
import { getQuoteSpendable } from '@/runner/quoteAmounts';

/** Used by preview, real create, and an unsigned resume. Always compare net amounts. */
export const validatePreparedExecution = (
  execution: Execution,
  bakedAmount?: string,
) => {
  const recorded = execution.metadata?.intentsConnectSpendable;
  const amount =
    bakedAmount ?? (typeof recorded === 'string' ? recorded : undefined);

  if (execution.type === 'solana' && !amount) {
    failGuard(
      'QUOTE_MOVED',
      'Missing prepared Solana spendable amount; cancel and prepare a new execution',
    );
  }

  if (amount) {
    guards.quoteMustNotHaveMoved(amount, getQuoteSpendable(execution));
  }
};
