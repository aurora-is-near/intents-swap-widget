import type { Recipe } from '@aurora-is-near/intents-connect';

import type { CollateralReserve, LendingMarket } from '@/domains/markets/types';

/**
 * A borrow's recipe is the market adapter's (`LendingMarketAdapter
 * .borrowRecipe`; for Aave, the hosted `aave-v3-borrow` action), which owns
 * its id, intent, title, destination and steps.
 *
 * `AAVE_BORROW_INTENT` is what every borrow Borrow runs is filed as
 * (`recipe.intent`, echoed in an execution's `metadata.intent`); an
 * in-flight borrow is found by it after a reload.
 */
export { AAVE_BORROW_INTENT } from '@/domains/markets/aaveV3/config/borrowAction';

/** What a borrow's steps need beyond the step context. */
export type BorrowParams = {
  /**
   * Borrowed, in borrow-token atomic units. A literal: the caller sizes it
   * from the quote's minimum received (`previewBorrow`).
   */
  borrowAmount: string;
  /** Where the borrowed tokens go; the connected wallet when unset. */
  recipient?: string;
  /**
   * Bridge-in only: the bridged asset and amount, as in the plan's quote. A
   * hosted action resolves its whole body from them; the runner keeps its
   * own quote and takes only the steps.
   */
  originAsset?: string;
  /** Bridge-in only: the bridged amount, in the origin token's atomic units. */
  originAmount?: string;
};

/** A recipe's `destination`: the token the intermediary receives, and where. */
export type CollateralDestination = Recipe<BorrowParams>['destination'];

/** Where the collateral arrives: the intermediary on the market's chain. */
export const collateralDestination = (
  market: Pick<LendingMarket, 'chain'>,
  collateral: Pick<CollateralReserve, 'assetId' | 'asset' | 'nativeDelivery'>,
): CollateralDestination => ({
  chain: market.chain,
  assetId: collateral.assetId,
  // Native delivery arrives as the chain's gas token: no contract.
  tokenAddress:
    collateral.nativeDelivery === true ? undefined : collateral.asset,
});
