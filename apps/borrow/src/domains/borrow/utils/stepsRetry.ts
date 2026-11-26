import { getIntermediaryBalance } from '@aurora-is-near/intents-connect';
import type { StepsPlan, StepsPreview } from '@aurora-is-near/intents-connect';

import { RPC_URLS } from '@/config';
import { isComingSoon } from '@/domains/markets/utils/availability';
import { loanFigures } from '@/domains/loan/model/loanFigures';
import type {
  BorrowReserve,
  CollateralReserve,
  LendingMarket,
  LendingMarketAdapter,
} from '@/domains/markets/types';

import {
  BorrowPreCheckError,
  checkLiquidity,
  reservesIn,
} from './classifyBorrowError';
import { BorrowPreviewError } from './preview';
import { collateralDestination } from './recipe';
import type { BorrowParams } from './recipe';

/*
 * The retry of a borrow whose borrow step failed after the collateral had
 * arrived (`OPERATION_FAILED`): the collateral waits at the intermediary, so
 * nothing is bridged again. The borrow is re-sized on the market read afresh
 * and the same steps run steps-only, spending what waits, as the Aave
 * extension's `buildAaveStepsPlan` does for a failed supply. Decided in the
 * plan review: "Re-quote and retry with a steps-only run from the waiting
 * funds".
 */

export type WaitingCollateralInput = {
  /** The wallet's intermediary (`execution.details.intermediaryAddress`). */
  intermediary: string;
  market: Pick<LendingMarket, 'chain' | 'chainId'>;
  collateral: Pick<CollateralReserve, 'assetId' | 'asset' | 'nativeDelivery'>;
};

/**
 * What the intermediary holds of the collateral, atomic: the SDK's
 * `getIntermediaryBalance` through Borrow's RPC for the market's chain.
 * Throws on an RPC failure; never reads one as zero.
 */
export const readWaitingCollateral = async ({
  intermediary,
  market,
  collateral,
}: WaitingCollateralInput): Promise<bigint> => {
  const url = RPC_URLS[market.chainId];

  return BigInt(
    await getIntermediaryBalance({
      intermediary: { evm: intermediary },
      destination: collateralDestination(market, collateral),
      ...(url ? { rpcs: { [market.chain]: [url] } } : {}),
    }),
  );
};

export type BorrowStepsPlanInput = {
  adapter: Pick<LendingMarketAdapter, 'borrowRecipe'>;
  market: LendingMarket;
  collateral: CollateralReserve;
  borrow: BorrowReserve;
  /** The collateral waiting, atomic: the gross amount the steps spend. */
  amount: bigint;
  /** Borrowed, in borrow-token atomic units. */
  borrowAmount: bigint;
  /** Where the borrowed tokens go; the connected wallet when unset or empty. */
  recipient?: string;
};

/**
 * The borrow's steps as a steps-only plan over the waiting collateral. The
 * service's fee comes out of that collateral (`feeFromAmount`), so the
 * steps supply `amount − fee`: the preview's `spendable`.
 */
export const buildBorrowStepsPlan = ({
  adapter,
  market,
  collateral,
  borrow,
  amount,
  borrowAmount,
  recipient,
}: BorrowStepsPlanInput): StepsPlan<BorrowParams> => ({
  recipe: adapter.borrowRecipe({
    market,
    collateral,
    borrow,
    flow: 'steps-only',
  }),
  params: {
    borrowAmount: borrowAmount.toString(),
    recipient: recipient === '' ? undefined : recipient,
  },
  amount: amount.toString(),
  feeFromAmount: true,
});

export type PreviewBorrowStepsInput = {
  /** Builds the steps, and reads the market afresh. */
  adapter: Pick<LendingMarketAdapter, 'borrowRecipe' | 'getMarketSnapshot'>;
  market: LendingMarket;
  collateral: CollateralReserve;
  borrow: BorrowReserve;
  /** The slider's loan-to-value, in whole percent. */
  ltv: number;
  recipient?: string;
  intermediary: string;
  /** `useExecution().previewSteps`. */
  previewSteps: (
    plan: StepsPlan<BorrowParams>,
  ) => Promise<StepsPreview<BorrowParams>>;
};

export type BorrowStepsPreview = {
  /** The final dry run. Hand `steps.plan` to `runSteps()` as it is. */
  steps: StepsPreview<BorrowParams>;
  /** What the final plan borrows, in borrow-token atomic units. */
  borrowAmount: bigint;
  /** The reserves read afresh, which the borrow was sized at. */
  collateral: CollateralReserve;
  borrow: BorrowReserve;
};

/**
 * The steps-only dry run, in two passes as `previewBorrow`, because the
 * borrow amount is a literal and the fee is only known from a dry run:
 * 1. The market is read afresh (the price moved, or liquidity ran out, which
 *    is why the borrow failed), and the collateral waiting is read. A pair
 *    the borrow action no longer covers (`coming-soon`) is refused first:
 *    its steps can't be built.
 * 2. A dry run at that amount gives `spendable`, what is supplied once the
 *    fee is carved out; the borrow is the chosen LTV of it at the fresh
 *    oracle prices; a second dry run builds the final steps with it.
 * 3. The final `spendable` must still cover that borrow, and the market must
 *    be able to lend it.
 */
export const previewBorrowSteps = async ({
  adapter,
  market,
  ltv,
  recipient,
  intermediary,
  previewSteps,
  ...reserves
}: PreviewBorrowStepsInput): Promise<BorrowStepsPreview> => {
  const snapshot = await adapter.getMarketSnapshot(market);
  // The snapshot's reserves for the loan, else the ones it was started with.
  const fresh = reservesIn(snapshot, reserves);
  const collateral = fresh.collateral ?? reserves.collateral;
  const borrow = fresh.borrow ?? reserves.borrow;

  if (isComingSoon(collateral) || isComingSoon(borrow)) {
    throw new BorrowPreviewError(
      'pairUnsupported',
      `${market.name} on ${market.chainLabel} no longer opens loans of ${borrow.symbol} against ${collateral.symbol}`,
    );
  }

  const waiting = await readWaitingCollateral({
    intermediary,
    market,
    collateral,
  });

  if (waiting <= 0n) {
    throw new BorrowPreviewError(
      'nothingWaiting',
      'No collateral is waiting at the intermediary',
    );
  }

  const borrowOn = (collateralAmount: bigint) =>
    loanFigures({
      collateralAmount,
      collateral,
      borrow,
      ltv,
      // `spendable` is already net of the service's fee.
      feeBps: 0,
    }).borrowAmount;

  const planFor = (borrowAmount: bigint) =>
    buildBorrowStepsPlan({
      adapter,
      market,
      collateral,
      borrow,
      amount: waiting,
      borrowAmount,
      recipient,
    });

  // The first pass only learns the fee: its borrow is sized on the gross.
  const first = await previewSteps(planFor(borrowOn(waiting)));
  const borrowAmount = borrowOn(BigInt(first.spendable));

  if (borrowAmount <= 0n) {
    throw new BorrowPreviewError(
      'nothingToBorrow',
      'The collateral waiting is too small to borrow against',
    );
  }

  const final = await previewSteps(planFor(borrowAmount));

  if (borrowOn(BigInt(final.spendable)) < borrowAmount) {
    throw new BorrowPreviewError(
      'quoteMoved',
      'The fee moved while preparing the loan; try again',
    );
  }

  if (checkLiquidity(snapshot, borrow, borrowAmount) === 'noLiquidity') {
    throw new BorrowPreCheckError(
      'noLiquidity',
      `${market.name} can't lend ${borrow.symbol} at this size now`,
    );
  }

  return { steps: final, borrowAmount, collateral, borrow };
};
