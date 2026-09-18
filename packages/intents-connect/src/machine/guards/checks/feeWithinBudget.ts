import { failGuard } from '@/errors';

/**
 * Steps-only executions: the fee measured by the dry round is what the
 * spendable amount was sized against (or what the caller capped it at). A
 * real create reporting MORE would either overdraw the transferred token or
 * eat the whole swap output, so it must not be signed.
 *
 * An equal or lower fee is fine — the difference stays at the intermediary.
 */
export const feeWithinBudget = (networkFee: string, budget: string) => {
  if (BigInt(networkFee) > BigInt(budget)) {
    failGuard(
      'FEE_EXCEEDS_AMOUNT',
      `network fee (${networkFee}) exceeds the budget the steps were sized for (${budget})`,
    );
  }
};
