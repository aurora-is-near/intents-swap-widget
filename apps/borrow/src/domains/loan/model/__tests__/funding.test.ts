import { describe, expect, it } from 'vitest';

import { FAKE_BASE, pairSnapshot } from '@/tests/fakeMarkets';
import type { FundingAsset } from '@/domains/wallet/types';

import { pickFunding, rescale, supplyIn, toAtomic } from '../funding';
import type { ReserveAsset } from '../reserveAssets';

const held = (symbol: string, extra: Partial<FundingAsset> = {}) =>
  ({
    assetId: `nep141:${symbol.toLowerCase()}`,
    symbol,
    chain: 'arb',
    decimals: 6,
    amount: 5_000_000n,
    usdValue: 5,
    ...extra,
  }) satisfies FundingAsset;

const WETH_ASSET: ReserveAsset = {
  symbol: 'WETH',
  decimals: 18,
  markets: [FAKE_BASE],
  priceUsd: 3000,
};

describe('toAtomic', () => {
  it('parses what the amount input lets through, a partial value as 0', () => {
    expect(toAtomic('1.5', 6)).toBe(1_500_000n);
    expect(toAtomic('', 6)).toBe(0n);
    expect(toAtomic('.', 6)).toBe(0n);
  });
});

describe('rescale', () => {
  it('moves between decimals, rounding down', () => {
    expect(rescale(1_500_000n, 6, 18)).toBe(1_500_000_000_000_000_000n);
    expect(rescale(1_999_999n, 6, 0)).toBe(1n);
  });
});

describe('pickFunding', () => {
  const rows = [
    held('USDT', { unavailableReason: 'not supported' }),
    held('USDC'),
    held('ETH', { decimals: 18, amount: 10n ** 18n }),
  ];

  it('takes the picked balance when connected, else the first that can fund a loan', () => {
    const base = {
      connected: true,
      rows,
      collateralPick: undefined,
      collateralAssets: [],
    };

    expect(pickFunding({ ...base, fundingId: 'nep141:eth' }).symbol).toBe(
      'ETH',
    );
    expect(pickFunding({ ...base, fundingId: undefined }).symbol).toBe('USDC');
  });

  it('funds with the collateral picked, at its decimals, while not connected', () => {
    expect(
      pickFunding({
        connected: false,
        rows: [],
        fundingId: undefined,
        collateralPick: 'WETH',
        collateralAssets: [WETH_ASSET],
      }),
    ).toEqual({ asset: undefined, symbol: 'WETH', decimals: 18 });
  });
});

describe('supplyIn', () => {
  const funding = (symbol: string) => ({
    asset: undefined,
    symbol,
    decimals: 18,
  });

  it('before a market is known, converts unless the funding is the collateral (ETH as WETH)', () => {
    const pair = { collateral: 'WETH', borrow: 'USDC' };
    const of = (symbol: string) =>
      supplyIn({
        snapshot: undefined,
        funding: funding(symbol),
        pair,
        atomic: 0n,
      }).converted;

    expect(of('WETH')).toBe(false);
    expect(of('ETH')).toBe(false);
    expect(of('USDC')).toBe(true);
  });

  it('reads the collateral choice in a market, and values the amount at its oracle', () => {
    const { choice, converted, amountUsd } = supplyIn({
      snapshot: pairSnapshot(FAKE_BASE),
      funding: funding('WETH'),
      pair: { collateral: 'WETH', borrow: 'USDC' },
      atomic: 10n ** 18n,
    });

    expect(choice?.reserve.symbol).toBe('WETH');
    expect(converted).toBe(false);
    expect(amountUsd).toBeGreaterThan(0);
  });
});
