import type {
  Execution,
  ExecutionPlan,
  ExecutionPreview,
} from '@aurora-is-near/intents-connect';

import { loanFigures } from '../model/loanFigures';
import { type BorrowPlanInput, buildBorrowPlan } from './plan';
import type { BorrowParams } from './recipe';

/**
 * The dry run of a borrow, in two passes, because the borrow amount is a
 * literal in the steps and depends on the quote.
 *
 * What the dry run reports (`Execution`, `packages/intents-connect/src/types/
 * execution.ts`; `runner/flows/preview.ts` returns it untouched as
 * `ExecutionPreview.execution`), on an EVM bridge-in:
 * - `details.networkFee`: the service's fee, as the service sizes it, in the
 *   DESTINATION token's atomic units, which is the collateral. The service
 *   debits it with a step it appends; absent means gas estimation failed.
 * - `quote.amountOut`: the collateral expected to arrive, net of that fee.
 * - `quote.minAmountOut`: the least collateral that will arrive, net of that
 *   fee: what `{MIN_AMOUNT_OUT}` resolves to, so what is supplied.
 * Both quote figures are net only when `networkFee` is present; without it
 * they are gross and would overstate the collateral (Intents Connect docs,
 * "EVM steps: Aave supply", round 2).
 *
 * `useQuotePreview` does not help with the first pass: it is a debounced,
 * refreshing `preview()` of a finished plan, so it still needs a borrow
 * amount to build the steps with.
 */

/** `useExecution().preview`, narrowed to a borrow plan. */
export type PreviewBorrowPlan = (
  plan: ExecutionPlan<BorrowParams>,
) => Promise<ExecutionPreview<BorrowParams>>;

export type BorrowPreviewErrorReason =
  /** The dry run has no `networkFee`: its amounts are gross. */
  | 'feeNotEstimated'
  /** The minimum received buys no borrow at this LTV. */
  | 'nothingToBorrow'
  /**
   * The final dry run's minimum received is lower than the first's, so the
   * borrow sized on the first would exceed the chosen LTV.
   */
  | 'quoteMoved';

/** A dry run a borrow can't be confirmed from. */
export class BorrowPreviewError extends Error {
  readonly reason: BorrowPreviewErrorReason;

  constructor(reason: BorrowPreviewErrorReason, message: string) {
    super(message);
    this.name = 'BorrowPreviewError';
    this.reason = reason;
  }
}

export type PreviewBorrowInput = Omit<BorrowPlanInput, 'borrowAmount'> & {
  /** `useExecution().preview`. */
  preview: PreviewBorrowPlan;
  /** The slider's loan-to-value, in whole percent. */
  ltv: number;
  /**
   * The form's borrow amount, in borrow-token atomic units: the first pass
   * builds its steps with it, only to learn the minimum received.
   */
  estimatedBorrowAmount: bigint;
};

export type BorrowPreview = {
  /** The final dry run. Hand `preview.plan` to `run()` as it is. */
  preview: ExecutionPreview<BorrowParams>;
  /** What the final plan borrows, in borrow-token atomic units. */
  borrowAmount: bigint;
};

/** `quote.minAmountOut`, once the fee was carved out of it. */
const netMinAmountOut = (execution: Execution): bigint => {
  if (execution.details.networkFee === undefined) {
    throw new BorrowPreviewError(
      'feeNotEstimated',
      'The service could not estimate its fee; get a new quote',
    );
  }

  return BigInt(execution.quote.minAmountOut);
};

/**
 * 1. A dry run with the form's estimate gives the collateral's minimum
 *    received for the typed amount.
 * 2. The borrow amount is the chosen LTV of that minimum, at the market's
 *    oracle prices (`loanFigures`); a second dry run builds the final steps
 *    with it.
 * 3. The final dry run's minimum must still cover that borrow at the chosen
 *    LTV, so the real LTV is at most the chosen one. When it has moved down,
 *    the preview is refused (`quoteMoved`) rather than re-sized: a new pass
 *    could move again, and at the market's max LTV the excess would make
 *    the `borrow` step revert after the collateral has arrived.
 *
 * The second dry run's plan is returned as it is: `run()` reuses its
 * `prepared` steps verbatim.
 */
export const previewBorrow = async ({
  preview,
  ltv,
  estimatedBorrowAmount,
  ...planInput
}: PreviewBorrowInput): Promise<BorrowPreview> => {
  const borrowOn = (execution: Execution) =>
    loanFigures({
      collateralAmount: netMinAmountOut(execution),
      collateral: planInput.collateral,
      borrow: planInput.borrow,
      ltv,
      // The minimum received is already net of the service's fee.
      feeBps: 0,
    }).borrowAmount;

  const first = await preview(
    buildBorrowPlan({ ...planInput, borrowAmount: estimatedBorrowAmount }),
  );

  const borrowAmount = borrowOn(first.execution);

  if (borrowAmount <= 0n) {
    throw new BorrowPreviewError(
      'nothingToBorrow',
      'The collateral received is too small to borrow against',
    );
  }

  const final = await preview(buildBorrowPlan({ ...planInput, borrowAmount }));

  if (borrowOn(final.execution) < borrowAmount) {
    throw new BorrowPreviewError(
      'quoteMoved',
      'The quote moved while preparing the loan; get a new quote',
    );
  }

  return { preview: final, borrowAmount };
};
