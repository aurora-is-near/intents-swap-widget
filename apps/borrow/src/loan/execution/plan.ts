import {
  type ExecutionPlan,
  toQuoteAssetId,
} from '@aurora-is-near/intents-connect';

import type {
  BorrowReserve,
  CollateralReserve,
  LendingMarket,
  LendingMarketAdapter,
} from '../../markets/types';
import type { BorrowParams } from './recipe';

/** Basis points the bridge may slip by. */
export const BORROW_SLIPPAGE_BPS = 100;

/** The wallet token a borrow is funded with. */
export type BorrowOrigin = {
  /** 1Click asset id. */
  assetId: string;
  /** 1Click chain slug, such as `base`. */
  chain: string;
  decimals: number;
  /** Absent for the chain's gas token. */
  contractAddress?: string;
};

export type BorrowPlanInput = {
  adapter: Pick<LendingMarketAdapter, 'borrowRecipe'>;
  market: LendingMarket;
  collateral: CollateralReserve;
  borrow: BorrowReserve;
  origin: BorrowOrigin;
  /** What the user pays, in the origin token's atomic units. */
  amount: bigint;
  /** Borrowed, in borrow-token atomic units. */
  borrowAmount: bigint;
  /** Where the borrowed tokens go; the connected wallet when unset or empty. */
  recipient?: string;
};

/**
 * A plan that bridges `amount` of the user's token into the collateral on
 * the market's chain, where the intermediary supplies it and borrows, as
 * the adapter's borrow recipe says. Modelled on the Aave extension's
 * `buildAaveSupplyPlan`.
 */
export const buildBorrowPlan = ({
  adapter,
  market,
  collateral,
  borrow,
  origin,
  amount,
  borrowAmount,
  recipient,
}: BorrowPlanInput): ExecutionPlan<BorrowParams> => ({
  recipe: adapter.borrowRecipe({
    market,
    collateral,
    borrow,
    flow: 'bridge-in',
  }),
  params: {
    borrowAmount: borrowAmount.toString(),
    recipient: recipient === '' ? undefined : recipient,
  },
  // No deadline: each preview stamps a fresh one.
  quote: {
    // Native NEAR is quoted as wNEAR; its deposit wraps it.
    originAsset: toQuoteAssetId(origin),
    destinationAsset: collateral.assetId,
    amount: amount.toString(),
    swapType: 'EXACT_INPUT',
    slippageTolerance: BORROW_SLIPPAGE_BPS,
  },
  originChain: origin.chain,
  originToken: {
    contractAddress: origin.contractAddress,
    decimals: origin.decimals,
  },
  // The wallet holding the token sends the deposit.
  depositViaWallet: true,
});
