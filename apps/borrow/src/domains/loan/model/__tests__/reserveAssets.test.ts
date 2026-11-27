import { describe, expect, it } from 'vitest';

import { AAVE_V3_MARKETS } from '@/domains/markets/aaveV3/config/registry';
import {
  FAKE_ARB,
  FAKE_BASE,
  pairSnapshot,
  usdc,
  weth,
} from '@/tests/fakeMarkets';

import {
  decimalsOf,
  fundsAsItself,
  pickBorrowAsset,
  reserveAssets,
  sameSymbol,
} from '../reserveAssets';
import type { ReserveAsset } from '../reserveAssets';

const asset = (symbol: string, extra: Partial<ReserveAsset> = {}) =>
  ({
    symbol,
    decimals: 6,
    markets: [FAKE_BASE],
    priceUsd: 1,
    ...extra,
  }) satisfies ReserveAsset;

describe('sameSymbol', () => {
  it('matches in any case, but not a bridged variant', () => {
    expect(sameSymbol('usdc', 'USDC')).toBe(true);
    expect(sameSymbol('USDC.e', 'USDC')).toBe(false);
  });
});

describe('fundsAsItself', () => {
  it('pairs each market native token with the wrapped reserve it funds', () => {
    expect(fundsAsItself('WETH', 'ETH')).toBe(true);
    expect(fundsAsItself('WPOL', 'pol')).toBe(true);
    expect(fundsAsItself('wstETH', 'wstETH')).toBe(true);
  });

  it.each(AAVE_V3_MARKETS.map((market) => [market.chainLabel, market]))(
    'pairs the native token of the %s market with its wrapped reserve',
    (_label, market) => {
      const native = market.native?.symbol ?? '';

      expect(fundsAsItself(`W${native}`, native)).toBe(true);
    },
  );

  it('does not take an inherited object key for a native token', () => {
    expect(fundsAsItself('WETH', 'constructor')).toBe(false);
    expect(fundsAsItself('WETH', 'toString')).toBe(false);
  });

  it('does not pair a token with another wrapped one', () => {
    expect(fundsAsItself('WPOL', 'ETH')).toBe(false);
    // Aave never names a reserve after the native token.
    expect(fundsAsItself('ETH', 'WETH')).toBe(false);
    expect(fundsAsItself('wstETH', 'stETH')).toBe(false);
    expect(fundsAsItself('WBTC', 'BTC')).toBe(false);
  });
});

describe('reserveAssets', () => {
  it('lists each symbol once, with every market that lists it', () => {
    const assets = reserveAssets(
      [pairSnapshot(FAKE_BASE), pairSnapshot(FAKE_ARB)],
      ({ collateral }) => collateral,
    );

    expect(assets.map(({ symbol }) => symbol)).toEqual(['WETH']);
    expect(assets[0]?.markets).toEqual([FAKE_BASE, FAKE_ARB]);
  });

  it('puts a symbol the action covers nowhere last, as coming soon', () => {
    const assets = reserveAssets(
      [
        pairSnapshot(FAKE_BASE, {
          collateral: [
            weth({
              symbol: 'cbBTC',
              unavailable: true,
              unavailableReason: 'coming-soon',
            }),
            weth(),
          ],
        }),
      ],
      ({ collateral }) => collateral,
    );

    expect(
      assets.map(({ symbol, comingSoon }) => [symbol, comingSoon]),
    ).toEqual([
      ['WETH', undefined],
      ['cbBTC', true],
    ]);
  });

  it('leaves out a symbol that is only capped', () => {
    expect(
      reserveAssets(
        [
          pairSnapshot(FAKE_BASE, {
            borrowable: [
              usdc({ unavailable: true, unavailableReason: 'cap-reached' }),
            ],
          }),
        ],
        ({ borrowable }) => borrowable,
      ),
    ).toEqual([]);
  });
});

describe('decimalsOf', () => {
  it('reads the listed decimals, else the fallback', () => {
    const assets = [asset('WETH', { decimals: 18 })];

    expect(decimalsOf(assets, 'weth', 6)).toBe(18);
    expect(decimalsOf(assets, 'USDC', 6)).toBe(6);
  });
});

describe('pickBorrowAsset', () => {
  const borrowable = [
    asset('USDC'),
    asset('USDT'),
    asset('WETH', { decimals: 18 }),
  ];

  it('never offers the collateral as the borrow asset', () => {
    const { borrowAssets } = pickBorrowAsset({
      borrowable,
      borrowSymbol: 'USDC',
      collateralSymbol: 'WETH',
    });

    expect(borrowAssets.map(({ symbol }) => symbol)).toEqual(['USDC', 'USDT']);
  });

  it('keeps the wanted symbol while it can be picked', () => {
    expect(
      pickBorrowAsset({
        borrowable,
        borrowSymbol: 'usdt',
        collateralSymbol: 'WETH',
      }).asset?.symbol,
    ).toBe('USDT');
  });

  it('moves a borrow symbol that collides with the collateral to the default', () => {
    expect(
      pickBorrowAsset({
        borrowable,
        borrowSymbol: 'WETH',
        collateralSymbol: 'WETH',
      }).asset?.symbol,
    ).toBe('USDC');
  });

  it('skips a coming-soon asset, and has none while the wanted one is not listed', () => {
    const { asset: picked } = pickBorrowAsset({
      borrowable: [asset('USDC', { comingSoon: true }), asset('USDT')],
      borrowSymbol: 'USDC',
      collateralSymbol: 'WETH',
    });

    expect(picked).toBeUndefined();
  });
});
