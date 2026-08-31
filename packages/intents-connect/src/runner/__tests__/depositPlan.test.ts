import { describe, expect, it } from 'vitest';

import type { Execution, ExecutionQuote } from '@/types/execution';
import { buildResumeDepositPlan } from '@/runner/depositPlan';

const execution = (quote: Partial<ExecutionQuote> = {}): Execution => ({
  id: 'exec-1',
  status: 'DEPOSIT_PENDING',
  quote: {
    amount: '1270000',
    amountIn: '1270000',
    amountOut: '88150',
    minAmountOut: '87125',
    depositAddress: 'deposit-address',
    depositMemo: null,
    originAsset: 'nep141:base-0xToken.omft.near',
    swapType: 'EXACT_INPUT',
    deadline: '2026-07-30T12:00:00Z',
    ...quote,
  },
  details: { intermediaryAddress: '0xIntermediary' },
  steps: [],
});

describe('buildResumeDepositPlan', () => {
  it('rebuilds an EVM plan from the execution alone, chain id from the registry', () => {
    expect(buildResumeDepositPlan(execution())).toEqual({
      originChain: 'base',
      originToken: { contractAddress: '0xToken', decimals: 0 },
      originChainId: 8453,
      depositViaWallet: true,
      quote: { swapType: 'EXACT_INPUT', deadline: '2026-07-30T12:00:00Z' },
    });
  });

  it('treats a chainless originAsset as the chain-native asset', () => {
    expect(
      buildResumeDepositPlan(
        execution({ originAsset: 'nep141:eth.omft.near' }),
      ),
    ).toMatchObject({
      originChain: 'eth',
      originToken: { contractAddress: undefined, decimals: 0 },
      originChainId: 1,
    });
  });

  it('returns undefined when depositViaWallet is explicitly false', () => {
    expect(
      buildResumeDepositPlan(execution(), { depositViaWallet: false }),
    ).toBeUndefined();
  });

  it('returns undefined when originAsset is missing or not a bridged form', () => {
    expect(
      buildResumeDepositPlan(execution({ originAsset: undefined })),
    ).toBeUndefined();
    expect(
      buildResumeDepositPlan(execution({ originAsset: 'nep141:usdc.near' })),
    ).toBeUndefined();
  });

  it('returns undefined for a chain outside every known family', () => {
    expect(
      buildResumeDepositPlan(
        execution({ originAsset: 'nep141:btc.omft.near' }),
      ),
    ).toBeUndefined();
  });

  it('requires decimals for non-EVM families and uses them when supplied', () => {
    const sol = execution({ originAsset: 'nep141:sol.omft.near' });

    expect(buildResumeDepositPlan(sol)).toBeUndefined();
    expect(
      buildResumeDepositPlan(sol, { originToken: { decimals: 9 } }),
    ).toMatchObject({
      originChain: 'sol',
      originToken: { decimals: 9 },
      originChainId: null,
    });
  });

  it('lets options override the decoded token address and chain id', () => {
    expect(
      buildResumeDepositPlan(execution(), {
        originToken: { contractAddress: '0xOverride', decimals: 6 },
        originChainId: 999,
      }),
    ).toMatchObject({
      originToken: { contractAddress: '0xOverride', decimals: 6 },
      originChainId: 999,
    });
  });

  it('refuses to rebuild when the quote omits swapType', () => {
    // Never defaulted: swapType selects WHICH amount the transfer moves
    // (`quote.amount` vs `quote.amountIn`, denominated in different tokens),
    // so guessing EXACT_INPUT would send the wrong amount for an EXACT_OUTPUT
    // execution. Unrebuildable means the caller surfaces the address instead.
    expect(
      buildResumeDepositPlan(execution({ swapType: undefined })),
    ).toBeUndefined();
  });
});
