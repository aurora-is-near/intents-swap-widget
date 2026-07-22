import { QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript';

/**
 * App fees are always charged on the input token, but how they relate to the
 * quoted `amountIn` depends on the swap type:
 *
 * - EXACT_INPUT / FLEX_INPUT — the fee is taken out of the deposited amount,
 *   so `amountIn` is gross and the fee is `amountIn * bps / 10_000`.
 *   https://docs.near-intents.org/integration/distribution-channels/1click-api/fee-config#exact_in
 *   https://docs.near-intents.org/integration/distribution-channels/1click-api/fee-config#flex_input
 *
 * - EXACT_OUTPUT — the required input is grossed up to cover the fee
 *   (`amountIn = netIn * (1 + bps / 10_000)`), so the fee is the difference:
 *   `amountIn * bps / (10_000 + bps)`.
 *   https://docs.near-intents.org/integration/distribution-channels/1click-api/fee-config#exact_out
 *
 * `amount` is any amount denominated in the input token — token units or their
 * USD value — and the result comes back in the same denomination. An unknown
 * swap type falls back to the input-side formula, which is what all quotes but
 * EXACT_OUTPUT use. Returns null when there is no fee to charge, so callers can
 * omit the row.
 *
 * Accepts a readonly array so it can be fed a valtio snapshot of the quote.
 */
export const getAppFeesAmount = ({
  appFees,
  amount,
  swapType,
}: {
  appFees: readonly { fee: number }[] | undefined;
  amount: number;
  swapType: QuoteRequest.swapType | undefined;
}): number | null => {
  if (!appFees?.length || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const totalBps = appFees.reduce((sum, { fee }) => sum + fee, 0);

  if (totalBps <= 0) {
    return null;
  }

  return swapType === QuoteRequest.swapType.EXACT_OUTPUT
    ? (amount * totalBps) / (10_000 + totalBps)
    : (amount * totalBps) / 10_000;
};
