import type {
  Execution,
  ExecutionPlan,
  ExecutionPreview,
} from '@aurora-is-near/intents-connect';

import { BPS, ceilDiv, loanValues, ltvBps } from '../../markets/math';
import type { BorrowReserve, CollateralReserve } from '../../markets/types';
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
   * A steps-only retry found no collateral waiting at the intermediary: it
   * was spent, or the supply went through and only the borrow failed.
   */
  | 'nothingWaiting'
  /**
   * The final dry run's minimum received fell by more than
   * `QUOTE_BUFFER_BPS` from the first's, so the borrow sized on the first
   * would exceed the chosen LTV.
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

/**
 * How far the collateral received may fall between the two dry runs, in
 * basis points: the borrow is sized on the first pass's minimum less this.
 * The passes differ by design (the fee is priced from the steps' gas, the
 * steps change with the borrow amount, and 1Click quotes vary between
 * calls), so without it a 1-wei drop would refuse the loan.
 */
export const QUOTE_BUFFER_BPS = 50;

/** What a two-pass preview sizes the borrow at. */
export type BorrowSizing = {
  collateral: Pick<
    CollateralReserve,
    'decimals' | 'priceBase' | 'liquidationLtvBps' | 'maxLtvBps'
  >;
  borrow: Pick<BorrowReserve, 'decimals' | 'priceBase'>;
  /** The slider's loan-to-value, in whole percent. */
  ltv: number;
};

/** The chosen LTV of a collateral amount already net of the service's fee. */
const borrowOn = (
  { collateral, borrow, ltv }: BorrowSizing,
  collateralAmount: bigint,
) =>
  loanFigures({ collateralAmount, collateral, borrow, ltv, feeBps: 0 })
    .borrowAmount;

/**
 * The two-pass previews' tolerance, shared by `previewBorrow` and
 * `previewBorrowSteps`:
 * - `sizeBorrow`: the borrow for the first pass's net collateral, sized on it
 *   less `QUOTE_BUFFER_BPS`, so the final pass may come in a little lower.
 * - `quoteHeld`: whether the final pass's net collateral still covers that
 *   borrow at the chosen LTV, and the loan stays within the collateral's
 *   `maxLtvBps` at it. A drop larger than the buffer fails it.
 */
export const borrowTolerance = (sizing: BorrowSizing) => ({
  sizeBorrow: (firstCollateral: bigint): bigint =>
    borrowOn(
      sizing,
      firstCollateral -
        ceilDiv(firstCollateral * BigInt(QUOTE_BUFFER_BPS), BPS),
    ),
  quoteHeld: (finalCollateral: bigint, borrowAmount: bigint): boolean => {
    if (borrowOn(sizing, finalCollateral) < borrowAmount) {
      return false;
    }

    const { collateralValue, debt } = loanValues({
      collateralAmount: finalCollateral,
      collateral: sizing.collateral,
      borrowAmount,
      borrow: sizing.borrow,
    });

    const ltv = ltvBps(debt, collateralValue);

    return ltv !== null && ltv <= BigInt(sizing.collateral.maxLtvBps);
  },
});

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
 * 2. The borrow amount is the chosen LTV of that minimum less
 *    `QUOTE_BUFFER_BPS`, at the market's oracle prices (`borrowTolerance`);
 *    a second dry run builds the final steps with it.
 * 3. The final dry run's minimum must still cover that borrow at the chosen
 *    LTV (and so within the collateral's max LTV): a drop within the buffer
 *    passes, and the real LTV is at most the chosen one. A larger drop is
 *    refused (`quoteMoved`) rather than re-sized: a new pass could move
 *    again, and at the market's max LTV the excess would make the `borrow`
 *    step revert after the collateral has arrived.
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
  // The minimum received is already net of the service's fee.
  const { sizeBorrow, quoteHeld } = borrowTolerance({
    collateral: planInput.collateral,
    borrow: planInput.borrow,
    ltv,
  });

  const first = await preview(
    buildBorrowPlan({ ...planInput, borrowAmount: estimatedBorrowAmount }),
  );

  const borrowAmount = sizeBorrow(netMinAmountOut(first.execution));

  if (borrowAmount <= 0n) {
    throw new BorrowPreviewError(
      'nothingToBorrow',
      'The collateral received is too small to borrow against',
    );
  }

  const final = await preview(buildBorrowPlan({ ...planInput, borrowAmount }));

  if (!quoteHeld(netMinAmountOut(final.execution), borrowAmount)) {
    throw new BorrowPreviewError(
      'quoteMoved',
      'The quote moved while preparing the loan; get a new quote',
    );
  }

  return { preview: final, borrowAmount };
};
