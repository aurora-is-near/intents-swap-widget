import { describe, expect, it } from 'vitest';

import { dryExecution } from '@/tests/executionFixtures';
import { usdc, weth } from '@/tests/fakeMarkets';

import { borrowPreviewFigures, stepsPreviewFigures } from '../previewFigures';
import type { BorrowPreviewFiguresInput } from '../previewFigures';

const ETH = 10n ** 18n;
const USDC = 10n ** 6n;

/**
 * 3,000 USDC paid, 0.995 WETH expected, 0.99 WETH at least, after a
 * 0.01 WETH fee; $1,485 borrowed (50% of the minimum at $3,000).
 */
const input = (
  overrides: Partial<BorrowPreviewFiguresInput> = {},
): BorrowPreviewFiguresInput => ({
  execution: dryExecution(),
  borrowAmount: 1_485n * USDC,
  paid: { assetId: 'nep141:arb-usdc', decimals: 6 },
  collateral: weth(),
  borrow: usdc(),
  ...overrides,
});

describe('borrowPreviewFigures', () => {
  it('reads the collateral expected, the minimum received and the fee from the dry run', () => {
    const figures = borrowPreviewFigures(input());

    expect(figures.collateralExpected).toBe(995n * 10n ** 15n);
    expect(figures.minimumReceived).toBe(990n * 10n ** 15n);
    expect(figures.fee).toBe(10n ** 16n);
    expect(figures.borrowAmount).toBe(1_485n * USDC);
  });

  it('gives the conversion rate when the paid asset is converted', () => {
    // 0.995 WETH for 3,000 USDC: 0.000331666… WETH per USDC.
    expect(borrowPreviewFigures(input()).rate).toBe(331_666_666_666_666n);
  });

  it('gives no rate when the collateral itself is paid', () => {
    const figures = borrowPreviewFigures(
      input({ paid: { assetId: 'nep141:weth', decimals: 18 } }),
    );

    expect(figures.rate).toBeUndefined();
  });

  it('gives no fee when the dry run reports none', () => {
    const figures = borrowPreviewFigures(
      input({ execution: dryExecution({}, { networkFee: undefined }) }),
    );

    expect(figures.fee).toBeUndefined();
  });

  it('takes the LTV against the minimum received', () => {
    const figures = borrowPreviewFigures(input());

    expect(figures.ltvBps).toBe(5_000n);
  });

  it('reads a higher LTV when less collateral arrives', () => {
    const figures = borrowPreviewFigures(
      input({
        execution: dryExecution({
          minAmountOut: ((9n * ETH) / 10n).toString(),
        }),
      }),
    );

    // $1,485 ÷ (0.9 × $3,000) = 55%.
    expect(figures.ltvBps).toBe(5_500n);
  });

  it('has no LTV limit to show with nothing borrowed', () => {
    const figures = borrowPreviewFigures(input({ borrowAmount: 0n }));

    expect(figures.ltvBps).toBe(0n);
  });
});

describe('stepsPreviewFigures', () => {
  it('supplies exactly what is spendable, with the fee reported and no rate', () => {
    const figures = stepsPreviewFigures({
      spendable: 98n * 10n ** 16n,
      networkFee: 10n ** 16n,
      borrowAmount: 1_470n * USDC,
      collateral: weth(),
      borrow: usdc(),
    });

    expect(figures).toMatchObject({
      collateralExpected: 98n * 10n ** 16n,
      minimumReceived: 98n * 10n ** 16n,
      rate: undefined,
      fee: 10n ** 16n,
      borrowAmount: 1_470n * USDC,
      // $1,470 against $2,940.
      ltvBps: 5_000n,
    });
  });
});
