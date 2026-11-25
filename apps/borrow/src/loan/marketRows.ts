import { isReserveAvailable } from '../markets/availability';
import { tokenAmountToUsd } from '../markets/format';
import type { LendingMarket, MarketSnapshot } from '../markets/types';
import { sameSymbol } from './model/symbols';

/**
 * The market rows the list shows and the loan form picks from, derived the
 * same way for both: one row per market (a provider on one chain) that
 * offers the pair, grouped into one row per provider, which lends on the
 * chain it chooses; BEST on the lowest borrow APR.
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
 * lacks either reserve, or either cannot take a new loan now (cap reached
 * or coming soon). Symbols are
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
    !isReserveAvailable(collateral) ||
    !isReserveAvailable(borrow)
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

/** One provider, such as Aave, across the chains that offer the pair. */
export type ProviderRow = {
  /** `LendingMarket.provider`, such as `aave-v3`. */
  provider: string;
  /** `LendingMarket.name`, such as `Aave`. */
  name: string;
  /** The chain the loan goes to; its figures are the provider's. */
  chosen: MarketRow;
  /** Every loaded chain with the pair, in the order given. */
  chains: MarketRow[];
};

/**
 * The chain a provider lends on: the lowest APR among the chains whose
 * liquidity covers the loan (`loanUsd`, in dollars; `undefined` while its
 * size is not known, when every chain counts). When none covers it, the
 * lowest APR all the same: the call to action and the borrow's liquidity
 * check catch it. The first on a tie.
 */
export const chooseChain = (
  chains: readonly MarketRow[],
  loanUsd: number | undefined,
): MarketRow | undefined =>
  bestOf(
    chains.filter(
      ({ liquidityUsd }) => loanUsd === undefined || liquidityUsd >= loanUsd,
    ),
  ) ?? bestOf(chains);

/**
 * One row per provider (`LendingMarket.provider`) among the pair's `rows`,
 * in the order its first chain comes, with the chain `chooseChain` picks.
 * The liquidity is compared in dollars, so the choice does not depend on
 * the chosen chain's own figures.
 */
export const providerRows = (
  rows: readonly MarketRow[],
  loanUsd: number | undefined,
): ProviderRow[] => {
  const byProvider = new Map<string, MarketRow[]>();

  rows.forEach((row) => {
    const chains = byProvider.get(row.market.provider);

    if (chains) {
      chains.push(row);
    } else {
      byProvider.set(row.market.provider, [row]);
    }
  });

  return [...byProvider].flatMap(([provider, chains]) => {
    const chosen = chooseChain(chains, loanUsd);

    return chosen
      ? [{ provider, name: chosen.market.name, chosen, chains }]
      : [];
  });
};
