import type { Execution } from '@aurora-is-near/intents-connect';

import {
  HEALTH_FACTOR_ONE,
  healthFactor,
  liquidationPrice,
  ltvBps,
} from '../../markets/math';
import type { BorrowReserve, CollateralReserve } from '../../markets/types';

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
  collateral: Pick<
    CollateralReserve,
    'assetId' | 'decimals' | 'priceBase' | 'liquidationLtvBps'
  >;
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
  /**
   * The collateral's price, in the oracle's base units per whole token, at
   * which the loan can be liquidated. `null` with no collateral or no borrow.
   */
  liquidationPrice: bigint | null;
  /** Aave's health factor in hundredths (162n is 1.62), rounded down; `null` with no borrow. */
  healthHundredths: bigint | null;
};

const scaleOf = (decimals: number) => 10n ** BigInt(decimals);

const ceilDiv = (numerator: bigint, denominator: bigint) =>
  (numerator + denominator - 1n) / denominator;

export const borrowPreviewFigures = ({
  execution: { quote, details },
  borrowAmount,
  paid,
  collateral,
  borrow,
}: BorrowPreviewFiguresInput): BorrowPreviewFigures => {
  const collateralExpected = BigInt(quote.amountOut);
  const minimumReceived = BigInt(quote.minAmountOut);
  const amountIn = BigInt(quote.amountIn);

  const rate =
    paid.assetId !== collateral.assetId && amountIn > 0n
      ? (collateralExpected * scaleOf(paid.decimals)) / amountIn
      : undefined;

  // Values in the oracle's base units: collateral rounded down, debt up.
  const collateralValue =
    (minimumReceived * collateral.priceBase) / scaleOf(collateral.decimals);

  const debt = ceilDiv(
    borrowAmount * borrow.priceBase,
    scaleOf(borrow.decimals),
  );

  const health = healthFactor(
    collateralValue,
    collateral.liquidationLtvBps,
    debt,
  );

  return {
    collateralExpected,
    minimumReceived,
    rate,
    borrowAmount,
    fee:
      details.networkFee === undefined ? undefined : BigInt(details.networkFee),
    ltvBps: ltvBps(debt, collateralValue),
    liquidationPrice: liquidationPrice({
      collateralAmount: minimumReceived,
      decimals: collateral.decimals,
      liquidationLtvBps: collateral.liquidationLtvBps,
      debt,
    }),
    healthHundredths:
      health === null ? null : (health * 100n) / HEALTH_FACTOR_ONE,
  };
};
