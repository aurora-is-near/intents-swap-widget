/**
 * The boundary between the positions screens and where positions are read
 * from. Screens import only these types and the positions hooks, never the
 * vaults.fyi reader or its responses.
 *
 * Ratios are fractions throughout (0.5 = 50%), dollar figures are numbers.
 * A figure the source does not give is `null`, never invented.
 */

/** One reserve of a loan: collateral supplied or debt borrowed. */
export type PositionAsset = {
  /**
   * The source's id for the underlying balance. One balance can be listed in
   * several markets, each time with this id, so totals count it once.
   */
  id: string;
  /** Token address, lowercase. */
  address: string;
  symbol: string;
  /** Whole tokens. */
  amount: number;
  /** Dollar value, `null` when the source has no price for it. */
  usd: number | null;
};

/**
 * - `active`: debt outstanding and not close to liquidation.
 * - `at-risk`: health below `AT_RISK_HEALTH` (model/status.ts).
 * - `repaid`: no debt left, collateral still supplied.
 */
export type LoanStatus = 'active' | 'at-risk' | 'repaid';

/** One loan: every reserve one owner has in one market on one network. */
export type LoanPosition = {
  /** `<network>:<marketId>:<owner>`, the same from every read. */
  id: string;
  /** The source's protocol id, such as `aave-v3`. */
  provider: string;
  /** Such as `Aave`. */
  providerName: string;
  /** The source's network slug, such as `base` or `arbitrum`. */
  network: string;
  /** Such as `Base`. */
  chainLabel: string;
  /** The source's market id, as it spells it (vaults.fyi's are case-sensitive). */
  marketId: string;
  /** Such as `Aave V3 Base`. */
  marketName: string;
  /** The account holding the loan, lowercase. */
  owner: string;
  /**
   * Borrow can manage it (Add collateral, Repay): an Aave V3 loan on one of
   * Borrow's markets, held by the user's intermediary. Others are read-only.
   */
  manageable: boolean;
  /** Largest first. */
  collateral: PositionAsset[];
  /** Largest first. */
  debt: PositionAsset[];
  collateralUsd: number;
  debtUsd: number;
  /** Debt over collateral. */
  ltv: number | null;
  /** The LTV at which the loan is liquidated. */
  liquidationLtv: number | null;
  /** Health factor; `null` with no debt. */
  health: number | null;
  /** The collateral price at which the loan is liquidated. */
  liquidationPrice: { symbol: string; usd: number } | null;
  /** Debt-weighted borrow rate, not compounded. */
  borrowApr: number | null;
  interestPerYearUsd: number | null;
  status: LoanStatus;
};

/** One market of one network, as the source names it. */
export type PositionMarketRef = {
  network: string;
  marketId: string;
};

/**
 * Per-asset risk and rate figures of one market, which a position read does
 * not carry. Keyed by the asset's address, lowercase.
 */
export type PositionMarketRisk = {
  assets: Record<
    string,
    {
      /** Fraction; `null` when the market does not say. */
      liquidationThreshold: number | null;
      /** Variable borrow rate as a fraction, not compounded. */
      borrowApr: number | null;
    }
  >;
};

/**
 * Where positions are read from. Every method throws on a failed or
 * unreadable answer: a read error is never an empty list.
 */
export interface PositionsReader {
  /**
   * Every loan of `owner` that has debt. Loans without debt (repaid) are left
   * out by the source; read those with `readMarketPosition`.
   */
  readOwnerPositions(owner: string): Promise<LoanPosition[]>;
  /** `owner`'s loan in one market, with or without debt; `null` if none. */
  readMarketPosition(
    owner: string,
    market: PositionMarketRef,
  ): Promise<LoanPosition | null>;
  /** The figures a loan in `market` needs beyond the position read. */
  readMarketRisk(market: PositionMarketRef): Promise<PositionMarketRisk>;
  /**
   * Borrow's own markets, read per market for each owner so a repaid loan
   * (collateral left, no debt) still shows.
   */
  repaidMarkets(): readonly PositionMarketRef[];
}
