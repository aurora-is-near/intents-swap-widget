import { failGuard } from '@/errors';
import type { Step } from '@/types/execution';

/**
 * At least one step must call the destination token contract.
 *
 * The network fee is collected in the destination token via a fee-transfer step
 * the backend appends, so a step set that never engages that token is rejected.
 * Native destinations are exempt — the fee is taken in native value.
 *
 * When the real steps genuinely never touch the payout token, satisfy this by
 * appending a zero-value transfer of it to the intermediary.
 */
export const destinationTokenIsTouched = (
  steps: Step[],
  destinationTokenAddress?: string,
) => {
  if (!destinationTokenAddress) {
    return;
  }

  const target = destinationTokenAddress.toLowerCase();
  const touched = steps.some((step) => step.to.toLowerCase() === target);

  if (!touched) {
    failGuard(
      'DESTINATION_TOKEN_UNTOUCHED',
      `steps must include at least one call to destination token ${destinationTokenAddress}`,
    );
  }
};
