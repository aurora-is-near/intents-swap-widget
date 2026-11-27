import { describe, expect, it } from 'vitest';

import { liquidationPriceOf } from '../liquidationPrice';
import { needsMarketRisk, withMarketRisk } from '../marketRisk';
import { largestReserve } from '../reserves';
import { AT_RISK_HEALTH, loanStatus } from '../status';
import { positionsTotals } from '../totals';
import type { LoanPosition, PositionAsset } from '../../types';

const asset = (
  symbol: string,
  amount: number,
  usd: number | null,
  id = symbol,
): PositionAsset => ({
  id,
  address: symbol.toLowerCase(),
  symbol,
  amount,
  usd,
});

const loan = (overrides: Partial<LoanPosition> = {}): LoanPosition => ({
  id: 'base:0xpool:0xowner',
  provider: 'aave-v3',
  providerName: 'Aave',
  network: 'base',
  chainLabel: 'Base',
  marketId: '0xpool',
  marketName: 'Aave V3 Base',
  owner: '0xowner',
  manageable: true,
  collateral: [asset('WETH', 1, 3000)],
  debt: [asset('USDC', 1000, 1000)],
  collateralUsd: 3000,
  debtUsd: 1000,
  ltv: 1 / 3,
  liquidationLtv: null,
  health: 2.4,
  liquidationPrice: null,
  borrowApr: null,
  interestPerYearUsd: null,
  status: 'active',
  ...overrides,
});

describe('loanStatus', () => {
  const weth = [asset('WETH', 1, 3000)];
  const usdc = [asset('USDC', 1000, 1000)];

  it('is repaid with collateral and no debt', () => {
    expect(loanStatus({ debt: [], collateral: weth, health: null })).toBe(
      'repaid',
    );
  });

  it('is repaid by its reserves, not their prices', () => {
    // Unpriced debt is still debt; unpriced collateral is still collateral.
    expect(
      loanStatus({
        debt: [asset('USDC', 1000, null)],
        collateral: weth,
        health: null,
      }),
    ).toBe('active');
    expect(
      loanStatus({
        debt: [],
        collateral: [asset('XYZ', 1, null)],
        health: null,
      }),
    ).toBe('repaid');
  });

  it('is at risk below the threshold, active at it', () => {
    const at = (health: number) =>
      loanStatus({ debt: usdc, collateral: weth, health });

    expect(at(AT_RISK_HEALTH - 0.01)).toBe('at-risk');
    expect(at(AT_RISK_HEALTH)).toBe('active');
  });

  it('is active, not at risk, when health is unknown', () => {
    expect(loanStatus({ debt: usdc, collateral: weth, health: null })).toBe(
      'active',
    );
  });
});

describe('liquidationPriceOf', () => {
  it('is debt over amount times the liquidation LTV', () => {
    expect(
      liquidationPriceOf({
        collateral: [asset('WETH', 2, 6000)],
        debtUsd: 3000,
        liquidationLtv: 0.75,
      }),
    ).toEqual({ symbol: 'WETH', usd: 2000 });
  });

  it.each([
    [
      'several collateral reserves',
      [asset('A', 1, 1), asset('B', 1, 1)],
      1,
      0.8,
    ],
    ['no debt', [asset('A', 1, 1)], 0, 0.8],
    ['an unknown threshold', [asset('A', 1, 1)], 1, null],
  ] as const)('is null with %s', (_, collateral, debtUsd, liquidationLtv) => {
    expect(
      liquidationPriceOf({ collateral, debtUsd, liquidationLtv }),
    ).toBeNull();
  });
});

describe('withMarketRisk', () => {
  it('weights thresholds by collateral and rates by debt', () => {
    const result = withMarketRisk(
      loan({
        collateral: [asset('WETH', 1, 3000), asset('WBTC', 0.01, 1000)],
        debt: [asset('USDC', 750, 750), asset('USDT', 250, 250)],
      }),
      {
        assets: {
          weth: { liquidationThreshold: 0.8, borrowApr: null },
          wbtc: { liquidationThreshold: 0.7, borrowApr: null },
          usdc: { liquidationThreshold: null, borrowApr: 0.04 },
          usdt: { liquidationThreshold: null, borrowApr: 0.08 },
        },
      },
    );

    expect(result.liquidationLtv).toBeCloseTo(0.775);
    expect(result.borrowApr).toBeCloseTo(0.05);
    expect(result.interestPerYearUsd).toBeCloseTo(50);
    expect(result.liquidationPrice).toBeNull();
  });

  it('leaves a figure null when a reserve lacks it', () => {
    expect(withMarketRisk(loan(), { assets: {} })).toMatchObject({
      liquidationLtv: null,
      borrowApr: null,
    });
  });
});

describe('needsMarketRisk', () => {
  it('is true for a loan with debt and collateral, not a repaid one', () => {
    expect(needsMarketRisk(loan())).toBe(true);
    expect(needsMarketRisk(loan({ debt: [] }))).toBe(false);
  });
});

describe('largestReserve', () => {
  it('is the largest by value with the count of the others', () => {
    expect(
      largestReserve([
        asset('A', 1, 10),
        asset('B', 1, 30),
        asset('C', 1, null),
      ]),
    ).toEqual({ asset: asset('B', 1, 30), more: 2 });
    expect(largestReserve([])).toBeUndefined();
  });
});

describe('positionsTotals', () => {
  it('sums debt and collateral and counts repaid loans', () => {
    expect(
      positionsTotals([
        loan(),
        loan({
          debt: [],
          collateral: [asset('WETH', 0.1, 500, 'weth-2')],
          status: 'repaid',
        }),
      ]),
    ).toEqual({ count: 2, debtUsd: 1000, collateralUsd: 3500 });
  });

  it('counts a balance listed in two markets once', () => {
    const shared = asset('WETH', 1, 3000, 'shared');

    expect(
      positionsTotals([
        loan({ collateral: [shared] }),
        loan({ id: 'other', collateral: [shared], debt: [] }),
      ]),
    ).toEqual({ count: 2, debtUsd: 1000, collateralUsd: 3000 });
  });
});
