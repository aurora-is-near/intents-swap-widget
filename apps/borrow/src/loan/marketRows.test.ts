import { describe, expect, it } from 'vitest';

import {
  FAKE_ARB,
  FAKE_BASE,
  FAKE_SNAPSHOTS,
  FAKE_SPARK,
  pairSnapshot,
  usdc,
  weth,
} from '../tests/fakeMarkets';
import {
  bestOf,
  chooseChain,
  type MarketRow,
  pairRow,
  providerRows,
} from './marketRows';

const PAIR = { collateral: 'WETH', borrow: 'USDC' };

/** Aave on Base: 4.85%, $1.2B. */
const BASE_ROW: MarketRow = {
  market: FAKE_BASE,
  apr: 0.0485,
  maxLtvBps: 7900,
  liquidationLtvBps: 8100,
  liquidityUsd: 1_200_000_000,
};

/** Aave on Arbitrum: 4.41%, $356M. */
const ARB_ROW: MarketRow = {
  market: FAKE_ARB,
  apr: 0.0441,
  maxLtvBps: 8000,
  liquidationLtvBps: 8250,
  liquidityUsd: 356_000_000,
};

/** Spark on Base: 4.6%, $50M. */
const SPARK_ROW: MarketRow = {
  market: FAKE_SPARK,
  apr: 0.046,
  maxLtvBps: 7900,
  liquidationLtvBps: 8100,
  liquidityUsd: 50_000_000,
};

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

describe('providerRows', () => {
  it('gives one row for a provider on two chains, with both chains', () => {
    expect(providerRows([BASE_ROW, ARB_ROW], undefined)).toEqual([
      {
        provider: 'fake',
        name: 'Aave',
        chosen: ARB_ROW,
        chains: [BASE_ROW, ARB_ROW],
      },
    ]);
  });

  it('gives one row per provider, in the order each first comes', () => {
    const rows = providerRows([BASE_ROW, SPARK_ROW, ARB_ROW], undefined);

    expect(rows.map(({ provider, name }) => [provider, name])).toEqual([
      ['fake', 'Aave'],
      ['spark', 'Spark'],
    ]);
    expect(rows[1]?.chosen).toBe(SPARK_ROW);
  });

  it('chooses the chain with the lowest APR', () => {
    expect(providerRows([BASE_ROW, ARB_ROW], 1_000)[0]?.chosen).toBe(ARB_ROW);
  });

  it('chooses the other chain when the cheaper one cannot lend the loan', () => {
    // $400M is above Arbitrum's $356M and within Base's $1.2B.
    expect(providerRows([BASE_ROW, ARB_ROW], 400_000_000)[0]?.chosen).toBe(
      BASE_ROW,
    );
  });

  it('counts a chain whose liquidity is exactly the loan', () => {
    expect(providerRows([BASE_ROW, ARB_ROW], 356_000_000)[0]?.chosen).toBe(
      ARB_ROW,
    );
  });

  it('falls back to the lowest APR when no chain can lend the loan', () => {
    expect(providerRows([BASE_ROW, ARB_ROW], 2_000_000_000)[0]?.chosen).toBe(
      ARB_ROW,
    );
  });

  it('counts every chain while the loan size is unknown', () => {
    const shallow = { ...ARB_ROW, liquidityUsd: 0 };

    expect(providerRows([BASE_ROW, shallow], undefined)[0]?.chosen).toBe(
      shallow,
    );
  });

  it('keeps the first of two chains with the same APR', () => {
    const tied = { ...ARB_ROW, apr: BASE_ROW.apr };

    expect(chooseChain([BASE_ROW, tied], undefined)).toBe(BASE_ROW);
  });

  it('leaves a chain without the pair out of the choice', () => {
    const snapshots = [
      FAKE_SNAPSHOTS[FAKE_BASE.id],
      // Arbitrum, the cheaper chain, lends no USDC here.
      pairSnapshot(FAKE_ARB, {
        borrowable: [usdc({ symbol: 'USDT', variableBorrowApr: 0.01 })],
      }),
    ].flatMap((snapshot) => (snapshot ? (pairRow(snapshot, PAIR) ?? []) : []));

    const [aave] = providerRows(snapshots, undefined);

    expect(aave?.chosen.market).toBe(FAKE_BASE);
    expect(aave?.chains).toHaveLength(1);
  });

  it('gives no row for no chains', () => {
    expect(providerRows([], undefined)).toEqual([]);
    expect(chooseChain([], 1_000)).toBeUndefined();
  });
});
