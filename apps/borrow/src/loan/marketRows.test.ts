import { describe, expect, it } from 'vitest';

import {
  FAKE_ARB,
  FAKE_BASE,
  pairSnapshot,
  usdc,
  weth,
} from '../tests/fakeMarkets';
import { bestOf, pairRow } from './marketRows';

const PAIR = { collateral: 'WETH', borrow: 'USDC' };

describe('pairRow', () => {
  it('takes the APR and liquidity from the borrow reserve, the LTVs from the collateral', () => {
    expect(pairRow(pairSnapshot(FAKE_BASE), PAIR)).toEqual({
      market: FAKE_BASE,
      apr: 0.0485,
      maxLtvBps: 7900,
      liquidationLtvBps: 8100,
      liquidityUsd: 1_200_000_000,
    });
  });

  it('reads the pair it is given, in any case', () => {
    const snapshot = pairSnapshot(FAKE_BASE, {
      borrowable: [usdc(), usdc({ symbol: 'GHO', variableBorrowApr: 0.042 })],
    });

    expect(
      pairRow(snapshot, { collateral: 'weth', borrow: 'gho' }),
    ).toMatchObject({ apr: 0.042 });
  });

  it('does not take USDC.e for USDC', () => {
    const snapshot = pairSnapshot(FAKE_ARB, {
      borrowable: [usdc({ symbol: 'USDC.e' })],
    });

    expect(pairRow(snapshot, PAIR)).toBeUndefined();
  });

  it('gives nothing when a reserve is missing or cannot take a loan now', () => {
    expect(
      pairRow(pairSnapshot(FAKE_BASE, { collateral: [] }), PAIR),
    ).toBeUndefined();
    expect(
      pairRow(
        pairSnapshot(FAKE_BASE, { collateral: [weth({ unavailable: true })] }),
        PAIR,
      ),
    ).toBeUndefined();
    expect(
      pairRow(
        pairSnapshot(FAKE_BASE, { borrowable: [usdc({ unavailable: true })] }),
        PAIR,
      ),
    ).toBeUndefined();
  });
});

describe('bestOf', () => {
  it('gives the lowest APR, the first on a tie, and nothing for no rows', () => {
    const a = { id: 'a', apr: 0.05 };
    const b = { id: 'b', apr: 0.04 };
    const c = { id: 'c', apr: 0.04 };

    expect(bestOf([a, b, c])).toBe(b);
    expect(bestOf([])).toBeUndefined();
  });
});
