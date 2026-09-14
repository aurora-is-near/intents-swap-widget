import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuardError } from '@/errors';
import type { Intermediary } from '@/types/execution';
import type { AnyRecipe } from '@/types/recipe';
import {
  getSpendableAmount,
  pickIntermediaryAddress,
  withQuoteDeadline,
} from '@/runner/planHelpers';
import type { ExecutionPlan } from '@/runner/types';

const recipe = (type: AnyRecipe['type']): AnyRecipe => ({
  id: 'test',
  intent: 'test',
  title: 'Test',
  flow: 'bridge-in',
  destination: { chain: 'base', assetId: 'nep141:x', tokenAddress: '0xToken' },
  ...(type === 'solana'
    ? { type, buildSteps: () => ({ steps: [] }) }
    : { type, buildSteps: () => [] }),
});

const plan = (type: AnyRecipe['type'], deadline?: string): ExecutionPlan => ({
  recipe: recipe(type),
  params: undefined,
  quote: {
    originAsset: 'nep141:sol.omft.near',
    destinationAsset: 'nep141:x',
    amount: '100',
    swapType: 'EXACT_INPUT',
    slippageTolerance: 100,
    deadline,
  },
  originChain: 'base',
  originToken: { decimals: 6 },
  depositViaWallet: true,
});

const intermediary = (overrides: Partial<Intermediary> = {}): Intermediary => ({
  originAccount: '0xUser',
  originType: 'evm',
  evm: '0xEvmIntermediary',
  solana: 'SolIntermediary',
  ...overrides,
});

describe('getSpendableAmount', () => {
  it('keeps existing amounts by default and reserves atomic units without rounding up', () => {
    expect(getSpendableAmount('715710')).toBe('715710');
    expect(getSpendableAmount('715710', { kind: 'threeRound' })).toBe('715710');
    expect(
      getSpendableAmount('715710', {
        kind: 'threeRound',
        amountReserveBps: 25,
      }),
    ).toBe('713920');
    expect(
      getSpendableAmount('1000000000000000001', {
        kind: 'threeRound',
        amountReserveBps: 25,
      }),
    ).toBe('997500000000000000');
  });

  it.each([-1, 10_000, 0.5, NaN])(
    'rejects an invalid reserve %s',
    (amountReserveBps) => {
      expect(() =>
        getSpendableAmount('1000', { kind: 'threeRound', amountReserveBps }),
      ).toThrow(/amountReserveBps/);
    },
  );

  it.each(['0', '-1', '1'])(
    'rejects a non-positive remaining input from %s',
    (minimum) => {
      expect(() =>
        getSpendableAmount(minimum, {
          kind: 'threeRound',
          amountReserveBps: 25,
        }),
      ).toThrow(/No spendable amount/);
    },
  );
});

describe('pickIntermediaryAddress', () => {
  it('picks the account matching the execution type', () => {
    expect(pickIntermediaryAddress(plan('evm'), intermediary())).toBe(
      '0xEvmIntermediary',
    );
    expect(pickIntermediaryAddress(plan('solana'), intermediary())).toBe(
      'SolIntermediary',
    );
  });

  it('throws NO_INTERMEDIARY when the matching account is missing', () => {
    const call = () =>
      pickIntermediaryAddress(plan('solana'), intermediary({ solana: null }));

    expect(call).toThrowError(GuardError);

    try {
      call();
    } catch (error) {
      expect((error as GuardError).code).toBe('NO_INTERMEDIARY');
    }
  });
});

describe('withQuoteDeadline', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the plan untouched when a deadline is already set', () => {
    const input = plan('evm', '2026-07-30T12:00:00Z');

    expect(withQuoteDeadline(input)).toBe(input);
  });

  it('injects a default deadline ten minutes out when none is set', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-26T10:00:00Z'));

    expect(withQuoteDeadline(plan('evm')).quote.deadline).toBe(
      '2026-08-26T10:10:00.000Z',
    );
  });
});
