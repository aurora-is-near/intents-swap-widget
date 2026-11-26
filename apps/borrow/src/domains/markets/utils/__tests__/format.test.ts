import { describe, expect, it } from 'vitest';

import {
  formatApr,
  formatBps,
  formatCompactUsd,
  tokenAmountToUsd,
} from '../format';

describe('formatApr', () => {
  it('shows a fraction as a percentage with two decimals', () => {
    expect(formatApr(0.0485)).toBe('4.85%');
    expect(formatApr(0.042)).toBe('4.20%');
    expect(formatApr(0)).toBe('0.00%');
    expect(formatApr(0.123456)).toBe('12.35%');
  });
});

describe('formatBps', () => {
  it('drops trailing zeros', () => {
    expect(formatBps(7900)).toBe('79%');
    expect(formatBps(8250)).toBe('82.5%');
    expect(formatBps(8125)).toBe('81.25%');
    expect(formatBps(0)).toBe('0%');
  });
});

describe('formatCompactUsd', () => {
  it('shows dollars in compact notation', () => {
    expect(formatCompactUsd(1_200_000_000)).toBe('$1.2B');
    expect(formatCompactUsd(412_000_000)).toBe('$412M');
    expect(formatCompactUsd(356_400_000)).toBe('$356.4M');
    expect(formatCompactUsd(950_000)).toBe('$950K');
    expect(formatCompactUsd(12)).toBe('$12');
    expect(formatCompactUsd(0)).toBe('$0');
  });
});

describe('tokenAmountToUsd', () => {
  const USD_8 = 100_000_000n;

  it('converts token units with the oracle price and unit', () => {
    // 1.2B USDC (6 decimals) at $0.9999 (8-decimal base).
    expect(
      tokenAmountToUsd({
        amount: 1_200_000_000n * 10n ** 6n,
        decimals: 6,
        priceBase: 99_990_000n,
        baseCurrencyUnit: USD_8,
      }),
    ).toBeCloseTo(1_199_880_000, 0);

    // 2.5 wstETH (18 decimals) at $4,200.12345678.
    expect(
      tokenAmountToUsd({
        amount: 25n * 10n ** 17n,
        decimals: 18,
        priceBase: 420_012_345_678n,
        baseCurrencyUnit: USD_8,
      }),
    ).toBeCloseTo(10_500.30864195, 6);
  });

  it('keeps the fraction of a dollar', () => {
    expect(
      tokenAmountToUsd({
        amount: 500_000n,
        decimals: 6,
        priceBase: USD_8,
        baseCurrencyUnit: USD_8,
      }),
    ).toBe(0.5);
  });

  it('is zero for no liquidity', () => {
    expect(
      tokenAmountToUsd({
        amount: 0n,
        decimals: 6,
        priceBase: USD_8,
        baseCurrencyUnit: USD_8,
      }),
    ).toBe(0);
  });

  it('refuses a zero unit', () => {
    expect(() =>
      tokenAmountToUsd({
        amount: 1n,
        decimals: 6,
        priceBase: USD_8,
        baseCurrencyUnit: 0n,
      }),
    ).toThrow('baseCurrencyUnit');
  });
});
