import { AAVE_BORROW_MARKETS } from '@aurora-is-near/intents-connect-actions';
import { describe, expect, it } from 'vitest';

import { DEFAULT_PAIR } from '../../loan/useLoanForm';
import { usdc, weth } from '../../tests/fakeMarkets';
import { coversBorrow, coversCollateral, markCoverage } from './coverage';
import { AAVE_V3_MARKETS, type AaveMarket } from './registry';

const marketOn = (chain: AaveMarket['chain']): AaveMarket => {
  const market = AAVE_V3_MARKETS.find((entry) => entry.chain === chain);

  if (!market) {
    throw new Error(`No Aave market on ${chain}`);
  }

  return market;
};

const BASE = marketOn('base');
const ARB = marketOn('arb');

const BASE_WETH = '0x4200000000000000000000000000000000000006';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CBBTC = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
const BASE_WSTETH = '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452';
const BASE_GHO = '0x6Bb7a212910682DCFdbd5BCBb3e28FB4E8da10Ee';
const ARB_USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const ARB_USDT = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9';
const ARB_USDC_E = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8';
const ARB_WBTC = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f';

describe('coversCollateral', () => {
  it('covers WETH, natively delivered ETH and cbBTC on Base, in any case', () => {
    expect(coversCollateral(BASE, { asset: BASE_WETH })).toBe(true);
    expect(
      coversCollateral(BASE, { asset: BASE_WETH, nativeDelivery: true }),
    ).toBe(true);
    expect(
      coversCollateral(BASE, {
        asset: BASE_CBBTC.toLowerCase(),
      }),
    ).toBe(true);
  });

  it('does not cover what the tables leave out', () => {
    // USDC is borrowable, never collateral (LTV 0 on Aave).
    expect(coversCollateral(BASE, { asset: BASE_USDC })).toBe(false);
    expect(coversCollateral(BASE, { asset: BASE_WSTETH })).toBe(false);
    // An Aave reserve on Arbitrum that 1Click does not deliver.
    expect(coversCollateral(ARB, { asset: ARB_WBTC })).toBe(false);
    // Base's cbBTC is not Arbitrum's.
    expect(coversCollateral(ARB, { asset: BASE_CBBTC })).toBe(false);
  });
});

describe('coversBorrow', () => {
  it('covers USDC on Base, and native USDC and USDT on Arbitrum', () => {
    expect(coversBorrow(BASE, { asset: BASE_USDC })).toBe(true);
    expect(coversBorrow(ARB, { asset: ARB_USDC })).toBe(true);
    expect(coversBorrow(ARB, { asset: ARB_USDT })).toBe(true);
  });

  it('does not cover bridged USDC.e, GHO, or USDT on Base', () => {
    expect(coversBorrow(ARB, { asset: ARB_USDC_E })).toBe(false);
    expect(coversBorrow(BASE, { asset: BASE_GHO })).toBe(false);
    expect(coversBorrow(BASE, { asset: ARB_USDT })).toBe(false);
  });
});

describe('markCoverage', () => {
  it('keeps covered reserves as they are and marks the rest coming soon', () => {
    const covered = weth({ asset: BASE_WETH });
    const capped = usdc({
      asset: BASE_USDC,
      unavailable: true,
      unavailableReason: 'cap-reached',
    });

    const marked = markCoverage(BASE, {
      collateral: [covered, weth({ asset: BASE_WSTETH, symbol: 'wstETH' })],
      borrowable: [capped, usdc({ asset: BASE_GHO, symbol: 'GHO' })],
    });

    expect(marked.collateral[0]).toBe(covered);
    expect(marked.collateral[1]).toMatchObject({
      symbol: 'wstETH',
      unavailable: true,
      unavailableReason: 'coming-soon',
    });
    // A covered reserve keeps its reached cap.
    expect(marked.borrowable[0]).toBe(capped);
    expect(marked.borrowable[1]).toMatchObject({
      symbol: 'GHO',
      unavailable: true,
      unavailableReason: 'coming-soon',
    });
  });

  it('marks an uncovered reserve with a reached cap as coming soon', () => {
    const { collateral } = markCoverage(BASE, {
      collateral: [
        weth({
          asset: BASE_WSTETH,
          unavailable: true,
          unavailableReason: 'cap-reached',
        }),
      ],
      borrowable: [],
    });

    expect(collateral[0]?.unavailableReason).toBe('coming-soon');
  });
});

describe('the default pair', () => {
  // The form's pair is read by the symbol 1Click delivers each reserve as,
  // which is the tables' `label`: on every market, the action must hold an
  // ERC-20 collateral and a borrow token by those labels.
  it.each(AAVE_V3_MARKETS.map((market) => [market.chainLabel, market]))(
    'is covered on %s',
    (_label, market) => {
      const table = AAVE_BORROW_MARKETS[market.chain];
      const collateral = Object.values(table.collateral).filter(
        ({ label, native }) => label === DEFAULT_PAIR.collateral && !native,
      );

      const borrow = Object.values(table.borrow).filter(
        ({ label }) => label === DEFAULT_PAIR.borrow,
      );

      expect(collateral).toHaveLength(1);
      expect(borrow).toHaveLength(1);

      collateral.forEach(({ address }) =>
        expect(coversCollateral(market, { asset: address })).toBe(true),
      );
      borrow.forEach(({ address }) =>
        expect(coversBorrow(market, { asset: address })).toBe(true),
      );
    },
  );
});
