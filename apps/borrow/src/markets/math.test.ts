import { describe, expect, it } from 'vitest';

import {
  HEALTH_FACTOR_ONE,
  healthFactor,
  liquidationPrice,
  loanValues,
  ltvBps,
  maxBorrow,
} from './math';

/** Dollars in the oracle's base currency (8 decimals, as Aave's USD oracle). */
const usd = (dollars: number) => BigInt(dollars) * 10n ** 8n;

describe('loanValues', () => {
  const weth = { decimals: 18, priceBase: usd(3000) };
  const usdc = { decimals: 6, priceBase: usd(1) };

  it('values both sides at the oracle prices', () => {
    expect(
      loanValues({
        collateralAmount: 10n ** 18n,
        collateral: weth,
        borrowAmount: 2250n * 10n ** 6n,
        borrow: usdc,
      }),
    ).toEqual({ collateralValue: usd(3000), debt: usd(2250) });
  });

  it('rounds the collateral down and the debt up', () => {
    // One wei of WETH is worth 3e-7 base units; one unit of `odd` 150.000001.
    const odd = { decimals: 6, priceBase: 150_000_001n };

    expect(
      loanValues({
        collateralAmount: 1n,
        collateral: weth,
        borrowAmount: 1n,
        borrow: odd,
      }),
    ).toEqual({ collateralValue: 0n, debt: 151n });
  });

  it('gives no debt for no borrow', () => {
    expect(
      loanValues({
        collateralAmount: 10n ** 18n,
        collateral: weth,
        borrowAmount: 0n,
        borrow: usdc,
      }).debt,
    ).toBe(0n);
  });

  it('throws on a negative amount', () => {
    expect(() =>
      loanValues({
        collateralAmount: -1n,
        collateral: weth,
        borrowAmount: 0n,
        borrow: usdc,
      }),
    ).toThrow(RangeError);
  });
});

describe('ltvBps', () => {
  it('is 0 with no debt, with or without collateral', () => {
    expect(ltvBps(0n, 0n)).toBe(0n);
    expect(ltvBps(0n, usd(1000))).toBe(0n);
  });

  it('is null for debt with no collateral', () => {
    expect(ltvBps(1n, 0n)).toBeNull();
  });

  it('is exact when the ratio is whole', () => {
    expect(ltvBps(750_000n, 1_000_000n)).toBe(7500n);
  });

  it('rounds up by one bps for one unit of debt either side of a whole ratio', () => {
    expect(ltvBps(749_999n, 1_000_000n)).toBe(7500n);
    expect(ltvBps(750_001n, 1_000_000n)).toBe(7501n);
  });

  it('rounds any remainder up', () => {
    expect(ltvBps(1n, 3n)).toBe(3334n);
  });

  it('rejects negative values', () => {
    expect(() => ltvBps(-1n, 1n)).toThrow(RangeError);
  });
});

describe('healthFactor', () => {
  it('is null, never 0, with no debt', () => {
    expect(healthFactor(usd(1000), 8000, 0n)).toBeNull();
    expect(healthFactor(0n, 8000, 0n)).toBeNull();
  });

  it('is 0 for debt with no collateral', () => {
    expect(healthFactor(0n, 8000, usd(1))).toBe(0n);
  });

  it('is exactly 1e18 at the liquidation threshold', () => {
    expect(healthFactor(usd(1000), 8000, usd(800))).toBe(HEALTH_FACTOR_ONE);
  });

  it('falls below 1e18 for one unit more debt or one unit less collateral', () => {
    expect(healthFactor(1000n, 8000, 801n)).toBe(998_751_560_549_313_358n);
    expect(healthFactor(999n, 8000, 800n)).toBe(999_000_000_000_000_000n);
  });

  it('rounds down', () => {
    expect(healthFactor(1n, 1, 3n)).toBe(33_333_333_333_333n);
    expect(healthFactor(1000n, 8000, 799n)).toBe(1_001_251_564_455_569_461n);
  });

  it('rejects a fractional bps', () => {
    expect(() => healthFactor(1n, 80.5, 1n)).toThrow(RangeError);
  });
});

describe('liquidationPrice', () => {
  it('is null with no debt, no collateral or a zero threshold', () => {
    const loan = {
      collateralAmount: 10n ** 18n,
      decimals: 18,
      liquidationLtvBps: 8000,
      debt: usd(2000),
    };

    expect(liquidationPrice({ ...loan, debt: 0n })).toBeNull();
    expect(liquidationPrice({ ...loan, collateralAmount: 0n })).toBeNull();
    expect(liquidationPrice({ ...loan, liquidationLtvBps: 0 })).toBeNull();
  });

  it('prices 18-decimal collateral (1 WETH, $2,000 debt, 80%)', () => {
    expect(
      liquidationPrice({
        collateralAmount: 10n ** 18n,
        decimals: 18,
        liquidationLtvBps: 8000,
        debt: usd(2000),
      }),
    ).toBe(usd(2500));
  });

  it('prices 8-decimal collateral (0.5 WBTC, $30,000 debt, 75%)', () => {
    expect(
      liquidationPrice({
        collateralAmount: 50_000_000n,
        decimals: 8,
        liquidationLtvBps: 7500,
        debt: usd(30_000),
      }),
    ).toBe(usd(80_000));
  });

  it('prices 6-decimal collateral (1,000 USDC, $780 debt, 78%)', () => {
    expect(
      liquidationPrice({
        collateralAmount: 1_000_000_000n,
        decimals: 6,
        liquidationLtvBps: 7800,
        debt: usd(780),
      }),
    ).toBe(usd(1));
  });

  it('rounds up: one unit of debt past a whole price adds one unit', () => {
    const loan = {
      collateralAmount: 3n,
      decimals: 0,
      liquidationLtvBps: 10_000,
    };

    expect(liquidationPrice({ ...loan, debt: 8n })).toBe(3n);
    expect(liquidationPrice({ ...loan, debt: 9n })).toBe(3n);
    expect(liquidationPrice({ ...loan, debt: 10n })).toBe(4n);
  });

  it('is the lowest whole price at which health is at least 1', () => {
    const loan = {
      collateralAmount: 123_456_789n,
      decimals: 8,
      liquidationLtvBps: 7800,
      debt: usd(41_234),
    };

    const price = liquidationPrice(loan) ?? 0n;
    // Exact health ≥ 1, without rounding the collateral value:
    // amount × price / 10^decimals × ltv / 10_000 ≥ debt.
    const healthAtLeastOne = (at: bigint) =>
      loan.collateralAmount * at * BigInt(loan.liquidationLtvBps) >=
      loan.debt * 10_000n * 10n ** 8n;

    expect(price).toBeGreaterThan(0n);
    expect(healthAtLeastOne(price)).toBe(true);
    expect(healthAtLeastOne(price - 1n)).toBe(false);
  });
});

describe('maxBorrow', () => {
  const loan = {
    collateral: usd(10_000),
    maxLtvBps: 7500,
    existingDebt: 0n,
    availableLiquidity: 10n ** 30n,
  };

  it('returns 6-decimal units (USDC at $1)', () => {
    expect(maxBorrow({ ...loan, borrowPrice: usd(1), borrowDecimals: 6 })).toBe(
      7_500_000_000n,
    );
  });

  it('returns 8-decimal units (WBTC at $75,000)', () => {
    expect(
      maxBorrow({ ...loan, borrowPrice: usd(75_000), borrowDecimals: 8 }),
    ).toBe(10_000_000n);
  });

  it('returns 18-decimal units (WETH at $2,500)', () => {
    expect(
      maxBorrow({ ...loan, borrowPrice: usd(2500), borrowDecimals: 18 }),
    ).toBe(3n * 10n ** 18n);
  });

  it('subtracts existing debt', () => {
    expect(
      maxBorrow({
        ...loan,
        existingDebt: usd(2500),
        borrowPrice: usd(1),
        borrowDecimals: 6,
      }),
    ).toBe(5_000_000_000n);
  });

  it('is capped by available liquidity', () => {
    expect(
      maxBorrow({
        ...loan,
        borrowPrice: usd(1),
        borrowDecimals: 6,
        availableLiquidity: 1_000_000n,
      }),
    ).toBe(1_000_000n);
    expect(
      maxBorrow({
        ...loan,
        borrowPrice: usd(1),
        borrowDecimals: 6,
        availableLiquidity: 0n,
      }),
    ).toBe(0n);
  });

  it('is 0, never negative, with debt at or above the limit', () => {
    const usdc = { borrowPrice: usd(1), borrowDecimals: 6 };

    expect(maxBorrow({ ...loan, ...usdc, existingDebt: usd(7500) })).toBe(0n);
    expect(maxBorrow({ ...loan, ...usdc, existingDebt: usd(9000) })).toBe(0n);
  });

  it('is 0 with no collateral', () => {
    expect(
      maxBorrow({
        ...loan,
        collateral: 0n,
        borrowPrice: usd(1),
        borrowDecimals: 6,
      }),
    ).toBe(0n);
  });

  it('rounds down: a unit is only offered once fully covered', () => {
    const unit = {
      maxLtvBps: 10_000,
      existingDebt: 0n,
      borrowPrice: 3n,
      borrowDecimals: 0,
      availableLiquidity: 100n,
    };

    expect(maxBorrow({ ...unit, collateral: 2n })).toBe(0n);
    expect(maxBorrow({ ...unit, collateral: 3n })).toBe(1n);
    expect(maxBorrow({ ...unit, collateral: 5n })).toBe(1n);
    expect(maxBorrow({ ...unit, collateral: 6n })).toBe(2n);
  });

  it('offers nothing for headroom under one borrow unit', () => {
    expect(
      maxBorrow({
        ...loan,
        existingDebt: usd(7500) - 1n,
        borrowPrice: usd(1),
        borrowDecimals: 6,
      }),
    ).toBe(0n);
  });

  it('throws for a zero borrow price', () => {
    expect(() =>
      maxBorrow({ ...loan, borrowPrice: 0n, borrowDecimals: 6 }),
    ).toThrow(RangeError);
  });
});
