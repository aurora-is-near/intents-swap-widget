import { describe, expect, it } from 'vitest';

import { FAKE_BASE, nativeEth, pairSnapshot, weth } from '@/tests/fakeMarkets';

import { collateralFor } from '../collateral';

const WSTETH = weth({
  asset: '0x0000000000000000000000000000000000000003',
  symbol: 'wstETH',
  assetId: 'nep141:wsteth',
});

const market = pairSnapshot(FAKE_BASE, { collateral: [weth(), WSTETH] });

describe('collateralFor', () => {
  it('supplies an asset the market lists as itself', () => {
    expect(collateralFor('wstETH', market)).toEqual({ reserve: WSTETH });
    expect(collateralFor('WETH', market)).toEqual({ reserve: weth() });
  });

  it('matches the symbol in any case', () => {
    expect(collateralFor('WSTETH', market)).toEqual({ reserve: WSTETH });
  });

  it('supplies native ETH as WETH, with no conversion', () => {
    expect(collateralFor('ETH', market)).toEqual({ reserve: weth() });
  });

  it('converts an unlisted asset to WETH and says from what', () => {
    expect(collateralFor('USDC', market)).toEqual({
      reserve: weth(),
      convertedFrom: 'USDC',
    });
  });

  it('converts an asset the market cannot take now to WETH', () => {
    const capped = pairSnapshot(FAKE_BASE, {
      collateral: [weth(), { ...WSTETH, unavailable: true }],
    });

    expect(collateralFor('wstETH', capped)).toEqual({
      reserve: weth(),
      convertedFrom: 'wstETH',
    });
  });

  it('gives nothing when the market cannot take WETH either', () => {
    const noWeth = pairSnapshot(FAKE_BASE, {
      collateral: [weth({ unavailable: true })],
    });

    expect(collateralFor('USDC', noWeth)).toBeUndefined();
    expect(collateralFor('ETH', noWeth)).toBeUndefined();
  });

  describe('with WETH delivered as native ETH', () => {
    // As the Aave adapter reads it: the WETH reserve, delivered natively.
    const nativeWeth = weth({
      assetId: 'nep141:base.omft.near',
      nativeDelivery: true,
    });

    const native = pairSnapshot(FAKE_BASE, {
      collateral: [nativeWeth, WSTETH],
    });

    it.each(['ETH', 'WETH', 'eth'])(
      'supplies %s as the natively delivered reserve',
      (symbol) => {
        expect(collateralFor(symbol, native)).toEqual({ reserve: nativeWeth });
      },
    );

    it('converts an unlisted asset to the natively delivered reserve', () => {
      expect(collateralFor('USDC', native)).toEqual({
        reserve: nativeWeth,
        convertedFrom: 'USDC',
      });
    });

    it('still supplies another listed asset as itself', () => {
      expect(collateralFor('wstETH', native)).toEqual({ reserve: WSTETH });
    });

    it('finds the natively delivered reserve whatever its symbol', () => {
      const eth = nativeEth();
      const bySymbol = pairSnapshot(FAKE_BASE, { collateral: [eth] });

      expect(collateralFor('ETH', bySymbol)).toEqual({ reserve: eth });
      expect(collateralFor('WETH', bySymbol)).toEqual({ reserve: eth });
      expect(collateralFor('USDC', bySymbol)).toEqual({
        reserve: eth,
        convertedFrom: 'USDC',
      });
    });

    it('gives nothing when the market has no wrapped-native reserve', () => {
      const neither = pairSnapshot(FAKE_BASE, {
        collateral: [{ ...nativeWeth, unavailable: true }, WSTETH],
      });

      expect(collateralFor('USDC', neither)).toBeUndefined();
      expect(collateralFor('ETH', neither)).toBeUndefined();
      expect(
        collateralFor('USDC', pairSnapshot(FAKE_BASE, { collateral: [] })),
      ).toBeUndefined();
    });
  });
});
