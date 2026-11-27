import type { ActionCatalogEntry } from '@aurora-is-near/intents-connect';

import { markUnavailable } from '../../utils/availability';
import {
  AAVE_BORROW_ASSETS,
  AAVE_BORROW_CHAINS,
  AAVE_BORROW_MARKETS,
  AAVE_COLLATERAL_ASSETS,
  BORROW_ACTION,
} from '../config/borrowAction';
import type { BorrowReserve, CollateralReserve } from '../../types';
import type {
  AaveBorrowAsset,
  AaveBorrowChain,
  AaveBorrowToken,
  AaveCollateralAsset,
} from '../config/borrowAction';
import type { AaveMarket } from '../config/registry';

/**
 * Which reserves the hosted borrow action (`aave-v3-borrow`) can run: the
 * app's copy of its tables (`config/borrowAction.ts`), per chain, narrowed
 * to what the served action accepts (`actionAvailability`). A reserve is
 * covered when the chain's table has its token address with the same
 * delivery: the native token (`nativeDelivery`, supplied through the
 * gateway) or the ERC-20 itself. Borrowed tokens are never native.
 */

/** What the served action accepts, by its input symbols. */
export type ActionAvailability = {
  chains: ReadonlySet<string>;
  collateral: ReadonlySet<string>;
  borrow: ReadonlySet<string>;
};

/** Everything in the tables: before (or without) a catalog check. */
const EVERYTHING: ActionAvailability = {
  chains: new Set(AAVE_BORROW_CHAINS),
  collateral: new Set(AAVE_COLLATERAL_ASSETS),
  borrow: new Set(AAVE_BORROW_ASSETS),
};

const NOTHING: ActionAvailability = {
  chains: new Set(),
  collateral: new Set(),
  borrow: new Set(),
};

/** A string `enum` of the action's input schema, if it declares one. */
const enumOf = (
  entry: ActionCatalogEntry,
  property: string,
): string[] | undefined => {
  const { properties } = entry.inputSchema as {
    properties?: Record<string, { enum?: unknown }>;
  };

  const values = properties?.[property]?.enum;

  return Array.isArray(values)
    ? values.filter((value): value is string => typeof value === 'string')
    : undefined;
};

/**
 * The pinned action as the catalog serves it: what it accepts of the
 * tables, and what is wrong when that is less than the tables (`problem`,
 * for one log line). Missing, or with another hash, it accepts nothing: a
 * resolve would be refused (404, 409), so nothing is offered.
 */
export const actionAvailability = (
  catalog: ActionCatalogEntry[],
): { available: ActionAvailability; problem?: string } => {
  const entry = catalog.find(
    ({ id, version }) =>
      id === BORROW_ACTION.id && version === BORROW_ACTION.version,
  );

  const named = `${BORROW_ACTION.id} v${BORROW_ACTION.version}`;

  if (!entry) {
    return {
      available: NOTHING,
      problem: `${named} is not in the actions catalog`,
    };
  }

  if (entry.sha256Hash !== BORROW_ACTION.sha256Hash) {
    return {
      available: NOTHING,
      problem: `${named} changed: the catalog serves hash ${entry.sha256Hash}, Borrow is pinned to ${BORROW_ACTION.sha256Hash}`,
    };
  }

  const accepted = (
    symbols: readonly string[],
    served: string[] | undefined,
  ): string[] =>
    served === undefined
      ? [...symbols]
      : symbols.filter((symbol) => served.includes(symbol));

  const chains = accepted(AAVE_BORROW_CHAINS, entry.supportedChains);
  const collateral = accepted(
    AAVE_COLLATERAL_ASSETS,
    enumOf(entry, 'collateral'),
  );

  const borrow = accepted(AAVE_BORROW_ASSETS, enumOf(entry, 'borrowAsset'));

  const dropped = [
    ...AAVE_BORROW_CHAINS.filter((chain) => !chains.includes(chain)),
    ...AAVE_COLLATERAL_ASSETS.filter((symbol) => !collateral.includes(symbol)),
    ...AAVE_BORROW_ASSETS.filter((symbol) => !borrow.includes(symbol)),
  ];

  return {
    available: {
      chains: new Set(chains),
      collateral: new Set(collateral),
      borrow: new Set(borrow),
    },
    ...(dropped.length > 0
      ? { problem: `${named} no longer accepts ${dropped.join(', ')}` }
      : {}),
  };
};

/** The table symbol whose token is `asset` delivered as `native`. */
const symbolIn = <TSymbol extends string>(
  symbols: readonly TSymbol[],
  table: Readonly<Partial<Record<TSymbol, AaveBorrowToken>>>,
  asset: string,
  native: boolean,
): TSymbol | undefined =>
  symbols.find((candidate) => {
    const token = table[candidate];

    return (
      token !== undefined &&
      token.native === native &&
      token.address.toLowerCase() === asset.toLowerCase()
    );
  });

/** A reserve's token address, in any case, and how it is delivered. */
type ReserveToken = { asset: string; nativeDelivery?: boolean };

/** The action's `collateral` symbol for `reserve` on `market`, if any. */
const collateralSymbolOf = (
  market: AaveMarket,
  reserve: ReserveToken,
): AaveCollateralAsset | undefined =>
  symbolIn(
    AAVE_COLLATERAL_ASSETS,
    AAVE_BORROW_MARKETS[market.chain].collateral,
    reserve.asset,
    reserve.nativeDelivery === true,
  );

/** The action's `borrowAsset` symbol for `reserve` on `market`, if any. */
const borrowSymbolOf = (
  market: AaveMarket,
  reserve: Pick<ReserveToken, 'asset'>,
): AaveBorrowAsset | undefined =>
  symbolIn(
    AAVE_BORROW_ASSETS,
    AAVE_BORROW_MARKETS[market.chain].borrow,
    reserve.asset,
    false,
  );

/** Whether `chain` and `symbol` are both accepted by the served action. */
const accepts = (
  available: ActionAvailability,
  chain: AaveBorrowChain,
  side: 'collateral' | 'borrow',
  symbol: string | undefined,
): boolean =>
  symbol !== undefined &&
  available.chains.has(chain) &&
  available[side].has(symbol);

/** Whether the action can supply `reserve` as collateral on `market`. */
export const coversCollateral = (
  market: AaveMarket,
  reserve: ReserveToken,
  available: ActionAvailability = EVERYTHING,
): boolean =>
  accepts(
    available,
    market.chain,
    'collateral',
    collateralSymbolOf(market, reserve),
  );

/** Whether the action can borrow `reserve` on `market`. */
export const coversBorrow = (
  market: AaveMarket,
  reserve: Pick<ReserveToken, 'asset'>,
  available: ActionAvailability = EVERYTHING,
): boolean =>
  accepts(available, market.chain, 'borrow', borrowSymbolOf(market, reserve));

/**
 * The action's symbols for a pair of reserves on `market`, which its step
 * builder takes. Throws when the action does not cover either one: such a
 * reserve is listed `coming-soon` and never borrowed against.
 */
export const actionPairOf = (
  market: AaveMarket,
  collateral: Pick<CollateralReserve, 'asset' | 'symbol' | 'nativeDelivery'>,
  borrow: Pick<BorrowReserve, 'asset' | 'symbol'>,
): { collateral: AaveCollateralAsset; borrowAsset: AaveBorrowAsset } => {
  const collateralSymbol = collateralSymbolOf(market, collateral);

  if (!collateralSymbol) {
    throw new Error(
      `Aave V3 ${market.chainLabel}: the borrow action does not cover ${collateral.symbol} (${collateral.asset}) as collateral`,
    );
  }

  const borrowSymbol = borrowSymbolOf(market, borrow);

  if (!borrowSymbol) {
    throw new Error(
      `Aave V3 ${market.chainLabel}: the borrow action does not cover borrowing ${borrow.symbol} (${borrow.asset})`,
    );
  }

  return { collateral: collateralSymbol, borrowAsset: borrowSymbol };
};

/**
 * The delivered reserves, each one the action does not cover (or the served
 * action no longer accepts) kept in the list but marked unavailable as
 * `coming-soon`, so the pickers can show it as "Coming soon".
 */
export const markCoverage = (
  market: AaveMarket,
  {
    collateral,
    borrowable,
  }: { collateral: CollateralReserve[]; borrowable: BorrowReserve[] },
  available: ActionAvailability = EVERYTHING,
): { collateral: CollateralReserve[]; borrowable: BorrowReserve[] } => ({
  collateral: collateral.map((reserve) =>
    coversCollateral(market, reserve, available)
      ? reserve
      : markUnavailable(reserve, 'coming-soon'),
  ),
  borrowable: borrowable.map((reserve) =>
    coversBorrow(market, reserve, available)
      ? reserve
      : markUnavailable(reserve, 'coming-soon'),
  ),
});
