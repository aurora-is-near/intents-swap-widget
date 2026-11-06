import { describe, expect, it } from 'vitest';

import { sameStatus, supplyStatus } from './status';

const run = (overrides: Partial<Parameters<typeof supplyStatus>[0]> = {}) =>
  supplyStatus({
    kind: 'run',
    phase: 'settling',
    waiting: false,
    transferFailed: false,
    externalDeposit: false,
    ...overrides,
  } as Parameters<typeof supplyStatus>[0]);

describe('supplyStatus', () => {
  it('is idle with nothing to follow', () => {
    expect(supplyStatus({ kind: 'none' })).toEqual({ state: 'idle' });
  });

  it('says what a supply needs, and when it runs on its own', () => {
    expect(run({ phase: 'awaiting-signature' })).toEqual({
      state: 'action',
      label: 'Sign in your wallet',
    });
    expect(run({ phase: 'awaiting-deposit' })).toEqual({
      state: 'action',
      label: 'Confirm in your wallet',
    });
    expect(run({ phase: 'awaiting-deposit', externalDeposit: true })).toEqual({
      state: 'action',
      label: 'Send the deposit',
    });
    expect(run({ phase: 'settling' })).toEqual({
      state: 'running',
      label: 'Supplying…',
    });
    expect(run({ phase: 'creating' }).state).toBe('running');
  });

  it('puts what the user must do first', () => {
    expect(run({ waiting: true, phase: 'idle' })).toEqual({
      state: 'action',
      label: 'Resume your supply',
    });
    expect(run({ transferFailed: true, phase: 'awaiting-deposit' })).toEqual({
      state: 'action',
      label: 'Retry the transfer',
    });
  });

  it('ends in success or failure; a cancel is no news', () => {
    expect(run({ phase: 'success' }).state).toBe('success');
    expect(run({ phase: 'failed' }).state).toBe('failed');
    expect(run({ phase: 'cancelled' })).toEqual({ state: 'idle' });
  });

  it('follows a recovery from its own outcome', () => {
    const recovery = (
      state: 'idle' | 'running' | 'success' | 'failed',
      phase: 'awaiting-signature' | 'settling' = 'settling',
    ) => supplyStatus({ kind: 'recovery', phase, state });

    expect(recovery('idle')).toEqual({ state: 'idle' });
    expect(recovery('running', 'awaiting-signature').state).toBe('action');
    expect(recovery('running').state).toBe('running');
    expect(recovery('success').state).toBe('success');
    expect(recovery('failed').state).toBe('failed');
  });
});

describe('sameStatus', () => {
  it('compares state and label', () => {
    expect(sameStatus({ state: 'idle' }, { state: 'idle' })).toBe(true);
    expect(
      sameStatus(
        { state: 'action', label: 'Sign in your wallet' },
        { state: 'action', label: 'Confirm in your wallet' },
      ),
    ).toBe(false);
  });
});
