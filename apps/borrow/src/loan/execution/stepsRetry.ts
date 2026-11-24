import {
  getIntermediaryBalance,
  type StepsPlan,
  type StepsPreview,
} from '@aurora-is-near/intents-connect';

import { RPC_URL_ARB, RPC_URL_BASE } from '../../config';
import type {
  BorrowReserve,
  CollateralReserve,
  LendingMarket,
  LendingMarketAdapter,
  MarketSnapshot,
} from '../../markets/types';
import { loanFigures } from '../model/loanFigures';
import { BorrowPreCheckError } from './classifyBorrowError';
import { checkLiquidity } from './liquidity';
import { BorrowPreviewError, borrowTolerance } from './preview';
import {
  aaveBorrowRecipe,
  type BorrowParams,
  collateralDestination,
} from './recipe';

/*
 * The retry of a borrow whose borrow step failed after the collateral had
 * arrived (`OPERATION_FAILED`): the collateral waits at the intermediary, so
 * nothing is bridged again. The borrow is re-sized on the market read afresh
 * and the same steps run steps-only, spending what waits, as the Aave
 * extension's `buildAaveStepsPlan` does for a failed supply. Decided in the
 * plan review: "Re-quote and retry with a steps-only run from the waiting
 * funds".
 */

/** The markets' chains, by id, with the RPCs Borrow reads them through. */
const RPC_URLS: Readonly<Record<number, string>> = {
  8453: RPC_URL_BASE,
  42161: RPC_URL_ARB,
};

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
  adapter: Pick<LendingMarketAdapter, 'buildBorrowSteps'>;
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
  recipe: aaveBorrowRecipe(adapter, market, collateral, borrow, 'steps-only'),
  params: {
    borrowAmount: borrowAmount.toString(),
    recipient: recipient === '' ? undefined : recipient,
  },
  amount: amount.toString(),
  feeFromAmount: true,
});

export type PreviewBorrowStepsInput = {
  /** Builds the steps, and reads the market afresh. */
  adapter: Pick<LendingMarketAdapter, 'buildBorrowSteps' | 'getMarketSnapshot'>;
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
  /** Reads the waiting collateral; `readWaitingCollateral` by default. */
  readWaiting?: (input: WaitingCollateralInput) => Promise<bigint>;
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

const sameAsset = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** The snapshot's reserves for the loan, else the ones it was started with. */
const freshReserves = (
  snapshot: MarketSnapshot,
  collateral: CollateralReserve,
  borrow: BorrowReserve,
) => ({
  collateral:
    snapshot.collateral.find(({ asset }) =>
      sameAsset(asset, collateral.asset),
    ) ?? collateral,
  borrow:
    snapshot.borrowable.find(({ asset }) => sameAsset(asset, borrow.asset)) ??
    borrow,
});

/**
 * The steps-only dry run, in two passes as `previewBorrow`, because the
 * borrow amount is a literal and the fee is only known from a dry run:
 * 1. The market is read afresh (the price moved, or liquidity ran out, which
 *    is why the borrow failed), and the collateral waiting is read.
 * 2. A dry run at that amount gives `spendable`, what is supplied once the
 *    fee is carved out; the borrow is the chosen LTV of it less
 *    `QUOTE_BUFFER_BPS` at the fresh oracle prices (`borrowTolerance`, as
 *    `previewBorrow`); a second dry run builds the final steps with it.
 * 3. The final `spendable` must still cover that borrow at the chosen LTV
 *    (a drop within the buffer passes, a larger one is `quoteMoved`), and
 *    the market must be able to lend it.
 */
export const previewBorrowSteps = async ({
  adapter,
  market,
  ltv,
  recipient,
  intermediary,
  previewSteps,
  readWaiting = readWaitingCollateral,
  ...reserves
}: PreviewBorrowStepsInput): Promise<BorrowStepsPreview> => {
  const snapshot = await adapter.getMarketSnapshot(market);
  const { collateral, borrow } = freshReserves(
    snapshot,
    reserves.collateral,
    reserves.borrow,
  );

  const waiting = await readWaiting({ intermediary, market, collateral });

  if (waiting <= 0n) {
    throw new BorrowPreviewError(
      'nothingWaiting',
      'No collateral is waiting at the intermediary',
    );
  }

  // `spendable` is already net of the service's fee.
  const { sizeBorrow, quoteHeld } = borrowTolerance({
    collateral,
    borrow,
    ltv,
  });

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
  const first = await previewSteps(
    planFor(
      loanFigures({
        collateralAmount: waiting,
        collateral,
        borrow,
        ltv,
        feeBps: 0,
      }).borrowAmount,
    ),
  );

  const borrowAmount = sizeBorrow(BigInt(first.spendable));

  if (borrowAmount <= 0n) {
    throw new BorrowPreviewError(
      'nothingToBorrow',
      'The collateral waiting is too small to borrow against',
    );
  }

  const final = await previewSteps(planFor(borrowAmount));

  if (!quoteHeld(BigInt(final.spendable), borrowAmount)) {
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
