/**
 * Market figures as the market list shows them (Web-Borrow-NotConnected.dc.html
 * lines 1127–1150): APR to two decimals ("4.85%"), LTVs without trailing zeros
 * ("79%", "82.5%") and liquidity in compact dollars ("$1.2B").
 */

const PERCENT_2DP = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PERCENT_UP_TO_2DP = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

/**
 * The currency style keeps USD's two fraction digits as a minimum, which
 * `maximumFractionDigits: 1` only lowers to one ("$356.0M"): set it to 0.
 */
const COMPACT_USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** A rate as a fraction (0.0485) to "4.85%". Not compounded: an APR. */
export const formatApr = (fraction: number): string =>
  `${PERCENT_2DP.format(fraction * 100)}%`;

/** Basis points to a percentage: 7900 to "79%", 8250 to "82.5%". */
export const formatBps = (bps: number): string =>
  `${PERCENT_UP_TO_2DP.format(bps / 100)}%`;

/** Dollars to "$1.2B", "$412M", "$950K" or "$12". */
export const formatCompactUsd = (usd: number): string =>
  COMPACT_USD.format(usd);

/** An amount in the oracle's base units in dollars, `unit` being one dollar. */
export const baseToUsd = (value: bigint, unit: bigint): number =>
  Number(value / unit) + Number(value % unit) / Number(unit);

/**
 * A token amount in dollars: `amount` token units at `priceBase` per whole
 * token, where `baseCurrencyUnit` of the oracle's base is one dollar (the
 * oracle base is USD on Borrow's launch chains). Exact in bigint down to the
 * oracle's unit, then a float for display.
 */
export const tokenAmountToUsd = ({
  amount,
  decimals,
  priceBase,
  baseCurrencyUnit,
}: {
  amount: bigint;
  decimals: number;
  priceBase: bigint;
  baseCurrencyUnit: bigint;
}): number => {
  if (baseCurrencyUnit <= 0n) {
    throw new Error('baseCurrencyUnit must be positive');
  }

  return baseToUsd(
    (amount * priceBase) / 10n ** BigInt(decimals),
    baseCurrencyUnit,
  );
};
