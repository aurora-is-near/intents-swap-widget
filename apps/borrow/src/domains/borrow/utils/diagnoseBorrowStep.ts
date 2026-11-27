import { isComingSoon } from '@/domains/markets/utils/availability';
import { loanValues, ltvBps } from '@/domains/markets/utils/math';
import type {
  BorrowReserve,
  CollateralReserve,
  MarketSnapshot,
} from '@/domains/markets/types';

import { checkLiquidity, reservesIn } from './borrowPreChecks';

/** Why the borrow step failed after the collateral arrived, read afresh. */
export type BorrowStepFailure =
  | 'priceMoved'
  | 'noLiquidity'
  /** The pair is `coming-soon` now: the borrow action does not cover it. */
  | 'pairUnsupported';

export type DiagnoseBorrowStepInput = {
  /** The market, read after the failure. */
  snapshot: MarketSnapshot;
  collateral: Pick<CollateralReserve, 'asset'>;
  borrow: Pick<BorrowReserve, 'asset'>;
  /** The collateral supplied: the quote's minimum received, atomic. */
  collateralAmount: bigint;
  /** What the plan borrowed, atomic. */
  borrowAmount: bigint;
};

/**
 * Why a borrow step most likely failed, from a fresh snapshot: the borrow
 * action no longer covers the pair (`pairUnsupported`, checked first, so it
 * is not read as a lack of liquidity), the market can no longer lend the
 * amount (`noLiquidity`), or at the oracle's prices now the loan is above
 * the collateral's max LTV (`priceMoved`). `undefined` when none explains it.
 */
export const diagnoseBorrowStep = ({
  snapshot,
  collateral,
  borrow,
  collateralAmount,
  borrowAmount,
}: DiagnoseBorrowStepInput): BorrowStepFailure | undefined => {
  const { collateral: supplied, borrow: borrowed } = reservesIn(snapshot, {
    collateral,
    borrow,
  });

  if (
    [supplied, borrowed].some(
      (reserve) => reserve !== undefined && isComingSoon(reserve),
    )
  ) {
    return 'pairUnsupported';
  }

  if (checkLiquidity(snapshot, borrow, borrowAmount) === 'noLiquidity') {
    return 'noLiquidity';
  }

  if (!supplied || !borrowed) {
    return undefined;
  }

  const { collateralValue, debt } = loanValues({
    collateralAmount,
    collateral: supplied,
    borrowAmount,
    borrow: borrowed,
  });

  const ltv = ltvBps(debt, collateralValue);

  return ltv === null || ltv > BigInt(supplied.maxLtvBps)
    ? 'priceMoved'
    : undefined;
};
