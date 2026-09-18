import { base64 } from '@scure/base';
import { describe, expect, it, vi } from 'vitest';

import type { IntentsConnectApi } from '@/api/types';
import { IntentsConnectApiError } from '@/errors';
import { noopLogger } from '@/logger';
import type { Execution, ExecutionStatus } from '@/types/execution';
import type { SolanaRecipe } from '@/types/recipe';
import type { WalletConnector } from '@/types/wallet';
import { createExecutionRunner } from '@/runner/createExecutionRunner';
import type { RunnerEvent, StepsPlan } from '@/runner/types';

const ADDRESS = '0xD84368a36ff4F6285F4121ED75E8c1f237E51506';
const EVM_INTERMEDIARY = '0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E';
const SOL_INTERMEDIARY = '4nn959rPTCxboxXKUxZwMq4knJMKPURA4WciuJyrDAvQ';
const SOL_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const USDC_ASSET = 'nep141:sol-usdc';

const makeWallet = (): WalletConnector => ({
  id: 'test-evm',
  name: 'Test EVM',
  chains: ['base'],
  signingStandard: 'erc191',
  connect: vi.fn(),
  disconnect: vi.fn(),
  getAddress: () => ADDRESS,
  getProviders: () => ({
    evm: {
      request: vi.fn(async ({ method }: { method: string }) =>
        method === 'eth_requestAccounts' ? [ADDRESS] : `0x${'ab'.repeat(64)}1b`,
      ),
    },
  }),
  makeTransfer: vi.fn().mockResolvedValue({ hash: '0xdeposit' }),
});

const collect = () => {
  const events: RunnerEvent[] = [];

  return { events, onEvent: (event: RunnerEvent) => events.push(event) };
};

const phasesOf = (events: RunnerEvent[]) =>
  events.filter((e) => e.type === 'phase').map((e) => e.phase);

type SetupOptions = {
  /** Fee the dry rounds report; `null` simulates a failed estimation. */
  dryFee?: string | null;
  /** Fee the real create reports; defaults to the dry fee. */
  realFee?: string;
  /** Status the poll answers with. */
  finalStatus?: ExecutionStatus;
  /** What /submit answers. */
  submitStatus?: 'SIGNING' | 'SIGNED_PENDING_DEPOSIT' | ExecutionStatus;
  /** Whether the created execution carries the wire `executionMode`. */
  withExecutionMode?: boolean;
};

const setup = (options: SetupOptions = {}) => {
  const {
    dryFee = '100',
    realFee = dryFee ?? undefined,
    finalStatus = 'SUCCESS',
    submitStatus = 'SIGNING',
    withExecutionMode = true,
  } = options;

  const buildSteps = vi.fn<SolanaRecipe['buildSteps']>(async ({ amount }) => ({
    steps: [
      {
        programId: SOL_PROGRAM,
        discriminator: '0c',
        args: [
          { name: 'amount', type: 'u64', value: amount },
          { name: 'decimals', type: 'u8', value: 6 },
        ],
        accounts: [
          { pubkey: SOL_USDC, isSigner: false, isWritable: true },
          { pubkey: SOL_USDC, isSigner: false, isWritable: false },
          { pubkey: SOL_INTERMEDIARY, isSigner: false, isWritable: true },
          { pubkey: '{INTERMEDIARY}', isSigner: true, isWritable: false },
        ],
      },
    ],
    addressLookupTables: [SOL_USDC],
  }));

  const recipe: SolanaRecipe = {
    id: 'solana-spend',
    intent: 'solana_spend',
    title: 'Spend from the Connect account',
    flow: 'steps-only',
    type: 'solana',
    destination: { chain: 'sol', assetId: USDC_ASSET, tokenAddress: SOL_USDC },
    buildSteps,
  };

  const plan: StepsPlan<void> = { recipe, params: undefined, amount: '1000' };

  let created: Execution | undefined;
  const createStepsExecution = vi.fn<IntentsConnectApi['createStepsExecution']>(
    async (_address, body) => {
      const value: Execution = {
        id: 'steps-1',
        status: 'CREATED',
        type: 'solana',
        ...(withExecutionMode ? { executionMode: 'steps_only' } : {}),
        // Steps-only responses carry no bridge quote; the runner must not
        // depend on any of these figures.
        quote: {
          amount: '0',
          amountIn: '0',
          amountOut: '0',
          minAmountOut: '0',
          depositAddress: '',
          depositMemo: null,
        },
        steps: body.steps,
        metadata: body.metadata,
        details: {
          intermediaryAddress: SOL_INTERMEDIARY,
          networkFee: body.dry ? (dryFee ?? undefined) : realFee,
          signingStandard: 'erc191',
          payload: {
            standard: 'erc191',
            payload_json: '{"intents":[]}',
            payload_bytes_base64: base64.encode(new TextEncoder().encode('{}')),
          },
        },
      };

      if (!body.dry) {
        created = value;
      }

      return value;
    },
  );

  const api: IntentsConnectApi = {
    getIntermediary: vi.fn().mockResolvedValue({
      originAccount: ADDRESS,
      originType: 'evm',
      evm: EVM_INTERMEDIARY,
      solana: SOL_INTERMEDIARY,
    }),
    createExecution: vi.fn().mockRejectedValue(new Error('not a bridge-in')),
    createStepsExecution,
    listSupportedTokens: vi.fn().mockResolvedValue({ in: [], out: [] }),
    submitSignature: vi.fn().mockResolvedValue({ status: submitStatus }),
    recordDeposit: vi.fn().mockResolvedValue(undefined),
    listExecutions: vi.fn<IntentsConnectApi['listExecutions']>(
      async (_address, query) =>
        query?.id && created
          ? [
              {
                ...created,
                status: finalStatus,
                transaction: { solanaTxHash: 'solana-hash' },
              },
            ]
          : [],
    ),
    deleteExecution: vi.fn().mockResolvedValue(undefined),
  };

  const wallet = makeWallet();
  const events = collect();
  const runner = createExecutionRunner({
    api,
    wallet,
    logger: noopLogger,
    pollIntervalMs: 0,
    onEvent: events.onEvent,
  });

  return {
    api,
    wallet,
    runner,
    plan,
    recipe,
    buildSteps,
    events,
    created: () => created!,
  };
};

describe('runSteps — happy path', () => {
  it('walks create → sign → submit → settle with no deposit leg', async () => {
    const h = setup();

    const result = await h.runner.runSteps(h.plan);

    expect(result.transaction?.solanaTxHash).toBe('solana-hash');
    expect(phasesOf(h.events.events)).toEqual([
      'resolving-identity',
      'planning',
      'creating',
      'awaiting-signature',
      'submitting',
      'settling',
      'success',
    ]);
    expect(h.events.events.some((e) => e.type === 'deposit-address')).toBe(
      false,
    );
    expect(h.events.events).toContainEqual({
      type: 'quoted',
      networkFee: '100',
      spendable: '1000',
    });
    expect(h.api.createExecution).not.toHaveBeenCalled();
    expect(h.wallet.makeTransfer).not.toHaveBeenCalled();
    expect(h.api.recordDeposit).not.toHaveBeenCalled();
    expect(h.api.submitSignature).toHaveBeenCalledOnce();

    // Built once, at the caller's amount: the fee comes out of the output.
    expect(h.buildSteps.mock.calls.map(([ctx]) => ctx.amount)).toEqual([
      '1000',
    ]);

    const bodies = vi.mocked(h.api.createStepsExecution).mock.calls;

    expect(bodies.map(([, body]) => body.dry)).toEqual([true, false]);
    expect(bodies[1]![1]).toMatchObject({
      version: '1.0',
      type: 'solana',
      destinationAsset: USDC_ASSET,
      addressLookupTables: [SOL_USDC],
      metadata: {
        title: 'Spend from the Connect account',
        intent: 'solana_spend',
        intentsConnectFlow: 'steps-only',
      },
    });
    expect(bodies[1]![1].metadata).not.toHaveProperty(
      'intentsConnectFeeBudget',
    );
  });

  it('still settles when /submit says a deposit is pending', async () => {
    const h = setup({ submitStatus: 'SIGNED_PENDING_DEPOSIT' });

    await h.runner.runSteps(h.plan);

    expect(phasesOf(h.events.events)).not.toContain('awaiting-deposit');
    expect(h.wallet.makeTransfer).not.toHaveBeenCalled();
  });

  it('fails on a terminal failure status', async () => {
    const h = setup({ finalStatus: 'OPERATION_FAILED' });

    await expect(h.runner.runSteps(h.plan)).rejects.toThrow(/OPERATION_FAILED/);
    expect(h.runner.getPhase()).toBe('failed');
  });
});

describe('runSteps — fee carved from the spent amount', () => {
  it('rebuilds at amount − fee − reserve and records the fee budget', async () => {
    const h = setup();
    const plan: StepsPlan<void> = {
      ...h.plan,
      feeFromAmount: { amountReserveBps: 100 },
    };

    await h.runner.runSteps(plan);

    // (1000 − 100) × 0.99 = 891, rounded down.
    expect(h.buildSteps.mock.calls.map(([ctx]) => ctx.amount)).toEqual([
      '1000',
      '891',
    ]);
    expect(h.events.events).toContainEqual({
      type: 'quoted',
      networkFee: '100',
      spendable: '891',
    });

    const real = vi.mocked(h.api.createStepsExecution).mock.calls.at(-1)![1];

    expect((real.steps[0] as { args: unknown[] }).args[0]).toMatchObject({
      name: 'amount',
      value: '891',
    });
    expect(real.metadata).toMatchObject({ intentsConnectFeeBudget: '109' });
  });

  it('refuses to sign when the real fee exceeds the budget, keeping the execution cancellable', async () => {
    const h = setup({ dryFee: '100', realFee: '150' });

    await expect(
      h.runner.runSteps({ ...h.plan, feeFromAmount: true }),
    ).rejects.toMatchObject({ code: 'FEE_EXCEEDS_AMOUNT' });

    expect(h.api.submitSignature).not.toHaveBeenCalled();
    expect(h.runner.getStore().context.executionId).toBe('steps-1');
    expect(h.runner.getPhase()).toBe('failed');

    await h.runner.cancel();

    expect(h.api.deleteExecution).toHaveBeenCalledWith(
      ADDRESS,
      'steps-1',
      expect.anything(),
    );
  });

  it('accepts a real fee equal to the budget', async () => {
    const h = setup({ dryFee: '100', realFee: '100' });

    await expect(
      h.runner.runSteps({ ...h.plan, feeFromAmount: true }),
    ).resolves.toBeDefined();
  });

  it('enforces maxNetworkFee on a plan whose fee comes out of the output', async () => {
    const h = setup({ dryFee: '100', realFee: '400' });

    await expect(
      h.runner.runSteps({ ...h.plan, maxNetworkFee: '300' }),
    ).rejects.toMatchObject({ code: 'FEE_EXCEEDS_AMOUNT' });
    expect(h.api.submitSignature).not.toHaveBeenCalled();
    expect(h.buildSteps).toHaveBeenCalledOnce();
  });
});

describe('runSteps — planning guards', () => {
  it('stops before any real create when a fee carved from the amount cannot be measured', async () => {
    const h = setup({ dryFee: null });

    await expect(
      h.runner.runSteps({ ...h.plan, feeFromAmount: true }),
    ).rejects.toMatchObject({ code: 'FEE_NOT_ESTIMATED' });
    expect(h.api.createStepsExecution).toHaveBeenCalledOnce();
    expect(h.runner.getStore().context.executionId).toBeUndefined();
  });

  it('proceeds without a fee figure when the fee comes out of the output', async () => {
    const h = setup({ dryFee: null });

    const result = await h.runner.runSteps(h.plan);

    expect(result.status).toBe('SUCCESS');
    expect(h.events.events.some((e) => e.type === 'quoted')).toBe(false);
    expect(h.runner.getStore().context.networkFee).toBeUndefined();
    expect(h.runner.getStore().context.spendable).toBe('1000');
  });

  it('still enforces maxNetworkFee when the fee IS reported', async () => {
    const h = setup({ dryFee: '400' });

    await expect(
      h.runner.runSteps({ ...h.plan, maxNetworkFee: '300' }),
    ).rejects.toMatchObject({ code: 'FEE_EXCEEDS_AMOUNT' });
    expect(h.api.createStepsExecution).toHaveBeenCalledOnce();
  });

  it('refuses an amount the fee would consume', async () => {
    const h = setup({ dryFee: '1000' });

    await expect(
      h.runner.runSteps({ ...h.plan, feeFromAmount: true }),
    ).rejects.toMatchObject({ code: 'FEE_EXCEEDS_AMOUNT' });
    expect(h.api.createStepsExecution).toHaveBeenCalledOnce();
  });

  it('rejects a {MIN_AMOUNT_OUT} placeholder — there is no quote to substitute', async () => {
    const h = setup();

    h.buildSteps.mockImplementationOnce(async () => ({
      steps: [
        {
          programId: SOL_PROGRAM,
          discriminator: '0c',
          args: [{ name: 'amount', type: 'u64', value: '{MIN_AMOUNT_OUT}' }],
          accounts: [
            { pubkey: '{INTERMEDIARY}', isSigner: true, isWritable: false },
          ],
        },
      ],
    }));

    await expect(h.runner.runSteps(h.plan)).rejects.toMatchObject({
      code: 'STRATEGY_CONFLICT',
    });
    expect(h.api.createStepsExecution).not.toHaveBeenCalled();
  });

  it('rejects empty steps before the dry round', async () => {
    const h = setup();

    h.buildSteps.mockImplementationOnce(async () => ({ steps: [] }));

    await expect(h.runner.runSteps(h.plan)).rejects.toMatchObject({
      code: 'STEPS_REQUIRED',
    });
    expect(h.api.createStepsExecution).not.toHaveBeenCalled();
  });

  it('refuses a bridge-in recipe', async () => {
    const h = setup();

    await expect(
      h.runner.runSteps({
        ...h.plan,
        recipe: { ...h.recipe, flow: 'bridge-in' },
      }),
    ).rejects.toMatchObject({ code: 'STRATEGY_CONFLICT' });
    expect(h.api.createStepsExecution).not.toHaveBeenCalled();
  });

  it('pre-empts the in-flight lock with the blocking execution id', async () => {
    const h = setup();

    vi.mocked(h.api.listExecutions).mockImplementation(
      async (_address, query) =>
        query?.id ? [] : [{ ...h.created?.(), id: 'open-1' } as Execution],
    );
    vi.mocked(h.api.listExecutions).mockResolvedValue([
      { id: 'open-1', status: 'OPERATION_PENDING' } as Execution,
    ]);

    await expect(h.runner.runSteps(h.plan)).rejects.toMatchObject({
      code: 'EXECUTION_IN_FLIGHT',
      meta: { executionId: 'open-1' },
    });
    expect(
      vi
        .mocked(h.api.createStepsExecution)
        .mock.calls.every(([, body]) => body.dry),
    ).toBe(true);
  });

  it('translates a 409 from the steps endpoint into EXECUTION_IN_FLIGHT', async () => {
    const h = setup();
    const original = vi
      .mocked(h.api.createStepsExecution)
      .getMockImplementation()!;

    vi.mocked(h.api.createStepsExecution).mockImplementation(
      async (address, body) => {
        if (!body.dry) {
          throw new IntentsConnectApiError('already in progress', 409);
        }

        return original(address, body);
      },
    );

    await expect(h.runner.runSteps(h.plan)).rejects.toMatchObject({
      code: 'EXECUTION_IN_FLIGHT',
    });
  });

  it('surfaces a 503 (no durable nonce) as an API error before any execution exists', async () => {
    const h = setup();

    vi.mocked(h.api.createStepsExecution).mockRejectedValueOnce(
      new IntentsConnectApiError('No Solana durable nonce account', 503),
    );

    const error = await h.runner.runSteps(h.plan).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(IntentsConnectApiError);
    expect((error as IntentsConnectApiError).status).toBe(503);
    expect(h.runner.getPhase()).toBe('failed');
    expect(h.runner.getStore().context.executionId).toBeUndefined();
  });

  it('stops when disposed during asynchronous preparation', async () => {
    const h = setup();
    const build = h.buildSteps.getMockImplementation()!;

    h.buildSteps.mockImplementationOnce(async (...args) => {
      h.runner.dispose();

      return build(...args);
    });

    await expect(h.runner.runSteps(h.plan)).rejects.toMatchObject({
      name: 'RunnerDisposedError',
    });
    expect(h.api.createStepsExecution).not.toHaveBeenCalled();
  });
});

describe('runSteps — signature and acceptance', () => {
  it('auto-cancels the created execution when the signing prompt is rejected', async () => {
    const h = setup();
    const providers = h.wallet.getProviders();

    h.wallet.getProviders = () => providers;
    vi.mocked(
      (providers.evm as import('@/types/providers').Eip1193Provider).request,
    ).mockRejectedValueOnce({ code: 4001 });

    await expect(h.runner.runSteps(h.plan)).rejects.toMatchObject({
      cause: { code: 4001 },
    });

    expect(h.api.deleteExecution).toHaveBeenCalledWith(
      ADDRESS,
      'steps-1',
      expect.anything(),
    );
    expect(h.api.submitSignature).not.toHaveBeenCalled();
    expect(h.runner.getPhase()).toBe('cancelled');
  });

  it('runs the application acceptance check before signing', async () => {
    const h = setup();
    const validateExecution = vi.fn(() => {
      throw new Error('output too low');
    });

    await expect(
      h.runner.runSteps({ ...h.plan, validateExecution }),
    ).rejects.toThrow('output too low');
    expect(validateExecution).toHaveBeenCalledOnce();
    expect(h.api.submitSignature).not.toHaveBeenCalled();
    expect(h.runner.getStore().context.executionId).toBe('steps-1');
  });

  it('retryDeposit() has nothing to retry after a steps-only failure', async () => {
    const h = setup({ finalStatus: 'OPERATION_FAILED' });

    await h.runner.runSteps(h.plan).catch(() => undefined);

    await expect(h.runner.retryDeposit()).rejects.toThrow(/nothing to retry/);
  });
});

describe('previewSteps', () => {
  it('prepares on an isolated machine and commits those exact steps', async () => {
    const h = setup();

    const preview = await h.runner.previewSteps({
      ...h.plan,
      feeFromAmount: true,
    });

    expect(h.runner.getPhase()).toBe('idle');
    expect(h.events.events).toEqual([]);
    expect(h.api.listExecutions).not.toHaveBeenCalled();
    expect(h.api.submitSignature).not.toHaveBeenCalled();
    expect(
      vi
        .mocked(h.api.createStepsExecution)
        .mock.calls.every(([, body]) => body.dry),
    ).toBe(true);
    // Measuring dry + confirming dry.
    expect(h.api.createStepsExecution).toHaveBeenCalledTimes(2);
    expect(preview.spendable).toBe('900');
    expect(preview.networkFee).toBe('100');
    expect(preview.plan.prepared).toMatchObject({
      walletAddress: ADDRESS,
      intermediary: SOL_INTERMEDIARY,
      amount: '1000',
      spendable: '900',
      feeBudget: '100',
    });
    expect(Date.parse(preview.plan.prepared!.expiresAt)).toBeGreaterThan(
      Date.now(),
    );
    expect(Object.isFrozen(preview.plan.prepared?.steps[0])).toBe(true);

    h.buildSteps.mockClear();
    const result = await h.runner.runSteps(preview.plan);

    expect(result.status).toBe('SUCCESS');
    expect(h.buildSteps).not.toHaveBeenCalled();

    const real = vi.mocked(h.api.createStepsExecution).mock.calls.at(-1)![1];

    expect(real.dry).toBe(false);
    expect(real.steps).toEqual(preview.plan.prepared!.steps);
    expect(real.metadata).toMatchObject({ intentsConnectFeeBudget: '100' });
    expect(phasesOf(h.events.events)).toContain('planning');
  });

  it.each([
    [
      'expired',
      (p: StepsPlan<void>) => ({
        ...p,
        prepared: {
          ...p.prepared!,
          expiresAt: new Date(Date.now() - 1).toISOString(),
        },
      }),
    ],
    ['a changed amount', (p: StepsPlan<void>) => ({ ...p, amount: '999' })],
    [
      'a different wallet',
      (p: StepsPlan<void>) => ({
        ...p,
        prepared: { ...p.prepared!, walletAddress: '0xSomeoneElse' },
      }),
    ],
    [
      'a different intermediary',
      (p: StepsPlan<void>) => ({
        ...p,
        prepared: { ...p.prepared!, intermediary: EVM_INTERMEDIARY },
      }),
    ],
  ])(
    'refuses a prepared plan that is %s without a real create',
    async (_label, mutate) => {
      const h = setup();
      const preview = await h.runner.previewSteps(h.plan);

      vi.mocked(h.api.createStepsExecution).mockClear();

      await expect(
        h.runner.runSteps(mutate(preview.plan)),
      ).rejects.toMatchObject({
        code: 'QUOTE_MOVED',
      });
      expect(h.api.createStepsExecution).not.toHaveBeenCalled();
    },
  );

  it('rebuilds once when the confirming fee rises, then fails when it keeps rising', async () => {
    const h = setup();
    const fees = ['100', '150', '150'];

    vi.mocked(h.api.createStepsExecution).mockImplementation(
      async (_address, body) =>
        ({
          id: 'dry',
          status: 'CREATED',
          type: 'solana',
          steps: body.steps,
          metadata: body.metadata,
          quote: {} as Execution['quote'],
          details: {
            intermediaryAddress: SOL_INTERMEDIARY,
            networkFee: fees.shift() ?? '150',
          },
        }) as Execution,
    );

    const preview = await h.runner.previewSteps({
      ...h.plan,
      feeFromAmount: true,
    });

    expect(h.buildSteps.mock.calls.map(([ctx]) => ctx.amount)).toEqual([
      '1000',
      '900',
      '850',
    ]);
    expect(preview.networkFee).toBe('150');
    expect(preview.spendable).toBe('850');
    expect(preview.plan.prepared?.feeBudget).toBe('150');

    const rising = ['100', '150', '200', '250', '300'];

    vi.mocked(h.api.createStepsExecution).mockImplementation(
      async (_address, body) =>
        ({
          id: 'dry',
          status: 'CREATED',
          type: 'solana',
          steps: body.steps,
          metadata: body.metadata,
          quote: {} as Execution['quote'],
          details: {
            intermediaryAddress: SOL_INTERMEDIARY,
            networkFee: rising.shift() ?? '999',
          },
        }) as Execution,
    );

    await expect(
      h.runner.previewSteps({ ...h.plan, feeFromAmount: true }),
    ).rejects.toMatchObject({ code: 'FEE_EXCEEDS_AMOUNT' });
  });

  it('prices a swap-style plan with a single dry create and applies the cap there', async () => {
    const h = setup({ dryFee: '100' });

    const preview = await h.runner.previewSteps({
      ...h.plan,
      maxNetworkFee: '300',
    });

    expect(h.api.createStepsExecution).toHaveBeenCalledOnce();
    expect(h.buildSteps).toHaveBeenCalledOnce();
    expect(preview.networkFee).toBe('100');
    expect(preview.plan.prepared?.feeBudget).toBe('300');

    const capped = setup({ dryFee: '400' });

    await expect(
      capped.runner.previewSteps({ ...capped.plan, maxNetworkFee: '300' }),
    ).rejects.toMatchObject({ code: 'FEE_EXCEEDS_AMOUNT' });
    expect(capped.api.createStepsExecution).toHaveBeenCalledOnce();
  });

  it('previews a plan whose dry create reports no fee', async () => {
    const h = setup({ dryFee: null });

    const preview = await h.runner.previewSteps(h.plan);

    expect(preview.networkFee).toBeUndefined();
    expect(preview.spendable).toBe('1000');
    expect(preview.plan.prepared?.networkFee).toBeUndefined();

    await expect(h.runner.runSteps(preview.plan)).resolves.toMatchObject({
      status: 'SUCCESS',
    });
  });
});

describe('resume of a steps-only execution', () => {
  it.each([true, false])(
    'signs and settles an unsigned CREATED execution without a deposit (executionMode present: %s)',
    async (withExecutionMode) => {
      const h = setup({ withExecutionMode });

      // Create it, but lose the flow before signing.
      const providers = h.wallet.getProviders();

      h.wallet.getProviders = () => providers;
      vi.mocked(
        (providers.evm as import('@/types/providers').Eip1193Provider).request,
      ).mockRejectedValueOnce({ code: 4001 });
      await h.runner
        .runSteps({ ...h.plan, feeFromAmount: true })
        .catch(() => undefined);

      const created = h.created();
      const runner = createExecutionRunner({
        api: h.api,
        wallet: makeWallet(),
        logger: noopLogger,
        pollIntervalMs: 0,
        onEvent: h.events.onEvent,
      });

      h.events.events.length = 0;
      vi.mocked(h.api.listExecutions)
        .mockResolvedValueOnce([created])
        .mockResolvedValueOnce([{ ...created, status: 'SUCCESS' }]);

      const result = await runner.resume(created.id);

      expect(result.status).toBe('SUCCESS');
      expect(phasesOf(h.events.events)).toEqual([
        'awaiting-signature',
        'submitting',
        'settling',
        'success',
      ]);
      expect(h.wallet.makeTransfer).not.toHaveBeenCalled();
      expect(h.events.events.some((e) => e.type === 'deposit-address')).toBe(
        false,
      );
    },
  );

  it('re-checks the recorded fee budget before signing', async () => {
    const h = setup({ realFee: '150' });

    await h.runner
      .runSteps({ ...h.plan, feeFromAmount: true })
      .catch(() => undefined);

    const created = h.created();

    expect(created.metadata).toMatchObject({ intentsConnectFeeBudget: '100' });

    const runner = createExecutionRunner({
      api: h.api,
      wallet: makeWallet(),
      logger: noopLogger,
      pollIntervalMs: 0,
    });

    vi.mocked(h.api.listExecutions).mockResolvedValue([created]);

    await expect(runner.resume(created.id)).rejects.toMatchObject({
      code: 'FEE_EXCEEDS_AMOUNT',
    });
    expect(h.api.submitSignature).not.toHaveBeenCalled();
  });

  it('polls a signed OPERATION_PENDING execution straight to settlement', async () => {
    const h = setup();

    await h.runner.runSteps(h.plan);
    const created = h.created();

    h.events.events.length = 0;
    vi.mocked(h.api.listExecutions)
      .mockResolvedValueOnce([
        {
          ...created,
          status: 'OPERATION_PENDING',
          details: { ...created.details, messageSigned: true },
        },
      ])
      .mockResolvedValueOnce([{ ...created, status: 'SUCCESS' }]);

    await h.runner.resume(created.id);

    expect(phasesOf(h.events.events)).toEqual(['settling', 'success']);
    expect(h.api.submitSignature).toHaveBeenCalledOnce();
  });
});

describe('interleaving with bridge-in', () => {
  it('a steps-only run leaves no state that trips a later flow', async () => {
    const h = setup({ dryFee: '100' });

    await h.runner.runSteps({ ...h.plan, feeFromAmount: true });

    expect(h.runner.getStore().context.bakedAmount).toBe('900');

    // A second steps-only run must plan from scratch, not against the
    // previous baked amount.
    h.events.events.length = 0;
    await h.runner.runSteps(h.plan);

    expect(h.runner.getStore().context.bakedAmount).toBe('1000');
    expect(phasesOf(h.events.events)[0]).toBe('resolving-identity');
  });
});
