import { describe, expect, it } from 'vitest';

import { FAKE_BASE, pairSnapshot, weth } from '../../tests/fakeMarkets';
import { collateralFor } from './collateral';

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
});
