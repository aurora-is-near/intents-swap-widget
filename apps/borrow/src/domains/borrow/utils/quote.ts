import {
  BorrowPreCheckError,
  checkLiquidity,
  checkOriginGas,
} from './borrowPreChecks';
import { previewBorrow } from './preview';
import { borrowPreviewFigures, stepsPreviewFigures } from './previewFigures';
import { previewBorrowSteps } from './stepsRetry';
import type { BorrowFlowInput } from '../flow/types';
import type { BorrowPreview, PreviewBorrowPlan } from './preview';
import type { BorrowPreviewFigures } from './previewFigures';
import type { BorrowStepsPreview, PreviewBorrowStepsInput } from './stepsRetry';

/** An accepted dry run and the figures the dialog shows for it. */
export type Quoted = {
  preview: BorrowPreview | BorrowStepsPreview;
  figures: BorrowPreviewFigures;
};

/**
 * Gas pre-check, the two-pass dry run and the liquidity pre-check, over the
 * runner's `preview`.
 */
export const quoteBorrow = async (
  input: BorrowFlowInput,
  preview: PreviewBorrowPlan,
): Promise<Quoted> => {
  const { adapter, fundingRows, ...previewInput } = input;

  if (
    checkOriginGas({
      rows: fundingRows,
      origin: input.origin,
      amount: input.amount,
    }) === 'short'
  ) {
    throw new BorrowPreCheckError(
      'noGas',
      `Not enough gas on ${input.origin.chain} for the deposit`,
    );
  }

  // The market is read while the dry runs run: the liquidity check needs
  // both. A dry-run failure is still the one reported; the read's own
  // failure counts only once the dry runs succeed.
  const reading = adapter.getMarketSnapshot(input.market);

  reading.catch(() => {});

  const previewed = await previewBorrow({ ...previewInput, adapter, preview });
  const snapshot = await reading;

  if (
    checkLiquidity(snapshot, input.borrow, previewed.borrowAmount) ===
    'noLiquidity'
  ) {
    throw new BorrowPreCheckError(
      'noLiquidity',
      `${input.market.name} can't lend ${input.borrow.symbol} at this size now`,
    );
  }

  return {
    preview: previewed,
    figures: borrowPreviewFigures({
      execution: previewed.preview.execution,
      borrowAmount: previewed.borrowAmount,
      paid: {
        assetId: input.origin.assetId,
        decimals: input.origin.decimals,
      },
      collateral: input.collateral,
      borrow: input.borrow,
    }),
  };
};

/** The steps-only dry runs over the collateral waiting at `intermediary`. */
export const quoteBorrowSteps = async (
  input: BorrowFlowInput,
  intermediary: string,
  previewSteps: PreviewBorrowStepsInput['previewSteps'],
): Promise<Quoted> => {
  const previewed = await previewBorrowSteps({
    adapter: input.adapter,
    market: input.market,
    collateral: input.collateral,
    borrow: input.borrow,
    ltv: input.ltv,
    recipient: input.recipient,
    intermediary,
    previewSteps,
  });

  return {
    preview: previewed,
    figures: stepsPreviewFigures({
      spendable: BigInt(previewed.steps.spendable),
      networkFee:
        previewed.steps.networkFee === undefined
          ? undefined
          : BigInt(previewed.steps.networkFee),
      borrowAmount: previewed.borrowAmount,
      collateral: previewed.collateral,
      borrow: previewed.borrow,
    }),
  };
};
