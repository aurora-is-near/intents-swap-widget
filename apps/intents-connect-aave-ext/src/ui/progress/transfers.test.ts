import { describe, expect, it } from 'vitest';

import { depositView } from './depositState';
import {
  forgetTransfer,
  readTransfers,
  rememberTransfer,
  savedTransfer,
  transfersOf,
} from './transfers';

const memory = () => {
  const items = new Map<string, string>();

  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
};

const HOUR = 60 * 60_000;

describe('saved transfers', () => {
  it('remembers, looks up and forgets runs', () => {
    const store = memory();
    const run = { id: 'e1', address: '0xAbC', originAssetId: 'nep141:usdc' };

    rememberTransfer(run, 0, store);
    rememberTransfer({ ...run, id: 'e2' }, 1, store);
    // The same id again replaces it.
    rememberTransfer({ ...run, deadline: '2026-11-06T12:30:00Z' }, 2, store);

    expect(savedTransfer('e1', 3, store)).toMatchObject({
      deadline: '2026-11-06T12:30:00Z',
      savedAt: 2,
    });
    expect(transfersOf('0xabc', 3, store).map((entry) => entry.id)).toEqual([
      'e1',
      'e2',
    ]);
    expect(savedTransfer(undefined, 3, store)).toBeUndefined();

    forgetTransfer('e1', 3, store);

    expect(readTransfers(3, store).map((entry) => entry.id)).toEqual(['e2']);
  });

  it('drops entries after a day, and anything malformed', () => {
    const store = memory();

    rememberTransfer({ id: 'old', address: 'a', originAssetId: 'x' }, 0, store);

    expect(readTransfers(23 * HOUR, store)).toHaveLength(1);
    expect(readTransfers(25 * HOUR, store)).toEqual([]);

    store.setItem('aurora-intents.transfers', '{"not":"a list"}');

    expect(readTransfers(0, store)).toEqual([]);

    store.setItem('aurora-intents.transfers', '[{"id":1}]');

    expect(readTransfers(0, store)).toEqual([]);
  });

  it('works without storage', () => {
    expect(readTransfers(0, undefined)).toEqual([]);
    expect(() =>
      rememberTransfer(
        { id: 'e', address: 'a', originAssetId: 'x' },
        0,
        undefined,
      ),
    ).not.toThrow();
  });
});

describe('depositView', () => {
  const deadline = '2026-11-06T12:30:00Z';
  const at = (iso: string) => Date.parse(iso);
  const waiting = {
    phase: 'awaiting-deposit' as const,
    status: 'DEPOSIT_PENDING' as const,
    depositAddress: '0xdeposit',
    deadline,
  };

  it('waits for the deposit until the deadline', () => {
    expect(
      depositView({ ...waiting, now: at('2026-11-06T12:00:00Z') }),
    ).toEqual({
      kind: 'waiting',
      msLeft: 30 * 60_000,
    });
    expect(
      depositView({ ...waiting, now: at('2026-11-06T12:30:00Z') }),
    ).toEqual({
      kind: 'expired',
    });
    expect(depositView({ ...waiting, deadline: undefined, now: 0 })).toEqual({
      kind: 'waiting',
    });
  });

  it('shows nothing before the address, or once the deposit is seen', () => {
    expect(
      depositView({
        ...waiting,
        phase: 'awaiting-signature',
        depositAddress: undefined,
        now: 0,
      }),
    ).toEqual({ kind: 'hidden' });
    expect(
      depositView({
        ...waiting,
        phase: 'settling',
        status: 'DEPOSIT_PROCESSING',
        now: 0,
      }),
    ).toEqual({ kind: 'hidden' });
    expect(
      depositView({
        ...waiting,
        phase: 'cancelled',
        status: undefined,
        now: 0,
      }),
    ).toEqual({
      kind: 'hidden',
    });
  });

  it('is expired on EXPIRED in any phase, until a late deposit revives it', () => {
    expect(
      depositView({ ...waiting, phase: 'expired', status: 'EXPIRED', now: 0 }),
    ).toEqual({
      kind: 'expired',
    });
    // The SDK gave up polling: still "expired", not "still processing".
    expect(
      depositView({ ...waiting, phase: 'failed', status: 'EXPIRED', now: 0 }),
    ).toEqual({
      kind: 'expired',
    });
    expect(
      depositView({
        ...waiting,
        phase: 'settling',
        status: 'OPERATION_PROCESSING',
        now: at('2026-11-06T13:00:00Z'),
      }),
    ).toEqual({ kind: 'hidden' });
  });
});
