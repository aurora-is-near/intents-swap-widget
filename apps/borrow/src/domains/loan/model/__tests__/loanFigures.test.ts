import { describe, expect, it } from 'vitest';

import { USD, usdc, weth } from '@/tests/fakeMarkets';

import { loanFigures } from '../loanFigures';
import type { LoanFiguresInput } from '../loanFigures';

const ETH = 10n ** 18n;
const USDC = 10n ** 6n;

/** 1 WETH at $3,000 (liquidation 81%) against USDC at $1, LTV 50%. */
const input = (
  overrides: Partial<LoanFiguresInput> = {},
): LoanFiguresInput => ({
  collateralAmount: ETH,
  collateral: weth(),
  borrow: usdc(),
  ltv: 50,
  ...overrides,
});

describe('loanFigures', () => {
  it('takes a 0.30% fee from the collateral and borrows the rest’s USD × LTV ÷ borrow price', () => {
    const figures = loanFigures(input());

    // 0.997 WETH at $3,000, LTV 50%.
    expect(figures.borrowAmount).toBe(1_495_500_000n);
    expect(figures.fee).toBe(3n * 10n ** 15n);
  });

  it('recomputes the borrow amount and fee when the collateral amount changes', () => {
    const figures = loanFigures(input({ collateralAmount: 2n * ETH }));

    expect(figures.borrowAmount).toBe(2_991n * USDC);
    expect(figures.fee).toBe(6n * 10n ** 15n);
  });

  it('recomputes the borrow amount when the LTV changes; the fee stays on the collateral', () => {
    const figures = loanFigures(input({ ltv: 70 }));

    expect(figures.borrowAmount).toBe(2_093_700_000n);
    expect(figures.fee).toBe(3n * 10n ** 15n);
  });

  it('converts through both oracle prices and decimals', () => {
    // 0.5 WETH ($1,500) at 40% is $600, or 0.2 of an 18-decimal token at $3,000.
    const figures = loanFigures(
      input({
        collateralAmount: ETH / 2n,
        ltv: 40,
        borrow: { decimals: 18, priceBase: 3_000n * USD },
        feeBps: 0,
      }),
    );

    expect(figures.borrowAmount).toBe((2n * ETH) / 10n);
  });

  it('borrows on the whole amount with feeBps 0, as for the dry run’s net minimum', () => {
    const figures = loanFigures(input({ feeBps: 0 }));

    expect(figures.borrowAmount).toBe(1_500n * USDC);
    expect(figures.fee).toBe(0n);
  });

  it('puts the liquidation price on the collateral left after the fee', () => {
    // 1,495.50 USDC against 0.997 WETH at 81%: the same price as 1,500
    // against 1 WETH, since both shrink by the fee.
    expect(loanFigures(input()).liquidationPrice).toBe(
      loanFigures(input({ feeBps: 0 })).liquidationPrice,
    );
  });

  it('rounds the borrow amount down and the fee up', () => {
    // $0.000003 at 50%: 1.5 units, borrowed as 1; 0.30% of 1e9 wei is
    // exactly 3e6, and of 1e9 + 1 rounds up to 3,000,001.
    const figures = loanFigures(
      input({ collateralAmount: 1_000_000_000n, ltv: 50 }),
    );

    expect(figures.borrowAmount).toBe(1n);
    expect(figures.fee).toBe(3_000_000n);
    expect(loanFigures(input({ collateralAmount: 1_000_000_001n })).fee).toBe(
      3_000_001n,
    );
  });

  it('borrows nothing with no collateral or at LTV 0', () => {
    expect(loanFigures(input({ collateralAmount: 0n }))).toMatchObject({
      borrowAmount: 0n,
      fee: 0n,
      liquidationPrice: null,
    });

    // The collateral is still bridged in, so its fee stays.
    expect(loanFigures(input({ ltv: 0 }))).toMatchObject({
      borrowAmount: 0n,
      fee: 3n * 10n ** 15n,
      liquidationPrice: null,
    });
  });

  it('gives health as liquidation LTV ÷ LTV, to two decimals, rounded down', () => {
    expect(loanFigures(input()).healthHundredths).toBe(162n);
    // 81 / 70 = 1.157…
    expect(loanFigures(input({ ltv: 70 })).healthHundredths).toBe(115n);
    // At any amount, as the artboard shows it.
    expect(loanFigures(input({ collateralAmount: 0n })).healthHundredths).toBe(
      162n,
    );
  });

  it('gives no health at LTV 0', () => {
    expect(loanFigures(input({ ltv: 0 })).healthHundredths).toBeNull();
  });

  it('gives the collateral’s liquidation price in USD, rounded up', () => {
    // $1,500 of debt on 1 WETH liquidates at 81%: $1,851.851851…
    expect(loanFigures(input()).liquidationPrice).toBe(185_185_185_186n);
  });

  it('rejects an LTV that is not a whole, non-negative percent', () => {
    expect(() => loanFigures(input({ ltv: 50.5 }))).toThrow(RangeError);
    expect(() => loanFigures(input({ ltv: -1 }))).toThrow(RangeError);
  });

  it('rejects a negative amount and a zero borrow price', () => {
    expect(() => loanFigures(input({ collateralAmount: -1n }))).toThrow(
      RangeError,
    );
    expect(() =>
      loanFigures(input({ borrow: { decimals: 6, priceBase: 0n } })),
    ).toThrow(RangeError);
  });
});
