import type { Recipe } from '@aurora-is-near/intents-connect';

import {
  AAVE_BORROW_INTENT,
  type AaveBorrowAsset,
  type AaveBorrowChain,
  type AaveCollateralAsset,
} from './aaveBorrow/constants';
import {
  aaveBorrowTitle,
  buildAaveBorrowSteps,
  lookupAaveBorrowPair,
} from './aaveBorrow/resolve';

/**
 * The `aave-v3-borrow` action as an `@aurora-is-near/intents-connect` recipe,
 * for callers that run it through the SDK's runner instead of the hosted
 * action. A separate entry (`@aurora-is-near/intents-connect-actions/sdk`):
 * the resolver and its tables (the main entry) stay free of the SDK.
 */

export { AAVE_BORROW_INTENT };

/** What a borrow's steps need beyond the step context. */
export type BorrowParams = {
  /**
   * Borrowed, in borrow-token atomic units. A literal: the caller sizes it
   * (from the quote's minimum received), so it can't be templated.
   */
  borrowAmount: string;
  /** Where the borrowed tokens go; the connected wallet when unset. */
  recipient?: string;
};

export type AaveBorrowRecipeInput = {
  chain: AaveBorrowChain;
  collateral: AaveCollateralAsset;
  borrowAsset: AaveBorrowAsset;
  /**
   * `bridge-in` (the default) bridges the user's funds into the collateral;
   * `steps-only` spends collateral the intermediary already holds.
   */
  flow?: 'bridge-in' | 'steps-only';
};

/**
 * Bridges into `collateral` on `chain`, where the intermediary supplies it to
 * Aave V3, borrows `params.borrowAmount` of `borrowAsset` and sends it to
 * `params.recipient` (the connected wallet when unset): the action's steps,
 * built with the step context's real values. The intermediary owns the
 * position: it runs the steps, and Aave lets an account borrow only against
 * its own collateral. `ctx.amount` is opaque (it may be `{MIN_AMOUNT_OUT}`)
 * and passed through untouched.
 *
 * The id is the one the Borrow app files its borrows under
 * (`aave-borrow:<market id>:<collateral>:<borrow>`, its market id being
 * `aave-v3:<chain>`), with each token as 1Click lists it.
 *
 * Throws when the chain lacks either symbol.
 */
export const aaveBorrowRecipe = ({
  chain,
  collateral,
  borrowAsset,
  flow = 'bridge-in',
}: AaveBorrowRecipeInput): Recipe<BorrowParams> => {
  const pair = lookupAaveBorrowPair(chain, collateral, borrowAsset);

  if ('error' in pair) {
    throw new Error(`aave-v3-borrow: ${pair.error}`);
  }

  return {
    id: `aave-borrow:aave-v3:${chain}:${pair.collateral.label}:${pair.borrow.label}`,
    intent: AAVE_BORROW_INTENT,
    title: aaveBorrowTitle(pair),
    flow,
    type: 'evm',
    destination: {
      chain,
      assetId: pair.collateral.assetId,
      // Native delivery arrives as the chain's gas token: no contract.
      tokenAddress: pair.collateral.native
        ? undefined
        : pair.collateral.address,
    },
    buildSteps: (ctx, params) =>
      buildAaveBorrowSteps({
        chain,
        collateral,
        borrowAsset,
        collateralAmount: ctx.amount,
        borrowAmount: params.borrowAmount,
        owner: ctx.intermediary,
        recipient: params.recipient ?? ctx.userAddress,
      }),
  };
};
