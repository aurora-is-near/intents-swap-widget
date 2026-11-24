import type { Recipe } from '@aurora-is-near/intents-connect';

import type {
  BorrowReserve,
  CollateralReserve,
  LendingMarket,
  LendingMarketAdapter,
} from '../../markets/types';

/**
 * What every borrow Borrow runs is filed as (`recipe.intent`, echoed in an
 * execution's `metadata.intent`): an in-flight borrow is found by it after a
 * reload.
 */
export const AAVE_BORROW_INTENT = 'aave_borrow';

/** What a borrow's steps need beyond the step context. */
export type BorrowParams = {
  /**
   * Borrowed, in borrow-token atomic units. A literal: it is sized from the
   * quote's minimum received (see `previewBorrow`), so it can't be templated.
   */
  borrowAmount: string;
  /** Where the borrowed tokens go; the connected wallet when unset. */
  recipient?: string;
};

/**
 * Bridges the user's funds into `collateral` on the market's chain, where
 * the intermediary supplies it, borrows `params.borrowAmount` of `borrow`
 * and sends it to the recipient.
 *
 * The intermediary owns the position (decided: "Who owns the Aave
 * position"): it runs the steps, and Aave lets an account borrow only on its
 * own collateral. `ctx.amount` is opaque (it may be `{MIN_AMOUNT_OUT}`), so
 * it is passed through, never inspected.
 */
export const aaveBorrowRecipe = (
  adapter: Pick<LendingMarketAdapter, 'buildBorrowSteps'>,
  market: LendingMarket,
  collateral: CollateralReserve,
  borrow: BorrowReserve,
): Recipe<BorrowParams> => ({
  id: `aave-borrow:${market.id}:${collateral.symbol}:${borrow.symbol}`,
  intent: AAVE_BORROW_INTENT,
  title: `Borrow ${borrow.symbol} against ${collateral.symbol} on ${market.name} ${market.chainLabel}`,
  flow: 'bridge-in',
  type: 'evm',
  destination: {
    chain: market.chain,
    assetId: collateral.assetId,
    // Native delivery arrives as the chain's gas token: no contract.
    tokenAddress:
      collateral.nativeDelivery === true ? undefined : collateral.asset,
  },
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
