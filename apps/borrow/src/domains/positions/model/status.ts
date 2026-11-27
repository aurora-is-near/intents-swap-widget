import type { LoanStatus, PositionAsset } from '../types';

/**
 * Health below which a loan shows as close to liquidation: the at-risk banner
 * (Web-Position-AtRisk.dc.html) and the red health tone. Aave liquidates at 1.
 */
export const AT_RISK_HEALTH = 1.15;

/**
 * `repaid` with no debt but collateral left, `at-risk` with health below
 * `AT_RISK_HEALTH`, else `active`. Decided from the reserves, not their
 * dollar values, which are missing for an unpriced token. A loan whose health
 * is unknown is `active`: it is not shown as at risk on a guess.
 */
export const loanStatus = ({
  debt,
  collateral,
  health,
}: {
  debt: readonly PositionAsset[];
  collateral: readonly PositionAsset[];
  health: number | null;
}): LoanStatus => {
  if (debt.length === 0 && collateral.length > 0) {
    return 'repaid';
  }

  return health !== null && health < AT_RISK_HEALTH ? 'at-risk' : 'active';
};
