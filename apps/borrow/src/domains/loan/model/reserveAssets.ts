import {
  isComingSoon,
  isReserveAvailable,
} from '@/domains/markets/utils/availability';
import { tokenAmountToUsd } from '@/domains/markets/utils/format';
import type {
  BorrowReserve,
  CollateralReserve,
  LendingMarket,
  MarketSnapshot,
} from '@/domains/markets/types';

import type { MarketPair } from './marketRows';

/**
 * The pair the form starts on, and what the pickers show while the wallet is
 * not connected: WETH collateral and USDC borrow. The artboard's default is
 * wstETH (line 1052), but 1Click does not deliver wstETH on Base or
 * Arbitrum; WETH is delivered on both and is Aave collateral on both
 * (decided in the feature review). Both are in the borrow action's tables
 * on Base and Arbitrum, so the pair is never "Coming soon" there (tested);
 * Polygon takes POL instead.
 */
export const DEFAULT_PAIR: MarketPair = { collateral: 'WETH', borrow: 'USDC' };

/**
 * Reserves and held assets are matched by symbol, in any case, so
 * Arbitrum's bridged `USDC.e` is not taken for USDC.
 */
export const sameSymbol = (a: string, b: string) =>
  a.toLowerCase() === b.toLowerCase();

/** The wrapped reserve each market's native token is supplied as. */
const WRAPPED_NATIVE: Readonly<Record<string, string>> = {
  eth: 'WETH',
  pol: 'WPOL',
};

/**
 * Whether a held `symbol` funds the `reserve` symbol as itself: the same
 * token, or a native token and the wrapped reserve Aave holds it as (ETH as
 * WETH, POL as WPOL).
 */
export const fundsAsItself = (reserve: string, symbol: string) => {
  const native = symbol.toLowerCase();

  return (
    sameSymbol(reserve, symbol) ||
    (Object.hasOwn(WRAPPED_NATIVE, native) &&
      sameSymbol(reserve, WRAPPED_NATIVE[native] ?? ''))
  );
};

/**
 * One token a picker offers from the market snapshots: a collateral or a
 * borrowable reserve, once per symbol, with the markets that list it.
 */
export type ReserveAsset = {
  symbol: string;
  decimals: number;
  /** The markets listing it, in snapshot order. */
  markets: LendingMarket[];
  /** One whole token in dollars, from the first listing market's oracle. */
  priceUsd: number;
  /**
   * The borrow action covers it on no chain: listed, but not pickable.
   * `markets` are then the markets listing it.
   */
  comingSoon?: true;
};

/**
 * The reserves of one kind across the snapshots, once per symbol (matched in
 * any case), with the markets that can take a new loan in it now. A symbol
 * the borrow action covers on no chain follows, marked `comingSoon`, with
 * the markets listing it. A symbol only unavailable for a reached cap is
 * left out, as before.
 */
export const reserveAssets = (
  snapshots: readonly MarketSnapshot[],
  reservesOf: (
    snapshot: MarketSnapshot,
  ) => readonly (CollateralReserve | BorrowReserve)[],
): ReserveAsset[] => {
  const assets: ReserveAsset[] = [];

  const add = (
    snapshot: MarketSnapshot,
    reserve: CollateralReserve | BorrowReserve,
    comingSoon: boolean,
  ) => {
    const known = assets.find(({ symbol }) =>
      sameSymbol(symbol, reserve.symbol),
    );

    if (known) {
      known.markets.push(snapshot.market);

      return;
    }

    assets.push({
      symbol: reserve.symbol,
      decimals: reserve.decimals,
      markets: [snapshot.market],
      priceUsd: tokenAmountToUsd({
        amount: 10n ** BigInt(reserve.decimals),
        decimals: reserve.decimals,
        priceBase: reserve.priceBase,
        baseCurrencyUnit: snapshot.baseCurrencyUnit,
      }),
      ...(comingSoon && { comingSoon: true as const }),
    });
  };

  snapshots.forEach((snapshot) => {
    reservesOf(snapshot).forEach((reserve) => {
      if (isReserveAvailable(reserve)) {
        add(snapshot, reserve, false);
      }
    });
  });

  // Covered somewhere, even if capped there: never "Coming soon".
  const covered = snapshots.flatMap((snapshot) =>
    reservesOf(snapshot).flatMap((reserve) =>
      isComingSoon(reserve) ? [] : [reserve.symbol],
    ),
  );

  snapshots.forEach((snapshot) => {
    reservesOf(snapshot).forEach((reserve) => {
      if (
        isComingSoon(reserve) &&
        !covered.some((symbol) => sameSymbol(symbol, reserve.symbol))
      ) {
        add(snapshot, reserve, true);
      }
    });
  });

  return assets;
};

/** `assets`' decimals for `symbol`, else `fallback`. */
export const decimalsOf = (
  assets: readonly ReserveAsset[],
  symbol: string,
  fallback: number,
): number =>
  assets.find((asset) => sameSymbol(asset.symbol, symbol))?.decimals ??
  fallback;

/**
 * The borrow side of the pair. The collateral is never borrowed too
 * (decided in the feature review): its symbol is left out of the borrow
 * list, and a borrow symbol that collides with it (USDC held and listed as
 * collateral, say) moves to the default, else the first pickable asset.
 * `asset` is `undefined` while the wanted symbol is not listed (yet).
 */
export const pickBorrowAsset = ({
  borrowable,
  borrowSymbol,
  collateralSymbol,
}: {
  /** Every borrowable reserve asset (`reserveAssets`). */
  borrowable: readonly ReserveAsset[];
  borrowSymbol: string;
  collateralSymbol: string;
}): { borrowAssets: ReserveAsset[]; asset: ReserveAsset | undefined } => {
  const borrowAssets = borrowable.filter(
    ({ symbol }) => !sameSymbol(symbol, collateralSymbol),
  );

  const pickable = borrowAssets.filter(({ comingSoon }) => comingSoon !== true);
  const bySymbol = (wanted: string) =>
    pickable.find(({ symbol }) => sameSymbol(symbol, wanted));

  const asset =
    bySymbol(borrowSymbol) ??
    (sameSymbol(borrowSymbol, collateralSymbol)
      ? (bySymbol(DEFAULT_PAIR.borrow) ?? pickable[0])
      : undefined);

  return { borrowAssets, asset };
};
