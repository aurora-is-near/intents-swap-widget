import { describe, expect, it } from 'vitest';

import type { LendingMarket } from '../../markets/types';
import { FAKE_ARB, FAKE_BASE } from '../../tests/fakeMarkets';
import { marketFit } from './marketFit';

const FAKE_ETH: LendingMarket = {
  ...FAKE_BASE,
  id: 'fake:eth',
  chain: 'eth',
  chainId: 1,
  chainLabel: 'Ethereum',
};

/**
 * The artboard's three markets: Morpho-like at 3.92% (max 84%), Aave at
 * 4.85% (79%) and Spark-like at 4.41% (80%).
 */
const rows = [
  { market: FAKE_BASE, apr: 0.0485, maxLtvBps: 7900 },
  { market: FAKE_ARB, apr: 0.0441, maxLtvBps: 8000 },
  { market: FAKE_ETH, apr: 0.0392, maxLtvBps: 8400 },
];

describe('marketFit', () => {
  it('fits every market whose max LTV the loan is within, edges included', () => {
    const { fits } = marketFit({ rows, ltv: 80 });

    expect(fits.get(FAKE_BASE.id)).toBe(false);
    expect(fits.get(FAKE_ARB.id)).toBe(true);
    expect(fits.get(FAKE_ETH.id)).toBe(true);
  });

  it('compares a fractional max LTV exactly', () => {
    const half = [{ market: FAKE_BASE, apr: 0.05, maxLtvBps: 8250 }];

    expect(marketFit({ rows: half, ltv: 82 }).fits.get(FAKE_BASE.id)).toBe(
      true,
    );
    expect(marketFit({ rows: half, ltv: 83 }).fits.get(FAKE_BASE.id)).toBe(
      false,
    );
  });

  it('tags the lowest APR as BEST and selects it with no pick', () => {
    expect(marketFit({ rows, ltv: 50 })).toMatchObject({
      bestId: FAKE_ETH.id,
      selectedId: FAKE_ETH.id,
    });
  });

  it('moves BEST to the next lowest APR when the cheapest stops fitting', () => {
    const { fits, bestId } = marketFit({
      rows: [
        { market: FAKE_BASE, apr: 0.0485, maxLtvBps: 7900 },
        { market: FAKE_ARB, apr: 0.0441, maxLtvBps: 8000 },
        { market: FAKE_ETH, apr: 0.0392, maxLtvBps: 7500 },
      ],
      ltv: 78,
    });

    expect(fits.get(FAKE_ETH.id)).toBe(false);
    expect(bestId).toBe(FAKE_ARB.id);
  });

  it('keeps the first of two equal APRs as BEST', () => {
    const tied = [
      { market: FAKE_BASE, apr: 0.04, maxLtvBps: 8000 },
      { market: FAKE_ARB, apr: 0.04, maxLtvBps: 8000 },
    ];

    expect(marketFit({ rows: tied, ltv: 50 }).bestId).toBe(FAKE_BASE.id);
  });

  it('has no BEST and no selection when no market fits', () => {
    expect(marketFit({ rows, ltv: 85, pickedId: FAKE_ETH.id })).toMatchObject({
      bestId: undefined,
      selectedId: undefined,
    });
  });

  it('keeps the user’s pick while it fits', () => {
    expect(marketFit({ rows, ltv: 70, pickedId: FAKE_BASE.id })).toMatchObject({
      bestId: FAKE_ETH.id,
      selectedId: FAKE_BASE.id,
    });
  });

  it('falls back from a pick that stops fitting to BEST', () => {
    expect(marketFit({ rows, ltv: 80, pickedId: FAKE_BASE.id })).toMatchObject({
      bestId: FAKE_ETH.id,
      selectedId: FAKE_ETH.id,
    });
  });

  it('falls back from a pick that is not listed to BEST', () => {
    expect(marketFit({ rows, ltv: 50, pickedId: 'fake:gone' }).selectedId).toBe(
      FAKE_ETH.id,
    );
  });
});
