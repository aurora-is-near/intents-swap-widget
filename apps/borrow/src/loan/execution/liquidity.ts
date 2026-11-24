import type { BorrowReserve, MarketSnapshot } from '../../markets/types';

export type LiquidityCheck = 'ok' | 'noLiquidity';

/**
 * Before confirming: whether a freshly read snapshot can still lend
 * `borrowAmount` of `borrow`. A reserve that is gone, or not borrowable now,
 * counts as out of liquidity too.
 */
export const checkLiquidity = (
  snapshot: MarketSnapshot,
  borrow: Pick<BorrowReserve, 'asset'>,
  borrowAmount: bigint,
): LiquidityCheck => {
  const reserve = snapshot.borrowable.find(
    ({ asset }) => asset.toLowerCase() === borrow.asset.toLowerCase(),
  );

  return reserve &&
    reserve.unavailable !== true &&
    reserve.availableLiquidity >= borrowAmount
    ? 'ok'
    : 'noLiquidity';
};
