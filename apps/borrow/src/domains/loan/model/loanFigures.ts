import { BORROW_FEE_BPS } from '@/config';
import {
  BPS,
  ceilDiv,
  HEALTH_FACTOR_ONE,
  healthFactor,
  liquidationPrice,
  loanValues,
  scaleOf,
} from '@/domains/markets/utils/math';
import type { BorrowReserve, CollateralReserve } from '@/domains/markets/types';

/**
 * The New loan form's figures for one market, as the artboard computes them
 * (Web-Borrow.dc.html lines 1137–1140, 1173), in bigint on the market's own
 * oracle prices: those are what the Pool enforces (decided in the plan
 * review). Every figure is rounded against the borrower, as in
 * `markets/utils/math.ts`: the borrow amount down, the fee up.
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
  /**
   * The fee taken from `collateralAmount` before it is supplied, in basis
   * points; `BORROW_FEE_BPS` by default. 0 for an amount already net of the
   * fee, such as the dry run's minimum received.
   */
  feeBps?: number;
};

export type LoanFigures = {
  /**
   * Borrowed, in borrow-token units: the collateral supplied (less the fee)
   * in USD × LTV ÷ borrow price. It reaches the wallet whole.
   */
  borrowAmount: bigint;
  /**
   * `BORROW_FEE_BPS` of the collateral, in collateral units: an estimate.
   * The dry run reports the service's fee in the bridged collateral
   * (`details.networkFee`, see `domains/borrow/utils/preview.ts`), so the borrowed
   * amount reaches the wallet whole (decided in the Borrow execution plan
   * review).
   */
  fee: bigint;
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
  feeBps = BORROW_FEE_BPS,
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

  // The fee is taken from the bridged collateral (as the dry run reports
  // it), so the loan is made against what is left.
  const fee = ceilDiv(collateralAmount * BigInt(feeBps), BPS);
  const supplied = collateralAmount - fee;

  // One division, so only one unit is ever lost.
  const borrowAmount =
    (supplied * collateral.priceBase * loanLtvBps * scaleOf(borrow.decimals)) /
    (scaleOf(collateral.decimals) * BPS * borrow.priceBase);

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
    healthHundredths: healthOf(collateral.liquidationLtvBps, loanLtvBps),
    liquidationPrice: liquidationPrice({
      collateralAmount: supplied,
      decimals: collateral.decimals,
      liquidationLtvBps: collateral.liquidationLtvBps,
      debt,
    }),
  };
};
