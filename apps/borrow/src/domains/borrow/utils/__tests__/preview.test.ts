import { describe, expect, it, vi } from 'vitest';
import type { ExecutionPreview } from '@aurora-is-near/intents-connect';

import { dryExecution, dryPreview } from '@/tests/executionFixtures';
import { createFakeAdapter, FAKE_BASE, usdc, weth } from '@/tests/fakeMarkets';

import { BorrowPreviewError, previewBorrow } from '../preview';
import type { PreviewBorrowInput, PreviewBorrowPlan } from '../preview';
import type { BorrowParams } from '../recipe';

/** 0.99 WETH at $3,000 at LTV 50%: $1,485. */
const BORROW_AT_MINIMUM = '1485000000';

const input = (preview: PreviewBorrowPlan): PreviewBorrowInput => ({
  preview,
  adapter: createFakeAdapter(),
  market: FAKE_BASE,
  collateral: weth(),
  borrow: usdc(),
  origin: { assetId: 'nep141:arb-usdc', chain: 'arb', decimals: 6 },
  amount: 3_000_000_000n,
  ltv: 50,
  estimatedBorrowAmount: 1_500_000_000n,
});

describe('previewBorrow', () => {
  it("dry-runs the form's estimate, then the chosen LTV of the minimum received", async () => {
    const preview = vi.fn<PreviewBorrowPlan>(async (plan) => dryPreview(plan));

    const result = await previewBorrow(input(preview));

    expect(preview).toHaveBeenCalledTimes(2);
    expect(preview.mock.calls[0]?.[0].params.borrowAmount).toBe('1500000000');
    expect(preview.mock.calls[1]?.[0].params.borrowAmount).toBe(
      BORROW_AT_MINIMUM,
    );
    expect(result.borrowAmount).toBe(1_485_000_000n);
  });

  it("hands the second dry run's plan on as it is, for run()", async () => {
    let second: ExecutionPreview<BorrowParams> | undefined;
    const preview = vi
      .fn<PreviewBorrowPlan>()
      .mockImplementationOnce(async (plan) => dryPreview(plan))
      .mockImplementationOnce(async (plan) => {
        second = dryPreview(plan);

        return second;
      });

    const result = await previewBorrow(input(preview));

    expect(result.preview).toBe(second);
    expect(result.preview.plan).toBe(second?.plan);
    expect(result.preview.plan.params.borrowAmount).toBe(BORROW_AT_MINIMUM);
  });

  it('refuses a final dry run whose minimum received no longer covers the borrow', async () => {
    const preview = vi
      .fn<PreviewBorrowPlan>()
      .mockImplementationOnce(async (plan) => dryPreview(plan))
      // 0.98 WETH: $1,485 would be about 50.5% of it, above the chosen 50%.
      .mockImplementationOnce(async (plan) =>
        dryPreview(plan, dryExecution({ minAmountOut: '980000000000000000' })),
      );

    const error = await previewBorrow(input(preview)).catch((e) => e);

    expect(error).toBeInstanceOf(BorrowPreviewError);
    expect(error.reason).toBe('quoteMoved');
    expect(preview).toHaveBeenCalledTimes(2);
  });

  it('accepts a final dry run whose minimum received moved up: the LTV only falls', async () => {
    const preview = vi
      .fn<PreviewBorrowPlan>()
      .mockImplementationOnce(async (plan) => dryPreview(plan))
      .mockImplementationOnce(async (plan) =>
        dryPreview(plan, dryExecution({ minAmountOut: '991000000000000000' })),
      );

    const result = await previewBorrow(input(preview));

    expect(result.borrowAmount).toBe(1_485_000_000n);
    expect(result.preview.plan.params.borrowAmount).toBe(BORROW_AT_MINIMUM);
  });

  it('stops when the first dry run has no fee: its amounts are gross', async () => {
    const preview = vi.fn<PreviewBorrowPlan>(async (plan) =>
      dryPreview(plan, dryExecution({}, { networkFee: undefined })),
    );

    const error = await previewBorrow(input(preview)).catch((e) => e);

    expect(error).toBeInstanceOf(BorrowPreviewError);
    expect(error.reason).toBe('feeNotEstimated');
    expect(preview).toHaveBeenCalledTimes(1);
  });

  it('stops when the final dry run has no fee', async () => {
    const preview = vi
      .fn<PreviewBorrowPlan>()
      .mockImplementationOnce(async (plan) => dryPreview(plan))
      .mockImplementationOnce(async (plan) =>
        dryPreview(plan, dryExecution({}, { networkFee: undefined })),
      );

    await expect(previewBorrow(input(preview))).rejects.toMatchObject({
      reason: 'feeNotEstimated',
    });
  });

  it('stops when the minimum received buys no borrow', async () => {
    const preview = vi.fn<PreviewBorrowPlan>(async (plan) =>
      dryPreview(plan, dryExecution({ minAmountOut: '0' })),
    );

    await expect(previewBorrow(input(preview))).rejects.toMatchObject({
      reason: 'nothingToBorrow',
    });
    expect(preview).toHaveBeenCalledTimes(1);
  });

  it("passes the runner's error on", async () => {
    const failure = new Error('quote failed');
    const preview = vi.fn<PreviewBorrowPlan>().mockRejectedValue(failure);

    await expect(previewBorrow(input(preview))).rejects.toBe(failure);
  });
});
