import type { AsyncRecipe, Recipe } from '@aurora-is-near/intents-connect';
import type { Address } from 'viem';

import type { BorrowParams } from '@/domains/borrow/utils/recipe';

/**
 * The boundary between screens and lending protocols. Screens import only
 * these types (and the hooks built on them), never a protocol's own module.
 *
 * The read side and the borrow recipe (Borrow execution) are declared;
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

/**
 * Why a listed reserve cannot take a new loan now:
 * - `cap-reached`: its supply cap (collateral) or borrow cap (borrow) is
 *   reached; it comes back once there is room.
 * - `coming-soon`: the borrow action (the hosted `aave-v3-borrow`) does
 *   not cover it yet, or the served action no longer accepts it. Takes
 *   the place of `cap-reached` when both hold.
 */
export type ReserveUnavailableReason = 'cap-reached' | 'coming-soon';

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
  /** Why it is `unavailable`, when the adapter knows. */
  unavailableReason?: ReserveUnavailableReason;
  /**
   * The wrapped native reserve (WETH), counted as supported because the
   * native token is delivered on its chain; it is supplied through Aave's
   * gateway (the borrow recipe replaces approve and supply with one
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
  /** Why it is `unavailable`, when the adapter knows. */
  unavailableReason?: ReserveUnavailableReason;
};

/** One market's reserves, all read at the same block. */
export type MarketSnapshot = {
  market: LendingMarket;
  /** The oracle's unit: `priceBase` of 1 in the base currency. */
  baseCurrencyUnit: bigint;
  collateral: CollateralReserve[];
  borrowable: BorrowReserve[];
};

/** What a borrow's recipe is built from: one pair on one market. */
export type BorrowRecipeInput = {
  market: LendingMarket;
  collateral: CollateralReserve;
  borrow: BorrowReserve;
  /**
   * `bridge-in` bridges the user's funds into the collateral first;
   * `steps-only` spends collateral already waiting at the intermediary (a
   * borrow whose borrow step failed after the collateral arrived).
   */
  flow: 'bridge-in' | 'steps-only';
};

export interface LendingMarketAdapter {
  /** Such as `aave-v3`. */
  id: string;
  listMarkets(): Promise<LendingMarket[]>;
  getMarketSnapshot(market: LendingMarket): Promise<MarketSnapshot>;
  /**
   * The borrow as an Intents Connect recipe, which owns its id, intent,
   * title, destination and steps (resolved by a hosted action, for Aave): once the collateral has arrived, the
   * intermediary supplies it for itself, borrows `params.borrowAmount`
   * against it and sends that to `params.recipient` (the connected wallet
   * when unset). The service's fee is the API key's fee configuration,
   * never a step. Throws for a market the adapter does not serve, or a pair
   * it cannot borrow.
   */
  borrowRecipe(
    input: BorrowRecipeInput,
  ): Recipe<BorrowParams> | AsyncRecipe<BorrowParams>;
}
