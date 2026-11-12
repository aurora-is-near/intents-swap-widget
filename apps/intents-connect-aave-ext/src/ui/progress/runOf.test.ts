import type { BalanceToken, Execution } from '@aurora-is-near/intents-connect';
import { describe, expect, it } from 'vitest';

import type { DeliverableOption } from '../supply/options';
import { hasIntent, needsOf, runOf } from './runOf';

const USDC_SOL: BalanceToken = {
  assetId: 'nep141:sol-usdc',
  symbol: 'USDC',
  blockchain: 'sol',
  decimals: 6,
  contractAddress: 'EPjF',
  price: 1,
};

const USDC_BASE: BalanceToken = {
  assetId: 'nep141:base-usdc',
  symbol: 'USDC',
  blockchain: 'base',
  decimals: 6,
  contractAddress: '0x833',
  price: 1,
};

const execution = (overrides: Partial<Execution> = {}): Execution =>
  ({
    id: 'run-1',
    status: 'OPERATION_PROCESSING',
    quote: {
      originAsset: USDC_SOL.assetId,
      destinationAsset: USDC_BASE.assetId,
    },
    details: { messageSigned: true },
    steps: [],
    ...overrides,
  }) as Execution;

describe('needsOf', () => {
  it('asks for a signature before anything, then for the deposit', () => {
    expect(
      needsOf(
        execution({
          status: 'DEPOSIT_PENDING',
          details: { payload: {} } as Execution['details'],
        }),
      ),
    ).toBe('signature');
    expect(needsOf(execution({ status: 'DEPOSIT_PENDING' }))).toBe('deposit');
    expect(needsOf(execution())).toBeUndefined();
  });
});

describe('hasIntent', () => {
  it("keeps the dApp's own runs, and every run without an intent", () => {
    const ours = execution({ metadata: { intent: 'aave_supply' } });
    const theirs = execution({ metadata: { intent: 'other' } });

    expect([ours, theirs].filter(hasIntent('aave_supply'))).toEqual([ours]);
    expect([ours, theirs].filter(hasIntent(undefined))).toHaveLength(2);
  });
});

describe('runOf', () => {
  const tokens = [USDC_SOL, USDC_BASE];

  it("names the run by the dApp's option when it is one", () => {
    const option = {
      id: 'reserve',
      symbol: 'USDC',
      chain: 'base',
      decimals: 6,
      destinationAsset: USDC_BASE.assetId,
    } as DeliverableOption;

    const run = runOf(execution(), {
      tokens,
      options: [option],
      walletKey: 'phantom',
    });

    expect(run).toMatchObject({
      origin: USDC_SOL,
      option,
      walletKey: 'phantom',
      resumed: { id: 'run-1', waiting: false },
    });
  });

  it('falls back to the token list, and waits when it lacks the destination', () => {
    expect(
      runOf(execution({ status: 'DEPOSIT_PENDING' }), {
        tokens,
        walletKey: 'phantom',
      }),
    ).toMatchObject({
      option: { symbol: 'USDC', chain: 'base', tokenAddress: '0x833' },
      resumed: { waiting: true, needs: 'deposit' },
    });
    expect(
      runOf(execution(), { tokens: [USDC_SOL], walletKey: 'phantom' }),
    ).toBeUndefined();
    // A steps-only run has no quote to name it by.
    expect(
      runOf(execution({ quote: undefined } as Partial<Execution>), {
        tokens,
        walletKey: 'phantom',
      }),
    ).toBeUndefined();
  });
});
