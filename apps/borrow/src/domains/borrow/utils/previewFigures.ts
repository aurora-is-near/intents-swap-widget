import type { Execution } from '@aurora-is-near/intents-connect';

import { loanValues, ltvBps, scaleOf } from '@/domains/markets/utils/math';
import type { BorrowReserve, CollateralReserve } from '@/domains/markets/types';

/**
 * The confirm dialog's figures, read from the final dry run (see
 * `preview.ts` for what its fields mean). The loan's own figures are taken
 * against the MINIMUM collateral received, the worst case the bridge allows,
 * at the market's oracle prices, and rounded against the borrower as in
 * `markets/math.ts`.
 */

export type BorrowPreviewFiguresInput = {
  /** The final dry run: `previewBorrow(...).preview.execution`. */
  execution: Pick<Execution, 'quote' | 'details'>;
  /** What the final plan borrows: `previewBorrow(...).borrowAmount`. */
  borrowAmount: bigint;
  /** The token the user pays with. */
  paid: { assetId: string; decimals: number };
  collateral: Pick<CollateralReserve, 'assetId' | 'decimals' | 'priceBase'>;
  borrow: Pick<BorrowReserve, 'decimals' | 'priceBase'>;
};

export type BorrowPreviewFigures = {
  /** Collateral expected to arrive, net of the fee (`quote.amountOut`). */
  collateralExpected: bigint;
  /** The least collateral that arrives and is supplied (`quote.minAmountOut`). */
  minimumReceived: bigint;
  /**
   * Collateral units per whole paid token, at the expected amount, rounded
   * down. Only when the paid asset is converted to the collateral.
   */
  rate: bigint | undefined;
  /** Borrowed, in borrow-token units. */
  borrowAmount: bigint;
  /**
   * The service's fee exactly as the dry run reports it
   * (`details.networkFee`), in collateral units; `undefined` when it
   * reported none.
   */
  fee: bigint | undefined;
  /** The loan's LTV in bps, against the minimum received. */
  ltvBps: bigint | null;
};

/** The loan's figures once the collateral amounts are known. */
const loanAt = ({
  collateralExpected,
  minimumReceived,
  rate,
  fee,
  borrowAmount,
  collateral,
  borrow,
}: Pick<
  BorrowPreviewFigures,
  'collateralExpected' | 'minimumReceived' | 'rate' | 'fee' | 'borrowAmount'
> &
  Pick<
    BorrowPreviewFiguresInput,
    'collateral' | 'borrow'
  >): BorrowPreviewFigures => {
  const { collateralValue, debt } = loanValues({
    collateralAmount: minimumReceived,
    collateral,
    borrowAmount,
    borrow,
  });

  return {
    collateralExpected,
    minimumReceived,
    rate,
    borrowAmount,
    fee,
    ltvBps: ltvBps(debt, collateralValue),
  };
};

export const borrowPreviewFigures = ({
  execution: { quote, details },
  borrowAmount,
  paid,
  collateral,
  borrow,
}: BorrowPreviewFiguresInput): BorrowPreviewFigures => {
  const collateralExpected = BigInt(quote.amountOut);
  const amountIn = BigInt(quote.amountIn);

  return loanAt({
    collateralExpected,
    minimumReceived: BigInt(quote.minAmountOut),
    rate:
      paid.assetId !== collateral.assetId && amountIn > 0n
        ? (collateralExpected * scaleOf(paid.decimals)) / amountIn
        : undefined,
    fee:
      details.networkFee === undefined ? undefined : BigInt(details.networkFee),
    borrowAmount,
    collateral,
    borrow,
  });
};

export type StepsPreviewFiguresInput = {
  /** What the steps supply, net of the fee: the steps preview's `spendable`. */
  spendable: bigint;
  /** The steps preview's `networkFee`, in collateral units, if reported. */
  networkFee: bigint | undefined;
  borrowAmount: bigint;
  collateral: BorrowPreviewFiguresInput['collateral'];
  borrow: BorrowPreviewFiguresInput['borrow'];
};

/**
 * The confirm figures of a steps-only retry (`stepsRetry.ts`): nothing is
 * converted, so no rate, and the collateral supplied is exactly `spendable`.
 */
export const stepsPreviewFigures = ({
  spendable,
  networkFee,
  ...loan
}: StepsPreviewFiguresInput): BorrowPreviewFigures =>
  loanAt({
    collateralExpected: spendable,
    minimumReceived: spendable,
    rate: undefined,
    fee: networkFee,
    ...loan,
  });
