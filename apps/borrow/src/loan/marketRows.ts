import { tokenAmountToUsd } from '../markets/format';
import type { LendingMarket, MarketSnapshot } from '../markets/types';
import { sameSymbol } from './model/symbols';

/**
 * The market rows the list shows and the loan form picks from, derived the
 * same way for both: one row per market that offers the pair, and BEST on
 * the lowest borrow APR.
 */

/** The collateral and borrow symbols a row is read for. */
export type MarketPair = {
  collateral: string;
  borrow: string;
};

export type MarketRow = {
  market: LendingMarket;
  apr: number;
  maxLtvBps: number;
  liquidationLtvBps: number;
  liquidityUsd: number;
};

/**
 * The pair's figures in one snapshot: APR and liquidity from the borrow
 * reserve, the LTVs from the collateral reserve. `undefined` when the market
 * lacks either reserve, or either cannot take a new loan now. Symbols are
 * matched in any case, so Arbitrum's bridged `USDC.e` is not taken for USDC.
 */
export const pairRow = (
  snapshot: MarketSnapshot,
  pair: MarketPair,
): MarketRow | undefined => {
  const collateral = snapshot.collateral.find(({ symbol }) =>
    sameSymbol(symbol, pair.collateral),
  );

  const borrow = snapshot.borrowable.find(({ symbol }) =>
    sameSymbol(symbol, pair.borrow),
  );

  if (
    !collateral ||
    !borrow ||
    collateral.unavailable === true ||
    borrow.unavailable === true
  ) {
    return undefined;
  }

  return {
    market: snapshot.market,
    apr: borrow.variableBorrowApr,
    maxLtvBps: collateral.maxLtvBps,
    liquidationLtvBps: collateral.liquidationLtvBps,
    liquidityUsd: tokenAmountToUsd({
      amount: borrow.availableLiquidity,
      decimals: borrow.decimals,
      priceBase: borrow.priceBase,
      baseCurrencyUnit: snapshot.baseCurrencyUnit,
    }),
  };
};

/**
 * The lowest APR among `rows`; the first on a tie. The caller passes only
 * the rows that can be picked: the list its enabled ones, `marketFit` the
 * ones the loan's LTV fits.
 */
export const bestOf = <Row extends Pick<MarketRow, 'apr'>>(
  rows: readonly Row[],
): Row | undefined =>
  rows.reduce<Row | undefined>(
    (best, row) => (!best || row.apr < best.apr ? row : best),
    undefined,
  );
