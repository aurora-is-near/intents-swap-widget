import { markUnavailable } from '../../utils/availability';
import {
  AAVE_BORROW_ASSETS,
  AAVE_BORROW_MARKETS,
  AAVE_COLLATERAL_ASSETS,
} from '../config/borrowAction';
import type { BorrowReserve, CollateralReserve } from '../../types';
import type {
  AaveBorrowAsset,
  AaveBorrowToken,
  AaveCollateralAsset,
} from '../config/borrowAction';
import type { AaveMarket } from '../config/registry';

/**
 * Which reserves the hosted borrow action (`aave-v3-borrow`) can run: the
 * app's copy of its token tables (`config/borrowAction.ts`), per chain. A
 * reserve is covered when the chain's table has its token address with the
 * same delivery: the native token (`nativeDelivery`, supplied through the
 * gateway) or the ERC-20 itself. Borrowed tokens are never native. The
 * action itself is pinned by hash, so a changed action fails at quote time
 * (`ACTION_CHANGED_MESSAGE`) rather than here.
 */

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

/** Whether the action can supply `reserve` as collateral on `market`. */
export const coversCollateral = (
  market: AaveMarket,
  reserve: ReserveToken,
): boolean => collateralSymbolOf(market, reserve) !== undefined;

/** Whether the action can borrow `reserve` on `market`. */
export const coversBorrow = (
  market: AaveMarket,
  reserve: Pick<ReserveToken, 'asset'>,
): boolean => borrowSymbolOf(market, reserve) !== undefined;

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
 * The delivered reserves, each one the action does not cover kept in the
 * list but marked unavailable as `coming-soon`, so the pickers can show it
 * as "Coming soon".
 */
export const markCoverage = (
  market: AaveMarket,
  {
    collateral,
    borrowable,
  }: { collateral: CollateralReserve[]; borrowable: BorrowReserve[] },
): { collateral: CollateralReserve[]; borrowable: BorrowReserve[] } => ({
  collateral: collateral.map((reserve) =>
    coversCollateral(market, reserve)
      ? reserve
      : markUnavailable(reserve, 'coming-soon'),
  ),
  borrowable: borrowable.map((reserve) =>
    coversBorrow(market, reserve)
      ? reserve
      : markUnavailable(reserve, 'coming-soon'),
  ),
});
