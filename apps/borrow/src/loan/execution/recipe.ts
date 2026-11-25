import type { Recipe } from '@aurora-is-near/intents-connect';
import {
  AAVE_BORROW_INTENT,
  type BorrowParams,
} from '@aurora-is-near/intents-connect-actions/sdk';

import type { CollateralReserve, LendingMarket } from '../../markets/types';

/**
 * A borrow's recipe is the market adapter's (`LendingMarketAdapter
 * .borrowRecipe`; for Aave, the `aave-v3-borrow` action's own recipe), which
 * owns its id, intent, title, destination and steps. From that recipe
 * (`@aurora-is-near/intents-connect-actions/sdk`):
 * - `AAVE_BORROW_INTENT`: what every borrow Borrow runs is filed as
 *   (`recipe.intent`, echoed in an execution's `metadata.intent`); an
 *   in-flight borrow is found by it after a reload.
 * - `BorrowParams`: what a borrow's steps need beyond the step context, a
 *   literal `borrowAmount` (sized from the quote's minimum received, see
 *   `previewBorrow`) and an optional `recipient`.
 */
export { AAVE_BORROW_INTENT, type BorrowParams };

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
