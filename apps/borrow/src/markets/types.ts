import type { Step } from '@aurora-is-near/intents-connect';
import type { Address } from 'viem';

/**
 * The boundary between screens and lending protocols. Screens import only
 * these types (and the hooks built on them), never a protocol's own module.
 *
 * The read side and the borrow step builder (Borrow execution) are declared;
 * position reading is added by the feature that needs it (My positions).
 */

/** One deployment of a lending protocol on one chain. */
export type LendingMarket = {
  /** `<adapter id>:<chain slug>`, such as `aave-v3:base`. */
  id: string;
  /** The adapter that serves it, such as `aave-v3`. */
  provider: string;
  /** As shown in the market list, such as `Aave`. */
  name: string;
  /** The SDK's chain slug (`EVM_CHAIN_IDS`), such as `base`. */
  chain: string;
  chainId: number;
  /** Such as `Base`. */
  chainLabel: string;
};

/** A reserve that can be supplied as collateral. */
export type CollateralReserve = {
  asset: Address;
  symbol: string;
  decimals: number;
  /** The Intents Connect (1Click) asset id that delivers it. */
  assetId: string;
  /** Max loan-to-value, in basis points (7500 = 75%). */
  maxLtvBps: number;
  /** Loan-to-value at which the position can be liquidated, in bps. */
  liquidationLtvBps: number;
  /** Price of one whole token in the oracle's base currency units. */
  priceBase: bigint;
  /** Listed but not suppliable now, such as when the supply cap is reached. */
  unavailable?: boolean;
  /**
   * The wrapped native reserve (WETH), counted as supported because the
   * native token is delivered on its chain; it is supplied through Aave's
   * gateway (`buildBorrowSteps` replaces approve and supply with one
   * gateway deposit sent the native amount).
   */
  nativeDelivery?: boolean;
};

/** A reserve that can be borrowed. */
export type BorrowReserve = {
  asset: Address;
  symbol: string;
  decimals: number;
  /** The Intents Connect (1Click) asset id that delivers it. */
  assetId: string;
  /** Variable borrow rate as a fraction (0.0485 = 4.85%), not compounded. */
  variableBorrowApr: number;
  /** What can be borrowed now, in token units, after any borrow cap. */
  availableLiquidity: bigint;
  /** Price of one whole token in the oracle's base currency units. */
  priceBase: bigint;
  /** Listed but not borrowable now, such as when the borrow cap is reached. */
  unavailable?: boolean;
};

/** One market's reserves, all read at the same block. */
export type MarketSnapshot = {
  market: LendingMarket;
  blockNumber: bigint;
  /** The oracle's unit: `priceBase` of 1 in the base currency. */
  baseCurrencyUnit: bigint;
  collateral: CollateralReserve[];
  borrowable: BorrowReserve[];
};

/** What a borrow's steps are built from: one supply, then one borrow. */
export type BuildBorrowStepsInput = {
  market: LendingMarket;
  collateral: CollateralReserve;
  borrow: BorrowReserve;
  /**
   * The collateral supplied, atomic. OPAQUE: it may be the
   * `{MIN_AMOUNT_OUT}` placeholder, so it is templated, never inspected.
   */
  amount: string;
  /** Borrowed, in borrow-token atomic units: always a literal. */
  borrowAmount: string;
  /** Who the position belongs to: the supply's and the debt's account. */
  owner: string;
  /** Who the borrowed tokens are sent to. */
  recipient: string;
};

export interface LendingMarketAdapter {
  /** Such as `aave-v3`. */
  id: string;
  /** Such as `Aave`. */
  name: string;
  listMarkets(): Promise<LendingMarket[]>;
  getMarketSnapshot(market: LendingMarket): Promise<MarketSnapshot>;
  /**
   * The steps the intermediary runs once the collateral has arrived: supply
   * it for `owner`, borrow against it and send the borrowed tokens to
   * `recipient`. The service's fee is the API key's fee configuration,
   * never a step. Throws for a market the adapter does not serve.
   */
  buildBorrowSteps(input: BuildBorrowStepsInput): Step[];
}
