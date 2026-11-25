import type { Recipe } from '@aurora-is-near/intents-connect';
import {
  AAVE_BORROW_INTENT,
  type BorrowParams,
} from '@aurora-is-near/intents-connect-actions/sdk';

import type {
  BorrowReserve,
  CollateralReserve,
  LendingMarket,
  LendingMarketAdapter,
} from '../../markets/types';

/**
 * From the `aave-v3-borrow` action's recipe
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

/**
 * Bridges the user's funds into `collateral` on the market's chain, where
 * the intermediary supplies it, borrows `params.borrowAmount` of `borrow`
 * and sends it to the recipient.
 *
 * The intermediary owns the position (decided: "Who owns the Aave
 * position"): it runs the steps, and Aave lets an account borrow only on its
 * own collateral. `ctx.amount` is opaque (it may be `{MIN_AMOUNT_OUT}`), so
 * it is passed through, never inspected.
 *
 * The steps are the adapter's (`buildBorrowSteps`); the Aave adapter builds
 * them with the `aave-v3-borrow` action's step builder.
 *
 * With `flow: 'steps-only'` nothing is bridged: the same steps spend the
 * collateral already waiting at the intermediary (a borrow whose borrow step
 * failed after the collateral arrived; see `stepsRetry.ts`).
 */
export const aaveBorrowRecipe = (
  adapter: Pick<LendingMarketAdapter, 'buildBorrowSteps'>,
  market: LendingMarket,
  collateral: CollateralReserve,
  borrow: BorrowReserve,
  flow: 'bridge-in' | 'steps-only' = 'bridge-in',
): Recipe<BorrowParams> => ({
  id: `aave-borrow:${market.id}:${collateral.symbol}:${borrow.symbol}`,
  intent: AAVE_BORROW_INTENT,
  title: `Borrow ${borrow.symbol} against ${collateral.symbol} on ${market.name} ${market.chainLabel}`,
  flow,
  type: 'evm',
  destination: collateralDestination(market, collateral),
  buildSteps: (ctx, params) =>
    adapter.buildBorrowSteps({
      market,
      collateral,
      borrow,
      amount: ctx.amount,
      borrowAmount: params.borrowAmount,
      owner: ctx.intermediary,
      recipient: params.recipient ?? ctx.userAddress,
    }),
});
