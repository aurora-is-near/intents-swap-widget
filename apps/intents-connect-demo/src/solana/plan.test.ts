// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createExecutionRunner } from '@aurora-is-near/intents-connect';
import type {
  CreateExecutionBody,
  Execution,
  IntentsConnectApi,
  WalletConnector,
} from '@aurora-is-near/intents-connect';

import { buildSolanaPlan, previewSolanaBuy } from './plan';
import { buildJupiterSwap, prepareJupiterBuild } from './jupiter';
import { BUY_TOKENS, SOLANA_USDC } from './constants';
import { validateMints } from './client';
import { INTERMEDIARY, jupiterFixture, SOURCE, WALLET } from './testFixtures';

vi.mock('./client', () => ({
  getSolanaConnection: vi.fn(),
  validateMints: vi.fn(),
}));
vi.mock('./jupiter', async (original) => ({
  ...(await original<typeof import('./jupiter')>()),
  buildJupiterSwap: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(validateMints).mockResolvedValue(undefined);
  vi.mocked(buildJupiterSwap).mockImplementation(async (input) =>
    prepareJupiterBuild(jupiterFixture(input), input),
  );
});

const harness = () => {
  const events: string[] = [];
  let previewMinimum = '10000000';
  let realMinimum = '10000000';
  let body: CreateExecutionBody;
  const minimum = () => {
    return body.dry ? previewMinimum : realMinimum;
  };

  const execution = (status: Execution['status'] = 'CREATED'): Execution => ({
    id: 'solana-execution',
    type: 'solana',
    status,
    quote: {
      amount: '10000000',
      amountIn: '10000000',
      amountOut: '10000000',
      minAmountOut: minimum(),
      depositAddress: '0x0000000000000000000000000000000000000002',
      depositMemo: null,
      originAsset: SOURCE.assetId,
      destinationAsset: SOLANA_USDC.assetId,
    },
    steps: body.steps,
    metadata: body.metadata,
    details: {
      intermediaryAddress: INTERMEDIARY,
      networkFee: body.steps.length ? '100000' : undefined,
      signingStandard: 'erc191',
      payload: {
        standard: 'erc191',
        payload_json: '{}',
        payload_bytes_base64: 'e30=',
      },
    },
  });

  const api: IntentsConnectApi = {
    getIntermediary: vi.fn().mockResolvedValue({
      originAccount: WALLET,
      originType: 'evm',
      evm: WALLET,
      solana: INTERMEDIARY,
    }),
    listSupportedTokens: vi.fn().mockResolvedValue({
      in: [SOURCE],
      out: [{ assetId: SOLANA_USDC.assetId }],
    }),
    createExecution: vi.fn(async (_wallet, input) => {
      body = input;
      events.push(input.dry ? 'preview' : 'create');

      return execution();
    }),
    createStepsExecution: vi.fn(),
    submitSignature: vi.fn(async () => {
      events.push('submit');

      return { status: 'SIGNED_PENDING_DEPOSIT' as const };
    }),
    recordDeposit: vi.fn(),
    listExecutions: vi.fn(async (_wallet, query) =>
      query?.id ? [execution('SUCCESS')] : [],
    ),
    deleteExecution: vi.fn(),
  };

  const wallet: WalletConnector = {
    id: 'test',
    name: 'test',
    chains: ['base'],
    signingStandard: 'erc191',
    connect: vi.fn(),
    disconnect: vi.fn(),
    getAddress: () => WALLET,
    getProviders: () => ({
      evm: {
        request: vi.fn(async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return [WALLET];
          }

          events.push('sign');

          return `0x${'ab'.repeat(64)}1b`;
        }),
      },
    }),
    makeTransfer: vi.fn(async () => {
      events.push('deposit');

      return { hash: '0xdeposit' };
    }),
  };

  const runner = createExecutionRunner({ api, wallet, pollIntervalMs: 1 });

  return {
    api,
    wallet,
    runner,
    events,
    setMinimums: (preview: string, real: string) => {
      previewMinimum = preview;
      realMinimum = real;
    },
    worsenFee: () => {
      realMinimum = '9500000';
    },
  };
};

describe('Solana buy plan with the SDK runner', () => {
  it.each([true, false])(
    'uses bridge USDC and retains final instructions through settlement (wallet deposit: %s)',
    async (depositViaWallet) => {
      const h = harness();
      const plan = buildSolanaPlan({
        token: SOURCE,
        amountAtomic: '10000000',
        outputMint: BUY_TOKENS[0]!.mint,
        depositViaWallet,
      });

      expect(plan.quote).toMatchObject({
        originAsset: SOURCE.assetId,
        destinationAsset: SOLANA_USDC.assetId,
        swapType: 'EXACT_INPUT',
        slippageTolerance: 25,
      });
      expect(plan.feeStrategy).toEqual({
        kind: 'threeRound',
        amountReserveBps: 25,
      });
      expect(plan.quote.recipient).toBeUndefined();

      const quote = await previewSolanaBuy(h.api, h.runner, plan);

      expect(h.runner.getPhase()).toBe('idle');
      expect(
        vi.mocked(buildJupiterSwap).mock.calls.map(([input]) => input.amount),
      ).toEqual(['10000000', '9875250']);
      expect(quote.minimumOutput).toBe('19651747');
      expect(quote.networkFee).toBe('100000');
      expect(h.events).not.toContain('create');
      expect(h.events).not.toContain('sign');

      await h.runner.run(quote.preview.plan);

      expect(buildJupiterSwap).toHaveBeenCalledTimes(2);
      expect(h.runner.getPhase()).toBe('success');
      expect(h.events.indexOf('sign')).toBeLessThan(h.events.indexOf('submit'));

      if (depositViaWallet) {
        expect(h.events.indexOf('submit')).toBeLessThan(
          h.events.indexOf('deposit'),
        );
      } else {
        expect(h.wallet.makeTransfer).not.toHaveBeenCalled();
      }

      h.runner.dispose();
    },
  );

  it('covers the reported 715710 → 715067 movement without changing accepted instructions', async () => {
    const h = harness();

    h.setMinimums('715710', '715067');
    const plan = buildSolanaPlan({
      token: SOURCE,
      amountAtomic: '1000000',
      outputMint: BUY_TOKENS[0]!.mint,
      depositViaWallet: true,
    });

    const quote = await previewSolanaBuy(h.api, h.runner, plan);

    expect(quote.preview.spendable).toBe('614170');
    expect(quote.estimatedOutput).toBe('1228340');
    expect(quote.minimumOutput).toBe('1222198');

    await h.runner.run(quote.preview.plan);

    const created = vi.mocked(h.api.createExecution).mock.calls.at(-1)![1];

    expect(created.steps).toEqual(quote.preview.plan.prepared!.steps);
    expect(created.metadata?.intentsConnectSpendable).toBe('614170');
    expect(buildJupiterSwap).toHaveBeenCalledTimes(2);
    expect(h.runner.getPhase()).toBe('success');

    h.runner.dispose();
  });

  it('displays the final Jupiter result after a preview rebuild', async () => {
    const h = harness();
    const original = vi.mocked(h.api.createExecution).getMockImplementation()!;
    let dryCalls = 0;

    vi.mocked(h.api.createExecution).mockImplementation(async (...args) => {
      if (args[1].dry) {
        dryCalls += 1;

        if (dryCalls === 3) {
          h.setMinimums('9900000', '9900000');
        }
      }

      return original(...args);
    });
    const quote = await previewSolanaBuy(
      h.api,
      h.runner,
      buildSolanaPlan({
        token: SOURCE,
        amountAtomic: '10000000',
        outputMint: BUY_TOKENS[0]!.mint,
        depositViaWallet: false,
      }),
    );

    expect(quote.preview.spendable).toBe('9775500');
    expect(quote.minimumOutput).toBe('19453245');
    expect(
      vi.mocked(buildJupiterSwap).mock.calls.map(([input]) => input.amount),
    ).toEqual(['10000000', '9875250', '9775500']);
    expect(h.events).not.toContain('create');

    h.runner.dispose();
  });

  it('rejects a real fee change before signing or funding', async () => {
    const h = harness();
    const plan = buildSolanaPlan({
      token: SOURCE,
      amountAtomic: '10000000',
      outputMint: BUY_TOKENS[0]!.mint,
      depositViaWallet: true,
    });

    const quote = await previewSolanaBuy(h.api, h.runner, plan);

    h.worsenFee();

    await expect(h.runner.run(quote.preview.plan)).rejects.toThrow();
    expect(h.events).toContain('create');
    expect(h.events).not.toContain('sign');
    expect(h.wallet.makeTransfer).not.toHaveBeenCalled();

    h.runner.dispose();
  });

  it('rejects same-chain, Intents balance, and unknown target purchases', () => {
    const args = {
      token: SOURCE,
      amountAtomic: '1',
      outputMint: BUY_TOKENS[0]!.mint,
      depositViaWallet: true,
    };

    expect(() =>
      buildSolanaPlan({ ...args, token: { ...SOURCE, blockchain: 'sol' } }),
    ).toThrow(/another chain/);
    expect(() =>
      buildSolanaPlan({ ...args, token: { ...SOURCE, isIntent: true } }),
    ).toThrow(/another chain/);
    expect(() =>
      buildSolanaPlan({ ...args, outputMint: SOLANA_USDC.mint }),
    ).toThrow(/ORCA or KMNO/);
  });
});
