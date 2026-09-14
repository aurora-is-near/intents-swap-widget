import * as guards from '@/machine/guards';
import type { Execution } from '@/types/execution';

/** Solana reports the bridge guarantee before its separate fee; EVM reports net. */
export const getQuoteSpendable = (execution: Execution): string => {
  const networkFee = guards.feeMustBeEstimated(execution);
  const minimum = execution.quote.minAmountOut;

  if (execution.type !== 'solana') {
    return minimum;
  }

  guards.amountMustExceedFee(minimum, networkFee);

  return (BigInt(minimum) - BigInt(networkFee)).toString();
};
