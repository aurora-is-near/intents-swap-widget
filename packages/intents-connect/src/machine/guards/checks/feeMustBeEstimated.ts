import { failGuard } from '@/errors';
import type { Execution } from '@/types/execution';

/**
 * An absent `details.networkFee` means gas estimation failed, so nothing was
 * carved and the response amounts are still GROSS. Copying them forward bakes
 * an amount the batch cannot cover once the fee step is appended.
 *
 * The correct response is to retry the round, never to proceed.
 */
export const feeMustBeEstimated = (execution: Execution): string => {
  const fee = execution.details.networkFee;

  if (!fee) {
    return failGuard(
      'FEE_NOT_ESTIMATED',
      'no details.networkFee returned — gas estimation failed; retry the round',
    );
  }

  return fee;
};
