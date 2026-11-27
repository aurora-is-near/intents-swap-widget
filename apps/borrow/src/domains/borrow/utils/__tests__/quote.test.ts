import { describe, expect, it, vi } from 'vitest';

import { dryPreview } from '@/tests/executionFixtures';
import { createFakeAdapter, FAKE_BASE, usdc, weth } from '@/tests/fakeMarkets';

import { quoteBorrow } from '../quote';
import type { BorrowFlowInput } from '../../flow/types';
import type { PreviewBorrowPlan } from '../preview';

const inputWith = (
  adapter: ReturnType<typeof createFakeAdapter>,
): BorrowFlowInput => ({
  adapter,
  market: FAKE_BASE,
  collateral: weth(),
  borrow: usdc(),
  origin: { assetId: 'nep141:arb-usdc', chain: 'arb', decimals: 6 },
  amount: 3_000_000_000n,
  ltv: 50,
  estimatedBorrowAmount: 1_500_000_000n,
  // Not read: the gas pre-check is skipped.
  fundingRows: undefined,
});

describe('quoteBorrow', () => {
  it('reads the market while the dry runs run', async () => {
    const adapter = createFakeAdapter();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const preview = vi.fn<PreviewBorrowPlan>(async (plan) => {
      await gate;

      return dryPreview(plan);
    });

    const quoting = quoteBorrow(inputWith(adapter), preview);

    await vi.waitFor(() => expect(preview).toHaveBeenCalledTimes(1));

    expect(adapter.getMarketSnapshot).toHaveBeenCalledWith(FAKE_BASE);

    release();

    await expect(quoting).resolves.toMatchObject({
      preview: { borrowAmount: 1_485_000_000n },
    });
    expect(adapter.getMarketSnapshot).toHaveBeenCalledTimes(1);
  });

  it("reports the dry run's failure when the market read fails too", async () => {
    const refused = new Error('dry run refused');
    const adapter = createFakeAdapter({
      getMarketSnapshot: () => Promise.reject(new Error('RPC down')),
    });

    await expect(
      quoteBorrow(inputWith(adapter), () => Promise.reject(refused)),
    ).rejects.toBe(refused);
  });

  it('reports a failed market read once the dry runs succeed', async () => {
    const down = new Error('RPC down');
    const adapter = createFakeAdapter({
      getMarketSnapshot: () => Promise.reject(down),
    });

    await expect(
      quoteBorrow(inputWith(adapter), async (plan) => dryPreview(plan)),
    ).rejects.toBe(down);
  });
});
