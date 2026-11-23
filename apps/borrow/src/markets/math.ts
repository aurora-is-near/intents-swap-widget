/**
 * Loan math, in bigint so nothing is lost to floating point.
 *
 * Values (collateral, debt, prices) are in the oracle's base currency units,
 * as `priceBase` and Aave's account data give them. Ratios are in basis
 * points (10_000 = 100%). Every result is rounded against the borrower, so a
 * figure on screen never promises more room than the protocol gives.
 *
 * Inputs must be non-negative, and bps whole numbers; anything else throws a
 * RangeError rather than producing a misleading figure.
 */

export const BPS = 10_000n;

/** The health factor's scale: 1e18 is a health factor of 1. */
export const HEALTH_FACTOR_ONE = 10n ** 18n;

const ceilDiv = (numerator: bigint, denominator: bigint) =>
  (numerator + denominator - 1n) / denominator;

const nonNegative = (name: string, value: bigint) => {
  if (value < 0n) {
    throw new RangeError(`${name} must not be negative`);
  }

  return value;
};

const bps = (name: string, value: number) => {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a whole, non-negative number of bps`);
  }

  return BigInt(value);
};

const decimalsScale = (name: string, value: number) => {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a whole, non-negative number`);
  }

  return 10n ** BigInt(value);
};

/**
 * Loan-to-value in bps: `debt / collateral`.
 *
 * Rounds **up**, so a loan sitting a hair above a limit never reads as at it.
 * No debt gives `0n`; debt with no collateral gives `null` (no finite LTV).
 */
export const ltvBps = (debt: bigint, collateral: bigint): bigint | null => {
  nonNegative('debt', debt);
  nonNegative('collateral', collateral);

  if (debt === 0n) {
    return 0n;
  }

  if (collateral === 0n) {
    return null;
  }

  return ceilDiv(debt * BPS, collateral);
};

/**
 * Aave's health factor, 1e18-scaled:
 * `collateral × liquidationLtv / debt`. Below 1e18 the loan can be liquidated.
 *
 * Rounds **down**, so it never reads as safer than it is. No debt gives
 * `null` (no limit), never `0n`, which would read as "liquidatable".
 */
export const healthFactor = (
  collateral: bigint,
  liquidationLtvBps: number,
  debt: bigint,
): bigint | null => {
  nonNegative('collateral', collateral);
  nonNegative('debt', debt);

  const threshold = bps('liquidationLtvBps', liquidationLtvBps);

  if (debt === 0n) {
    return null;
  }

  return (collateral * threshold * HEALTH_FACTOR_ONE) / (debt * BPS);
};

export type LiquidationPriceInput = {
  /** Collateral held, in token units. */
  collateralAmount: bigint;
  /** The collateral token's decimals. */
  decimals: number;
  liquidationLtvBps: number;
  /** Debt, in base currency units. */
  debt: bigint;
};

/**
 * The price of one whole collateral token, in base currency units, at which
 * the health factor is exactly 1:
 * `debt × 10^decimals / (collateralAmount × liquidationLtv)`.
 *
 * Rounds **up**, so the warning comes no later than the protocol's.
 * Assumes the loan has one collateral asset. No debt, no collateral or a
 * liquidation LTV of 0 gives `null`: no price makes the health factor 1.
 */
export const liquidationPrice = ({
  collateralAmount,
  decimals,
  liquidationLtvBps,
  debt,
}: LiquidationPriceInput): bigint | null => {
  nonNegative('collateralAmount', collateralAmount);
  nonNegative('debt', debt);

  const scale = decimalsScale('decimals', decimals);
  const threshold = bps('liquidationLtvBps', liquidationLtvBps);

  if (debt === 0n || collateralAmount === 0n || threshold === 0n) {
    return null;
  }

  return ceilDiv(debt * BPS * scale, collateralAmount * threshold);
};

export type MaxBorrowInput = {
  /** Collateral value, in base currency units. */
  collateral: bigint;
  maxLtvBps: number;
  /** Debt already owed, in base currency units. */
  existingDebt: bigint;
  /** Price of one whole borrow token, in base currency units. */
  borrowPrice: bigint;
  borrowDecimals: number;
  /** What the reserve can lend now, in borrow-token units. */
  availableLiquidity: bigint;
};

/**
 * How much more can be borrowed, in borrow-token units:
 * `(collateral × maxLtv − existingDebt) × 10^decimals / borrowPrice`, capped
 * by the reserve's available liquidity.
 *
 * Rounds **down** (one division, so only one unit is ever lost), so the
 * amount offered never exceeds what the Pool accepts. Debt at or above the
 * limit gives `0n`, never a negative amount. A zero borrow price throws: it is
 * a broken oracle read, not a free asset.
 */
export const maxBorrow = ({
  collateral,
  maxLtvBps,
  existingDebt,
  borrowPrice,
  borrowDecimals,
  availableLiquidity,
}: MaxBorrowInput): bigint => {
  nonNegative('collateral', collateral);
  nonNegative('existingDebt', existingDebt);
  nonNegative('availableLiquidity', availableLiquidity);

  const ltv = bps('maxLtvBps', maxLtvBps);
  const scale = decimalsScale('borrowDecimals', borrowDecimals);

  if (borrowPrice <= 0n) {
    throw new RangeError('borrowPrice must be positive');
  }

  const headroomBps = collateral * ltv - existingDebt * BPS;

  if (headroomBps <= 0n) {
    return 0n;
  }

  const amount = (headroomBps * scale) / (borrowPrice * BPS);

  return amount < availableLiquidity ? amount : availableLiquidity;
};
