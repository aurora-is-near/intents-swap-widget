import { describe, expect, it } from 'vitest';

import { FAKE_BASE } from '@/tests/fakeMarkets';
import type { LendingMarket } from '@/domains/markets/types';

import { marketFit, selectMarket } from '../marketFit';

/** A provider's chosen chain: `fits` and the ids are by provider. */
const providerMarket = (provider: string, name: string): LendingMarket => ({
  ...FAKE_BASE,
  id: `${provider}:base`,
  provider,
  name,
});

const AAVE = providerMarket('aave-v3', 'Aave');
const SPARK = providerMarket('spark', 'Spark');
const MORPHO = providerMarket('morpho', 'Morpho');

/**
 * The artboard's three providers: Morpho at 3.92% (max 84%), Aave at
 * 4.85% (79%) and Spark at 4.41% (80%).
 */
const rows = [
  { market: AAVE, apr: 0.0485, maxLtvBps: 7900 },
  { market: SPARK, apr: 0.0441, maxLtvBps: 8000 },
  { market: MORPHO, apr: 0.0392, maxLtvBps: 8400 },
];

describe('marketFit', () => {
  it('fits every provider whose max LTV the loan is within, edges included', () => {
    const { fits } = marketFit({ rows, ltv: 80 });

    expect(fits.get(AAVE.provider)).toBe(false);
    expect(fits.get(SPARK.provider)).toBe(true);
    expect(fits.get(MORPHO.provider)).toBe(true);
  });

  it('compares a fractional max LTV exactly', () => {
    const half = [{ market: AAVE, apr: 0.05, maxLtvBps: 8250 }];

    expect(marketFit({ rows: half, ltv: 82 }).fits.get(AAVE.provider)).toBe(
      true,
    );
    expect(marketFit({ rows: half, ltv: 83 }).fits.get(AAVE.provider)).toBe(
      false,
    );
  });

  it('tags the lowest APR as BEST and selects it with no pick', () => {
    expect(marketFit({ rows, ltv: 50 })).toMatchObject({
      bestId: MORPHO.provider,
      selectedId: MORPHO.provider,
    });
  });

  it('moves BEST to the next lowest APR when the cheapest stops fitting', () => {
    const { fits, bestId } = marketFit({
      rows: [
        { market: AAVE, apr: 0.0485, maxLtvBps: 7900 },
        { market: SPARK, apr: 0.0441, maxLtvBps: 8000 },
        { market: MORPHO, apr: 0.0392, maxLtvBps: 7500 },
      ],
      ltv: 78,
    });

    expect(fits.get(MORPHO.provider)).toBe(false);
    expect(bestId).toBe(SPARK.provider);
  });

  it('keeps the first of two equal APRs as BEST', () => {
    const tied = [
      { market: AAVE, apr: 0.04, maxLtvBps: 8000 },
      { market: SPARK, apr: 0.04, maxLtvBps: 8000 },
    ];

    expect(marketFit({ rows: tied, ltv: 50 }).bestId).toBe(AAVE.provider);
  });

  it('has no BEST and no selection when no provider fits', () => {
    expect(
      marketFit({ rows, ltv: 85, pickedId: MORPHO.provider }),
    ).toMatchObject({
      bestId: undefined,
      selectedId: undefined,
    });
  });

  it('keeps the user’s pick while it fits', () => {
    expect(marketFit({ rows, ltv: 70, pickedId: AAVE.provider })).toMatchObject(
      {
        bestId: MORPHO.provider,
        selectedId: AAVE.provider,
      },
    );
  });

  it('falls back from a pick that stops fitting to BEST', () => {
    expect(marketFit({ rows, ltv: 80, pickedId: AAVE.provider })).toMatchObject(
      {
        bestId: MORPHO.provider,
        selectedId: MORPHO.provider,
      },
    );
  });

  it('falls back from a pick that is not listed to BEST', () => {
    expect(marketFit({ rows, ltv: 50, pickedId: 'gone' }).selectedId).toBe(
      MORPHO.provider,
    );
  });
});

describe('selectMarket', () => {
  /** A provider row whose chosen chain is `row`. */
  const provider = (row: (typeof rows)[number]) => ({
    provider: row.market.provider,
    name: row.market.name,
    chosen: { ...row, liquidationLtvBps: row.maxLtvBps + 300, liquidityUsd: 1 },
    chains: [],
  });

  const providers = rows.map(provider);

  it('selects BEST once every market has settled', () => {
    const { selectedRow, figuresRow } = selectMarket({
      providers,
      ltv: 50,
      pickedProvider: undefined,
      marketsSettled: true,
    });

    expect(selectedRow?.market).toBe(MORPHO);
    expect(figuresRow).toBe(selectedRow);
  });

  it('only selects a fitting pick while markets still load, and shows no figures without one', () => {
    const loading = (pickedProvider?: string) =>
      selectMarket({
        providers,
        ltv: 50,
        pickedProvider,
        marketsSettled: false,
      });

    expect(loading('aave-v3').selectedRow?.market).toBe(AAVE);
    expect(loading().selectedRow).toBeUndefined();
    expect(loading().figuresRow).toBeUndefined();
  });

  it('disables the providers the LTV is above, and reads figures from the first when none fits', () => {
    const { selectedRow, figuresRow, disabledProviders } = selectMarket({
      providers,
      ltv: 85,
      pickedProvider: undefined,
      marketsSettled: true,
    });

    expect(selectedRow).toBeUndefined();
    expect(figuresRow?.market).toBe(AAVE);
    expect(disabledProviders).toEqual(['aave-v3', 'spark', 'morpho']);
  });
});
