import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuardError } from '@/errors';
import type { Intermediary } from '@/types/execution';
import type { Recipe } from '@/types/recipe';
import {
  pickIntermediaryAddress,
  withQuoteDeadline,
} from '@/runner/planHelpers';
import type { ExecutionPlan } from '@/runner/types';

const recipe = (type: Recipe['type']): Recipe => ({
  id: 'test',
  intent: 'test',
  title: 'Test',
  flow: 'bridge-in',
  type,
  destination: { chain: 'base', assetId: 'nep141:x', tokenAddress: '0xToken' },
  buildSteps: () => [],
});

const plan = (type: Recipe['type'], deadline?: string): ExecutionPlan => ({
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
