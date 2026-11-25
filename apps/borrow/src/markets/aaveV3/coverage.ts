import {
  AAVE_BORROW_MARKETS,
  type AaveBorrowToken,
} from '@aurora-is-near/intents-connect-actions';

import { markUnavailable } from '../availability';
import type { BorrowReserve, CollateralReserve } from '../types';
import type { AaveMarket } from './registry';

/**
 * Which reserves the borrow action (`aave-v3-borrow`) can run: its tables
 * in `@aurora-is-near/intents-connect-actions`, per chain. A reserve is
 * covered when the chain's table has its token address with the same
 * delivery: the native token (`nativeDelivery`, supplied through the
 * gateway) or the ERC-20 itself. Borrowed tokens are never native.
 */

const tokensOf = (
  market: AaveMarket,
  side: 'collateral' | 'borrow',
): readonly AaveBorrowToken[] =>
  Object.values(AAVE_BORROW_MARKETS[market.chain][side]);

const inTable = (
  tokens: readonly AaveBorrowToken[],
  asset: string,
  native: boolean,
) =>
  tokens.some(
    (token) =>
      token.native === native &&
      token.address.toLowerCase() === asset.toLowerCase(),
  );

/** A reserve's token address, in any case, and how it is delivered. */
type ReserveToken = { asset: string; nativeDelivery?: boolean };

/** Whether the action can supply `reserve` as collateral on `market`. */
export const coversCollateral = (
  market: AaveMarket,
  reserve: ReserveToken,
): boolean =>
  inTable(
    tokensOf(market, 'collateral'),
    reserve.asset,
    reserve.nativeDelivery === true,
  );

/** Whether the action can borrow `reserve` on `market`. */
export const coversBorrow = (
  market: AaveMarket,
  reserve: Pick<ReserveToken, 'asset'>,
): boolean => inTable(tokensOf(market, 'borrow'), reserve.asset, false);

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
