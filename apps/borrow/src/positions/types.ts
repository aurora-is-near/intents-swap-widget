import type { LendingMarket } from '../markets/types';

/**
 * The boundary between the positions screens and the provider they are read
 * from (vaults.fyi). Screens import only these types and the hooks built on
 * them, never a provider's response.
 */

/** One reserve of a loan: supplied collateral or borrowed debt. */
export type PositionAsset = {
  symbol: string;
  /** In whole tokens. */
  amount: number;
  /** `null` when the provider gives no price. */
  usd: number | null;
};

/**
 * One loan: every reserve an owner holds in one lending market on one chain.
 * A figure the provider does not return is `null`, never invented.
 */
export type LoanPosition = {
  /**
   * `<provider>:<network>:<marketId>:<owner>`: the same loan read through the
   * wallet-wide list and the single-market read has the same id, so the two
   * deduplicate.
   */
  id: string;
  /** Such as `aave-v3`. */
  provider: string;
  /** Such as `Aave`. */
  providerName: string;
  /** The provider's network name, such as `base`. */
  network: string;
  /** The provider's market id on `network`. */
  marketId: string;
  /** Such as `Base`. */
  chainLabel: string;
  marketName: string;
  /** The account holding the loan, lowercase. */
  owner: string;
  /** Aave V3 on Base or Arbitrum, owned by the intermediary. */
  manageable: boolean;
  collateral: PositionAsset[];
  debt: PositionAsset[];
  collateralUsd: number;
  debtUsd: number;
  /** As fractions (0.5 = 50%). */
  ltv: number | null;
  liquidationLtv: number | null;
  health: number | null;
  liquidationPrice: { symbol: string; usd: number } | null;
  /** Debt-weighted, as a fraction. */
  borrowApr: number | null;
  interestPerYearUsd: number | null;
  status: 'active' | 'at-risk' | 'repaid';
};

/** A market's risk figures, for a position whose read lacked them. */
export type PositionMarketRisk = {
  liquidationLtv: number | null;
  borrowApr: number | null;
};

/**
 * Where positions are read from. Every method throws on a failed or
 * unreadable response, so a failure shows as a read error, never as an empty
 * list.
 */
export interface PositionsReader {
  /** Every loan of `owner` with outstanding debt, on any market. */
  readOwnerPositions(owner: string): Promise<LoanPosition[]>;
  /**
   * `owner`'s loan in one of Borrow's markets, with or without debt (a repaid
   * loan still holds collateral); `null` when there is none.
   */
  readMarketPosition(
    owner: string,
    market: LendingMarket,
  ): Promise<LoanPosition | null>;
  /** The risk figures of a position's market. */
  readMarketRisk(
    market: Pick<LoanPosition, 'network' | 'marketId'>,
  ): Promise<PositionMarketRisk>;
}
