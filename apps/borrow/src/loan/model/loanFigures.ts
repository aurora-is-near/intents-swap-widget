import { BORROW_FEE_BPS } from '../../config';
import {
  BPS,
  ceilDiv,
  HEALTH_FACTOR_ONE,
  healthFactor,
  liquidationPrice,
  loanValues,
  scaleOf,
} from '../../markets/math';
import type { BorrowReserve, CollateralReserve } from '../../markets/types';

/**
 * The New loan form's figures for one market, as the artboard computes them
 * (Web-Borrow.dc.html lines 1137–1140, 1173), in bigint on the market's own
 * oracle prices: those are what the Pool enforces (decided in the plan
 * review). Every figure is rounded against the borrower, as in
 * `markets/math.ts`: the borrow amount down, the fee up.
 */

export type LoanFiguresInput = {
  /** The collateral supplied, in its token units. */
  collateralAmount: bigint;
  collateral: Pick<
    CollateralReserve,
    'decimals' | 'priceBase' | 'liquidationLtvBps'
  >;
  borrow: Pick<BorrowReserve, 'decimals' | 'priceBase'>;
  /** The slider's loan-to-value, in whole percent. */
  ltv: number;
};

export type LoanFigures = {
  /** Borrowed, in borrow-token units: collateral USD × LTV ÷ borrow price. */
  borrowAmount: bigint;
  /** `BORROW_FEE_BPS` of the borrow amount, an estimate (as drawn). */
  fee: bigint;
  /** What reaches the wallet: the borrow amount less the fee. */
  received: bigint;
  /**
   * Liquidation LTV ÷ LTV, in hundredths (162n is 1.62), rounded down.
   * `null` at LTV 0, shown as "—".
   */
  healthHundredths: bigint | null;
  /**
   * The collateral's price, in the oracle's base units per whole token (USD
   * where `baseCurrencyUnit` is one dollar), at which the loan can be
   * liquidated. `null` with no collateral or no borrow.
   */
  liquidationPrice: bigint | null;
};

/** Health from the two LTVs alone: the artboard shows it at any amount. */
const healthOf = (liquidationLtvBps: number, loanLtvBps: bigint) => {
  // A nominal collateral of 100% with debt at the loan's LTV.
  const health = healthFactor(BPS, liquidationLtvBps, loanLtvBps);

  return health === null ? null : (health * 100n) / HEALTH_FACTOR_ONE;
};

export const loanFigures = ({
  collateralAmount,
  collateral,
  borrow,
  ltv,
}: LoanFiguresInput): LoanFigures => {
  if (!Number.isInteger(ltv) || ltv < 0) {
    throw new RangeError('ltv must be a whole, non-negative percent');
  }

  if (collateralAmount < 0n) {
    throw new RangeError('collateralAmount must not be negative');
  }

  if (borrow.priceBase <= 0n) {
    throw new RangeError('borrow priceBase must be positive');
  }

  const loanLtvBps = BigInt(ltv) * 100n;

  // One division, so only one unit is ever lost.
  const borrowAmount =
    (collateralAmount *
      collateral.priceBase *
      loanLtvBps *
      scaleOf(borrow.decimals)) /
    (scaleOf(collateral.decimals) * BPS * borrow.priceBase);

  const fee = ceilDiv(borrowAmount * BigInt(BORROW_FEE_BPS), BPS);

  // The debt the borrow amount carries, rounded up so the liquidation price
  // comes no later than the protocol's.
  const { debt } = loanValues({
    collateralAmount,
    collateral,
    borrowAmount,
    borrow,
  });

  return {
    borrowAmount,
    fee,
    received: borrowAmount - fee,
    healthHundredths: healthOf(collateral.liquidationLtvBps, loanLtvBps),
    liquidationPrice: liquidationPrice({
      collateralAmount,
      decimals: collateral.decimals,
      liquidationLtvBps: collateral.liquidationLtvBps,
      debt,
    }),
  };
};
