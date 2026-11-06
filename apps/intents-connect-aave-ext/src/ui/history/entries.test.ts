import type { Execution } from '@aurora-is-near/intents-connect';
import { describe, expect, it } from 'vitest';

import {
  HISTORY_LIMIT,
  historyEntries,
  type HistoryWallet,
  labelOf,
  uniqueWallets,
} from './entries';

const wallet = (
  name: string,
  address: string,
  active = false,
): HistoryWallet => ({ name, address, active });

const PHANTOM = wallet('Phantom', 'sol1');
const METAMASK = wallet('MetaMask', '0xabc', true);

const run = (
  id: string,
  overrides: Partial<Execution> & { createdAt?: string } = {},
): Execution =>
  ({
    id,
    status: 'SUCCESS',
    createdAt: '2026-11-01T10:00:00Z',
    quote: { originAsset: 'a', destinationAsset: 'b' },
    details: { messageSigned: true },
    steps: [],
    metadata: { intent: 'aave_supply', title: 'Supply USDC to Aave' },
    ...overrides,
  }) as Execution;

describe('uniqueWallets', () => {
  it('keeps one wallet per address, the active one when it shares it', () => {
    const rabby = wallet('Rabby', '0xabc');

    expect(uniqueWallets([rabby, METAMASK, PHANTOM])).toEqual([
      METAMASK,
      PHANTOM,
    ]);
    expect(uniqueWallets([rabby, wallet('Other', '0xabc')])).toEqual([rabby]);
  });
});

describe('labelOf', () => {
  it('reads what happened, and what still needs the user', () => {
    expect(labelOf(run('a'))).toBe('supplied');
    expect(
      labelOf(run('a', { executionMode: 'steps_only' } as Partial<Execution>)),
    ).toBe('supplied-waiting');
    expect(labelOf(run('a', { status: 'OPERATION_FAILED' }))).toBe('failed');
    expect(labelOf(run('a', { status: 'DEPOSIT_FAILED' }))).toBe('failed');
    expect(labelOf(run('a', { status: 'EXPIRED' }))).toBe('expired');
    expect(labelOf(run('a', { status: 'DEPOSIT_PENDING' }))).toBe('needs-you');
    expect(
      labelOf(
        run('a', {
          status: 'CREATED',
          details: { payload: {} } as Execution['details'],
        }),
      ),
    ).toBe('needs-you');
    expect(labelOf(run('a', { status: 'OPERATION_PROCESSING' }))).toBe(
      'in-progress',
    );
  });
});

describe('historyEntries', () => {
  it("merges every wallet's runs newest first, undated last", () => {
    const entries = historyEntries(
      [
        {
          wallet: PHANTOM,
          executions: [
            run('old', { createdAt: '2026-10-01T00:00:00Z' }),
            run('undated', { createdAt: undefined }),
          ],
        },
        {
          wallet: METAMASK,
          executions: [run('new', { createdAt: '2026-11-05T00:00:00Z' })],
        },
      ],
      'aave_supply',
    );

    expect(
      entries.map(({ execution, wallet: from }) => [execution.id, from.name]),
    ).toEqual([
      ['new', 'MetaMask'],
      ['old', 'Phantom'],
      ['undated', 'Phantom'],
    ]);
  });

  it("leaves out another app's runs and quotes nobody signed", () => {
    const entries = historyEntries(
      [
        {
          wallet: PHANTOM,
          executions: [
            run('other-app', { metadata: { intent: 'polymarket_buy' } }),
            run('no-metadata', { metadata: undefined }),
            run('walked-away', {
              status: 'EXPIRED',
              details: { messageSigned: false } as Execution['details'],
            }),
            run('signed-then-expired', { status: 'EXPIRED' }),
          ],
        },
      ],
      'aave_supply',
    );

    expect(entries.map(({ execution }) => execution.id)).toEqual([
      'signed-then-expired',
    ]);
  });

  it('lists a run two wallets share once, under the active wallet', () => {
    const rabby = wallet('Rabby', '0xABC');
    const entries = historyEntries(
      [
        { wallet: rabby, executions: [run('shared')] },
        { wallet: METAMASK, executions: [run('shared')] },
      ],
      'aave_supply',
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]!.wallet).toBe(METAMASK);
  });

  it('marks steps-only runs, and keeps the newest few', () => {
    const many = Array.from({ length: HISTORY_LIMIT + 5 }, (_, index) =>
      run(`run-${index}`, {
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
      }),
    );

    const entries = historyEntries(
      [
        {
          wallet: PHANTOM,
          executions: [
            ...many,
            run('waiting', {
              createdAt: '2027-01-01T00:00:00Z',
              quote: undefined,
              metadata: {
                intent: 'aave_supply',
                intentsConnectFlow: 'steps-only',
              },
            } as Partial<Execution>),
          ],
        },
      ],
      'aave_supply',
    );

    expect(entries).toHaveLength(HISTORY_LIMIT);
    expect(entries[0]).toMatchObject({
      stepsOnly: true,
      label: 'supplied-waiting',
    });
    expect(entries[1]!.execution.id).toBe(`run-${HISTORY_LIMIT + 4}`);
  });
});
