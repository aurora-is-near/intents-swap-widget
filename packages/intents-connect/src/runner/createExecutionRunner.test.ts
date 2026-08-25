import { base64 } from '@scure/base';
import { describe, expect, it, vi } from 'vitest';

import type { IntentsConnectApi } from '@/api/types';
import { IntentsConnectApiError } from '@/errors';
import { noopLogger } from '@/logger';
import type { Execution, ExecutionStatus, Step } from '@/types/execution';
import type { Recipe } from '@/types/recipe';
import type { WalletConnector } from '@/types/wallet';
import { createExecutionRunner } from '@/runner/createExecutionRunner';
import type { RunnerEvent } from '@/runner/types';

const ADDRESS = '0xD84368a36ff4F6285F4121ED75E8c1f237E51506';
const INTERMEDIARY = '0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const recipe: Recipe<{ pool: string }> = {
  id: 'test-supply',
  intent: 'test_supply',
  title: 'Test supply',
  flow: 'bridge-in',
  type: 'evm',
  destination: {
    chain: 'base',
    assetId: 'nep141:base-usdc',
    tokenAddress: USDC,
  },
  buildSteps: ({ intermediary, amount }, { pool }): Step[] => [
    {
      to: USDC,
      functionSignature: 'approve(address,uint256)',
      parameters: [pool, amount],
      value: '0',
    },
    {
      to: pool,
      functionSignature: 'supply(address,uint256,address,uint16)',
      parameters: [USDC, amount, intermediary, '0'],
      value: '0',
    },
  ],
};

const execution = (status: ExecutionStatus = 'CREATED'): Execution => ({
  id: 'exec-1',
  status,
  quote: {
    amount: '1270000',
    amountIn: '1270000',
    amountOut: '88150',
    minAmountOut: '87125',
    depositAddress: 'deposit-address',
    depositMemo: null,
  },
  details: {
    intermediaryAddress: INTERMEDIARY,
    networkFee: '7150',
    signingStandard: 'erc191',
    payload: {
      standard: 'erc191',
      payload_json: '{"intents":[]}',
      payload_bytes_base64: base64.encode(new TextEncoder().encode('{}')),
    },
  },
  steps: [],
});

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

type ApiOverrides = Partial<IntentsConnectApi> & {
  statusSequence?: ExecutionStatus[];
};

const makeApi = (overrides: ApiOverrides = {}): IntentsConnectApi => {
  const { statusSequence = ['SUCCESS'], ...rest } = overrides;
  const queue = [...statusSequence];

  return {
    getIntermediary: vi.fn().mockResolvedValue({
      originAccount: ADDRESS,
      originType: 'evm',
      evm: INTERMEDIARY,
      solana: null,
    }),
    createExecution: vi.fn().mockResolvedValue(execution()),
    createStepsExecution: vi.fn().mockResolvedValue(execution()),
    listSupportedTokens: vi.fn().mockResolvedValue({ in: [], out: [] }),
    submitSignature: vi
      .fn()
      .mockResolvedValue({ status: 'SIGNED_PENDING_DEPOSIT' }),
    recordDeposit: vi.fn().mockResolvedValue(undefined),
    listExecutions: vi.fn(async (_wallet: string, query?: { id?: string }) => {
      // The open-execution preflight filters by status, not id.
      if (!query?.id) {
        return [];
      }

      const next = queue.length > 1 ? queue.shift() : queue[0];

      return [execution(next as ExecutionStatus)];
    }),
    deleteExecution: vi.fn().mockResolvedValue(undefined),
    ...rest,
  };
};

const basePlan = {
  recipe,
  params: { pool: '0xPool' },
  quote: {
    originAsset: 'nep141:sol.omft.near',
    destinationAsset: 'nep141:base-usdc',
    amount: '1270000',
    swapType: 'EXACT_INPUT' as const,
    slippageTolerance: 100,
    deadline: '2026-07-30T12:00:00Z',
  },
  originChain: 'base',
  originToken: { contractAddress: USDC, decimals: 6 },
  depositViaWallet: true,
};

const collect = () => {
  const events: RunnerEvent[] = [];

  return { events, onEvent: (event: RunnerEvent) => events.push(event) };
};

const phasesOf = (events: RunnerEvent[]) =>
  events.filter((e) => e.type === 'phase').map((e) => e.phase);

describe('createExecutionRunner — bridge-in happy path', () => {
  it('walks every phase in order and resolves on SUCCESS', async () => {
    const { events, onEvent } = collect();
    const api = makeApi();

    const result = await createExecutionRunner({
      api,
      wallet: makeWallet(),
      logger: noopLogger,
      pollIntervalMs: 0,
      onEvent,
    }).run(basePlan);

    expect(result.status).toBe('SUCCESS');
    expect(phasesOf(events)).toEqual([
      'resolving-identity',
      'planning',
      'creating',
      'awaiting-signature',
      'submitting',
      'awaiting-deposit',
      'settling',
      'success',
    ]);
  });

  it('creates exactly one execution with the placeholder strategy', async () => {
    const api = makeApi();

    await createExecutionRunner({
      api,
      wallet: makeWallet(),
      logger: noopLogger,
      pollIntervalMs: 0,
    }).run(basePlan);

    expect(api.createExecution).toHaveBeenCalledTimes(1);

    const [, body] = vi.mocked(api.createExecution).mock.calls[0]!;

    expect(body.dry).toBe(false);
    expect(JSON.stringify(body.steps)).toContain('{MIN_AMOUNT_OUT}');
    expect(body.metadata).toMatchObject({ intent: 'test_supply' });
  });

  it('signs and submits before exposing any deposit address', async () => {
    const { events, onEvent } = collect();

    await createExecutionRunner({
      api: makeApi(),
      wallet: makeWallet(),
      logger: noopLogger,
      pollIntervalMs: 0,
      onEvent,
    }).run(basePlan);

    const submitIndex = events.findIndex(
      (e) => e.type === 'phase' && e.phase === 'submitting',
    );

    const addressIndex = events.findIndex((e) => e.type === 'deposit-address');

    expect(addressIndex).toBeGreaterThan(submitIndex);
  });

  it('sends the deposit and records the tx hash', async () => {
    const api = makeApi();
    const wallet = makeWallet();

    await createExecutionRunner({
      api,
      wallet,
      logger: noopLogger,
      pollIntervalMs: 0,
    }).run(basePlan);

    expect(wallet.makeTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        address: 'deposit-address',
        amountAtomic: '1270000',
        tokenAddress: USDC,
        decimals: 6,
      }),
    );
    expect(api.recordDeposit).toHaveBeenCalledWith({
      txHash: '0xdeposit',
      depositAddress: 'deposit-address',
    });
  });

  it('deposits quote.amountIn for EXACT_OUTPUT rather than recomputing', async () => {
    const wallet = makeWallet();

    await createExecutionRunner({
      api: makeApi(),
      wallet,
      logger: noopLogger,
      pollIntervalMs: 0,
    }).run({
      ...basePlan,
      quote: { ...basePlan.quote, swapType: 'EXACT_OUTPUT' as const },
    });

    expect(wallet.makeTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ amountAtomic: '1270000' }),
    );
  });
});

describe('createExecutionRunner — QR / exchange path', () => {
  it('exposes the deposit address but never transfers or records', async () => {
    const { events, onEvent } = collect();
    const api = makeApi();
    const wallet = makeWallet();

    await createExecutionRunner({
      api,
      wallet,
      logger: noopLogger,
      pollIntervalMs: 0,
      onEvent,
    }).run({ ...basePlan, depositViaWallet: false });

    expect(events).toContainEqual({
      type: 'deposit-address',
      address: 'deposit-address',
      memo: null,
      deadline: '2026-07-30T12:00:00Z',
    });
    expect(wallet.makeTransfer).not.toHaveBeenCalled();
    // There is no tx hash to record — the backend watcher observes settlement.
    expect(api.recordDeposit).not.toHaveBeenCalled();
  });
});

describe('createExecutionRunner — three-round fee strategy', () => {
  it('makes two dry rounds then a real create, and reports exact figures', async () => {
    const { events, onEvent } = collect();
    const api = makeApi();

    await createExecutionRunner({
      api,
      wallet: makeWallet(),
      logger: noopLogger,
      pollIntervalMs: 0,
      onEvent,
    }).run({ ...basePlan, feeStrategy: { kind: 'threeRound' } });

    expect(api.createExecution).toHaveBeenCalledTimes(3);

    const { calls } = vi.mocked(api.createExecution).mock;

    // Round 1 must be step-less so no fee is carved.
    expect(calls[0]![1].steps).toEqual([]);
    expect(calls[0]![1].dry).toBe(true);
    expect(calls[1]![1].dry).toBe(true);
    expect(calls[1]![1].steps.length).toBeGreaterThan(0);
    expect(calls[2]![1].dry).toBe(false);

    expect(events).toContainEqual({
      type: 'quoted',
      networkFee: '7150',
      spendable: '87125',
    });
  });

  it('aborts when the quote moves below the baked amount between rounds', async () => {
    const moved = execution();

    moved.quote = { ...moved.quote, minAmountOut: '80000' };

    const api = makeApi({
      createExecution: vi
        .fn()
        .mockResolvedValueOnce(execution())
        .mockResolvedValueOnce(execution())
        .mockResolvedValueOnce(moved),
    });

    await expect(
      createExecutionRunner({
        api,
        wallet: makeWallet(),
        logger: noopLogger,
        pollIntervalMs: 0,
      }).run({ ...basePlan, feeStrategy: { kind: 'threeRound' } }),
    ).rejects.toMatchObject({ code: 'QUOTE_MOVED' });
  });

  it('aborts when the measuring round reports no networkFee', async () => {
    const unmeasured = execution();

    unmeasured.details = { intermediaryAddress: INTERMEDIARY };

    const api = makeApi({
      createExecution: vi
        .fn()
        .mockResolvedValueOnce(execution())
        .mockResolvedValueOnce(unmeasured),
    });

    await expect(
      createExecutionRunner({
        api,
        wallet: makeWallet(),
        logger: noopLogger,
        pollIntervalMs: 0,
      }).run({ ...basePlan, feeStrategy: { kind: 'threeRound' } }),
    ).rejects.toMatchObject({ code: 'FEE_NOT_ESTIMATED' });
  });
});

describe('createExecutionRunner — failure and recovery', () => {
  it('pre-empts the 409 lock when an execution is already open', async () => {
    const api = makeApi({
      listExecutions: vi.fn(async (_w: string, query?: { id?: string }) =>
        query?.id ? [execution('SUCCESS')] : [execution('CREATED')],
      ),
    });

    await expect(
      createExecutionRunner({
        api,
        wallet: makeWallet(),
        logger: noopLogger,
        pollIntervalMs: 0,
      }).run(basePlan),
    ).rejects.toMatchObject({ code: 'EXECUTION_IN_FLIGHT' });

    expect(api.createExecution).not.toHaveBeenCalled();
  });

  it('translates a 409 from create into EXECUTION_IN_FLIGHT', async () => {
    const api = makeApi({
      createExecution: vi
        .fn()
        .mockRejectedValue(
          new IntentsConnectApiError('already in progress', 409),
        ),
    });

    await expect(
      createExecutionRunner({
        api,
        wallet: makeWallet(),
        logger: noopLogger,
        pollIntervalMs: 0,
      }).run(basePlan),
    ).rejects.toMatchObject({ code: 'EXECUTION_IN_FLIGHT' });
  });

  it('keeps polling through EXPIRED, because a late deposit revives it', async () => {
    const { events, onEvent } = collect();

    const result = await createExecutionRunner({
      api: makeApi({
        statusSequence: [
          'DEPOSIT_PENDING',
          'EXPIRED',
          'OPERATION_PROCESSING',
          'SUCCESS',
        ],
      }),
      wallet: makeWallet(),
      logger: noopLogger,
      pollIntervalMs: 0,
      onEvent,
    }).run(basePlan);

    expect(result.status).toBe('SUCCESS');
    expect(phasesOf(events)).toContain('expired');
    expect(phasesOf(events).at(-1)).toBe('success');
  });

  it('fails on a terminal failure status', async () => {
    const { events, onEvent } = collect();

    await expect(
      createExecutionRunner({
        api: makeApi({ statusSequence: ['OPERATION_FAILED'] }),
        wallet: makeWallet(),
        logger: noopLogger,
        pollIntervalMs: 0,
        onEvent,
      }).run(basePlan),
    ).rejects.toThrow(/OPERATION_FAILED/);

    expect(phasesOf(events).at(-1)).toBe('failed');
  });

  it('reports a missing transfer implementation instead of silently skipping', async () => {
    const wallet = makeWallet();

    delete (wallet as { makeTransfer?: unknown }).makeTransfer;

    await expect(
      createExecutionRunner({
        api: makeApi(),
        wallet,
        logger: noopLogger,
        pollIntervalMs: 0,
      }).run(basePlan),
    ).rejects.toMatchObject({ code: 'NO_TRANSFER_IMPLEMENTATION' });
  });

  it('surfaces a disconnected wallet before touching the network', async () => {
    const api = makeApi();
    const wallet = { ...makeWallet(), getAddress: () => undefined };

    await expect(
      createExecutionRunner({
        api,
        wallet,
        logger: noopLogger,
        pollIntervalMs: 0,
      }).run(basePlan),
    ).rejects.toMatchObject({ code: 'WALLET_NOT_CONNECTED' });

    expect(api.getIntermediary).not.toHaveBeenCalled();
  });
});

describe('createExecutionRunner — regressions', () => {
  it('queries every in-flight status in the preflight, not just CREATED', async () => {
    // A deposited-but-unsettled execution holds the lock too, so filtering on
    // CREATED alone let the create through and made the guard useless.
    const api = makeApi();

    await createExecutionRunner({
      api,
      wallet: makeWallet(),
      logger: noopLogger,
      pollIntervalMs: 0,
    }).run(basePlan);

    const preflight = vi
      .mocked(api.listExecutions)
      .mock.calls.find(([, query]) => query?.status !== undefined);

    expect(preflight?.[1]?.status).toEqual(
      expect.arrayContaining([
        'CREATED',
        'DEPOSIT_PENDING',
        'DEPOSIT_PROCESSING',
        'OPERATION_PENDING',
        'OPERATION_PROCESSING',
      ]),
    );
    // EXPIRED must not be included, or an expiry would block every retry.
    expect(preflight?.[1]?.status).not.toContain('EXPIRED');
  });

  it('keeps settling when the wallet disconnects mid-poll', async () => {
    // The execution is completing server-side; a disconnect must not be reported
    // as a failed deposit.
    const wallet = makeWallet();
    let address: string | undefined = ADDRESS;

    const flaky = {
      ...wallet,
      getAddress: () => address,
    };

    const api = makeApi({
      statusSequence: ['DEPOSIT_PENDING', 'OPERATION_PROCESSING', 'SUCCESS'],
    });

    const runner = createExecutionRunner({
      api,
      wallet: flaky,
      logger: noopLogger,
      pollIntervalMs: 0,
    });

    const running = runner.run(basePlan);

    // Drop the wallet once polling is under way.
    setTimeout(() => {
      address = undefined;
    }, 0);

    await expect(running).resolves.toMatchObject({ status: 'SUCCESS' });
  });

  it('emits expired once while an expiry persists', async () => {
    const { events, onEvent } = collect();

    await expect(
      createExecutionRunner({
        api: makeApi({ statusSequence: ['EXPIRED'] }),
        wallet: makeWallet(),
        logger: noopLogger,
        pollIntervalMs: 0,
        maxPollAttempts: 4,
        onEvent,
      }).run(basePlan),
    ).rejects.toThrow(/expired and was not revived/);

    // Previously this flipped expired → settling on every poll.
    expect(phasesOf(events).filter((p) => p === 'expired')).toHaveLength(1);
  });

  it('reaches success from a phase left at expired', async () => {
    // expired has no direct edge to success, so a revival must route back through
    // settling first.
    const result = await createExecutionRunner({
      api: makeApi({ statusSequence: ['EXPIRED', 'SUCCESS'] }),
      wallet: makeWallet(),
      logger: noopLogger,
      pollIntervalMs: 0,
    }).run(basePlan);

    expect(result.status).toBe('SUCCESS');
  });

  it('validates the publicKey against the execution signing standard', async () => {
    // The connector claims erc191 while the API asks for sep53. The mismatch
    // must not surface as a publicKey complaint about erc191.
    const sep53Execution = execution();

    sep53Execution.details = {
      ...sep53Execution.details,
      signingStandard: 'sep53',
      payload: {
        standard: 'sep53',
        payload_json: '{}',
        payload_bytes_base64: 'e30=',
      },
    };

    await expect(
      createExecutionRunner({
        api: makeApi({
          createExecution: vi.fn().mockResolvedValue(sep53Execution),
        }),
        wallet: makeWallet(),
        logger: noopLogger,
        pollIntervalMs: 0,
      }).run(basePlan),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_SIGNING_STANDARD' });
  });

  it('accepts a wallet accessor and reads the current connector', async () => {
    let current = makeWallet();

    const api = makeApi();

    await createExecutionRunner({
      api,
      // Rebuilt between calls, exactly as a React connector would be.
      wallet: () => current,
      logger: noopLogger,
      pollIntervalMs: 0,
    }).run(basePlan);

    expect(api.createExecution).toHaveBeenCalled();

    current = makeWallet();

    expect(current.getAddress()).toBe(ADDRESS);
  });

  it('warns rather than throwing when a recipe ignores ctx.amount', async () => {
    const warn = vi.fn();
    const fixedAmountRecipe: Recipe<{ pool: string }> = {
      ...recipe,
      buildSteps: (): Step[] => [
        {
          to: USDC,
          functionSignature: 'approve(address,uint256)',
          parameters: ['0xPool', '1000000'],
          value: '0',
        },
      ],
    };

    await createExecutionRunner({
      api: makeApi(),
      wallet: makeWallet(),
      logger: { ...noopLogger, warn },
      pollIntervalMs: 0,
    }).run({ ...basePlan, recipe: fixedAmountRecipe });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ctx.amount'));
  });
});

describe('createExecutionRunner — recovery after a rejected signature', () => {
  it('carries the blocking execution id on the in-flight guard error', async () => {
    const api = makeApi({
      listExecutions: vi.fn(async (_w: string, query?: { id?: string }) =>
        query?.id ? [execution('SUCCESS')] : [execution('CREATED')],
      ),
    });

    const error = await createExecutionRunner({
      api,
      wallet: makeWallet(),
      logger: noopLogger,
      pollIntervalMs: 0,
    })
      .run(basePlan)
      .catch((e: unknown) => e);

    // Structured, so a UI can wire resume/cancel buttons to it instead of
    // parsing the message text.
    expect(error).toMatchObject({
      code: 'EXECUTION_IN_FLIGHT',
      meta: { executionId: 'exec-1' },
    });
  });

  it('resume() after a rejected signature signs AND sends the deposit', async () => {
    // First attempt: the user rejects the personal_sign prompt.
    let rejectSignature = true;
    const wallet = makeWallet();
    const baseProviders = wallet.getProviders();

    wallet.getProviders = () => ({
      evm: {
        request: async (args: { method: string }) => {
          if (args.method === 'personal_sign' && rejectSignature) {
            throw Object.assign(new Error('User rejected the request.'), {
              code: 4001,
            });
          }

          return (
            baseProviders.evm as { request: (a: unknown) => Promise<unknown> }
          ).request(args);
        },
      },
    });

    const api = makeApi({ statusSequence: ['DEPOSIT_PENDING', 'SUCCESS'] });
    const runner = createExecutionRunner({
      api,
      wallet,
      logger: noopLogger,
      pollIntervalMs: 0,
    });

    await expect(runner.run(basePlan)).rejects.toThrow(/rejected/i);
    expect(wallet.makeTransfer).not.toHaveBeenCalled();

    // Second attempt: same runner, user approves this time. resume() must
    // replay the SIGNATURE and the WALLET TRANSFER — it still holds the plan.
    rejectSignature = false;

    const result = await runner.resume('exec-1');

    expect(result.status).toBe('SUCCESS');
    expect(api.submitSignature).toHaveBeenCalledTimes(1);
    expect(wallet.makeTransfer).toHaveBeenCalledTimes(1);
    expect(api.recordDeposit).toHaveBeenCalledTimes(1);
  });

  it('a run() blocked by the in-flight guard keeps the plan resumable', async () => {
    let rejectSignature = true;
    let open = false;
    const wallet = makeWallet();
    const baseProviders = wallet.getProviders();

    wallet.getProviders = () => ({
      evm: {
        request: async (args: { method: string }) => {
          if (args.method === 'personal_sign' && rejectSignature) {
            throw Object.assign(new Error('User rejected the request.'), {
              code: 4001,
            });
          }

          return (
            baseProviders.evm as { request: (a: unknown) => Promise<unknown> }
          ).request(args);
        },
      },
    });

    const queue: ExecutionStatus[] = ['CREATED', 'DEPOSIT_PENDING', 'SUCCESS'];
    const api = makeApi({
      listExecutions: vi.fn(async (_w: string, query?: { id?: string }) => {
        if (!query?.id) {
          return open ? [execution('DEPOSIT_PENDING')] : [];
        }

        const next = queue.length > 1 ? queue.shift() : queue[0];

        return [execution(next as ExecutionStatus)];
      }),
    });

    const runner = createExecutionRunner({
      api,
      wallet,
      logger: noopLogger,
      pollIntervalMs: 0,
    });

    // First attempt creates exec-1 but the signature is rejected.
    await expect(runner.run(basePlan)).rejects.toThrow(/rejected/i);

    // Second click: the preflight guard blocks it. This run must NOT clobber
    // the plan retained for exec-1 — it never created anything.
    open = true;

    await expect(runner.run(basePlan)).rejects.toMatchObject({
      code: 'EXECUTION_IN_FLIGHT',
    });

    // Resume is therefore still a full same-session recovery: sign AND
    // transfer.
    rejectSignature = false;

    const result = await runner.resume('exec-1');

    expect(result.status).toBe('SUCCESS');
    expect(wallet.makeTransfer).toHaveBeenCalledTimes(1);
    expect(api.recordDeposit).toHaveBeenCalledTimes(1);
  });

  it('resume() rebuilds and sends the deposit transfer from the execution alone', async () => {
    // Cross-session (fresh runner, no plan): quote.originAsset decodes to the
    // chain and token, the amount comes off the execution, and the EVM chain
    // id from the built-in registry — so the wallet transfer is driven
    // instead of only surfacing the address.
    const signed = (status: ExecutionStatus): Execution => ({
      ...execution(status),
      quote: {
        ...execution().quote,
        originAsset:
          'nep141:gnosis-0x2a22f9c3b484c3629090feed35f17ff8f88f76f0.omft.near',
        swapType: 'EXACT_INPUT',
      },
      details: { ...execution().details, messageSigned: true },
    });

    const statuses: ExecutionStatus[] = ['DEPOSIT_PENDING', 'SUCCESS'];
    const api = makeApi({
      listExecutions: vi.fn(async (_w: string, query?: { id?: string }) => {
        if (!query?.id) {
          return [];
        }

        const status = statuses.length > 1 ? statuses.shift() : statuses[0];

        return [signed(status as ExecutionStatus)];
      }),
    });

    const wallet = makeWallet();

    const result = await createExecutionRunner({
      api,
      wallet,
      logger: noopLogger,
      pollIntervalMs: 0,
    }).resume('exec-1');

    expect(result.status).toBe('SUCCESS');
    expect(api.submitSignature).not.toHaveBeenCalled();
    expect(wallet.makeTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        address: 'deposit-address',
        amountAtomic: '1270000',
        tokenAddress: '0x2a22f9c3b484c3629090feed35f17ff8f88f76f0',
        chain: 'gnosis',
        evmChainId: 100,
        isNativeEvmTokenTransfer: false,
      }),
    );
    expect(api.recordDeposit).toHaveBeenCalledTimes(1);
  });

  it('treats a resumed DEPOSIT_PENDING execution as still needing its deposit', async () => {
    // DEPOSIT_PENDING = signed, deposit NOT yet observed (the /submit
    // response names it SIGNED_PENDING_DEPOSIT). Resuming one must re-surface
    // the deposit leg — skipping it settles into a poll that can never
    // advance, because nothing was ever sent.
    const signed = (status: ExecutionStatus): Execution => ({
      ...execution(status),
      details: { ...execution().details, messageSigned: true },
    });

    const statuses: ExecutionStatus[] = ['DEPOSIT_PENDING', 'SUCCESS'];
    const api = makeApi({
      listExecutions: vi.fn(async (_w: string, query?: { id?: string }) => {
        if (!query?.id) {
          return [];
        }

        const status = statuses.length > 1 ? statuses.shift() : statuses[0];

        return [signed(status as ExecutionStatus)];
      }),
    });

    const wallet = makeWallet();
    const { events, onEvent } = collect();

    // A fresh runner — the cross-session case (page reload lost the plan).
    const result = await createExecutionRunner({
      api,
      wallet,
      logger: noopLogger,
      pollIntervalMs: 0,
      onEvent,
    }).resume('exec-1');

    expect(result.status).toBe('SUCCESS');
    // Already signed — never re-signed or re-submitted.
    expect(api.submitSignature).not.toHaveBeenCalled();
    // No plan, so no transfer — but the address MUST be surfaced so the user
    // can fund it.
    expect(wallet.makeTransfer).not.toHaveBeenCalled();
    expect(events.some((e) => e.type === 'deposit-address')).toBe(true);
  });

  it('normalises a plain-object wallet rejection into a readable error', async () => {
    const wallet = makeWallet();

    wallet.getProviders = () => ({
      evm: {
        request: async ({ method }: { method: string }) => {
          if (method === 'personal_sign') {
            // EIP-1193 providers reject with plain objects, not Errors —
            // String() on one of these renders "[object Object]".
            // eslint-disable-next-line no-throw-literal
            throw { code: 4001, message: 'User rejected the request.' };
          }

          return [ADDRESS];
        },
      },
    });

    const runner = createExecutionRunner({
      api: makeApi(),
      wallet,
      logger: noopLogger,
      pollIntervalMs: 0,
    });

    const error: unknown = await runner.run(basePlan).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('User rejected the request.');
    expect((error as Error).message).toContain('4001');
    expect((error as Error).message).not.toContain('[object Object]');
  });

  it('flags isCancelling only while the delete signature is prompted', async () => {
    const seen: boolean[] = [];
    // Read lazily: the observation happens inside the prompt, which only runs
    // once the runner below exists.
    let readIsCancelling = () => false;
    const wallet = makeWallet();
    const baseProviders = wallet.getProviders();

    wallet.getProviders = () => ({
      evm: {
        request: async (args: { method: string }) => {
          if (args.method === 'personal_sign') {
            // Observed from INSIDE the prompt — this is the moment a UI has
            // to label the wallet dialog.
            seen.push(readIsCancelling());
          }

          return (
            baseProviders.evm as { request: (a: unknown) => Promise<unknown> }
          ).request(args);
        },
      },
    });

    const runner = createExecutionRunner({
      api: makeApi(),
      wallet,
      logger: noopLogger,
      pollIntervalMs: 0,
    });

    readIsCancelling = () => runner.getStore().context.isCancelling;

    expect(runner.getStore().context.isCancelling).toBe(false);

    await runner.cancel('exec-42');

    expect(seen).toEqual([true]);
    expect(runner.getStore().context.isCancelling).toBe(false);
  });

  it('clears isCancelling when the delete signature is rejected', async () => {
    const wallet = makeWallet();

    wallet.getProviders = () => ({
      evm: {
        request: async ({ method }: { method: string }) => {
          if (method === 'personal_sign') {
            throw Object.assign(new Error('User rejected the request.'), {
              code: 4001,
            });
          }

          return [ADDRESS];
        },
      },
    });

    const runner = createExecutionRunner({
      api: makeApi(),
      wallet,
      logger: noopLogger,
      pollIntervalMs: 0,
    });

    await expect(runner.cancel('exec-42')).rejects.toThrow(/rejected/i);
    expect(runner.getStore().context.isCancelling).toBe(false);
  });

  it('auto-cancels the created execution when the signing prompt is rejected', async () => {
    // First personal_sign (the payload) is rejected; the second (the
    // delete_execution text) is approved.
    let signCalls = 0;
    const wallet = makeWallet();
    const baseProviders = wallet.getProviders();

    wallet.getProviders = () => ({
      evm: {
        request: async (args: { method: string }) => {
          if (args.method === 'personal_sign') {
            signCalls += 1;

            if (signCalls === 1) {
              throw Object.assign(new Error('User rejected the request.'), {
                code: 4001,
              });
            }
          }

          return (
            baseProviders.evm as { request: (a: unknown) => Promise<unknown> }
          ).request(args);
        },
      },
    });

    const api = makeApi();
    const runner = createExecutionRunner({
      api,
      wallet,
      logger: noopLogger,
      pollIntervalMs: 0,
    });

    await expect(runner.run(basePlan)).rejects.toThrow(/rejected/i);

    // The execution was released, so nothing holds the in-flight lock…
    expect(api.deleteExecution).toHaveBeenCalledWith(
      ADDRESS,
      'exec-1',
      expect.objectContaining({ signature: expect.any(String) }),
    );
    expect(runner.getPhase()).toBe('cancelled');
    // The auto-cancel leaves no stale server status behind either.
    expect(runner.getStore().context.status).toBeUndefined();

    // …and a fresh run goes straight through, no resume-or-cancel decision.
    const result = await runner.run(basePlan);

    expect(result.status).toBe('SUCCESS');
    expect(api.createExecution).toHaveBeenCalledTimes(2);
  });

  it('falls back to the normal recovery when the delete prompt is rejected too', async () => {
    const wallet = makeWallet();

    wallet.getProviders = () => ({
      evm: {
        request: async (args: { method: string }) => {
          if (args.method === 'personal_sign') {
            throw Object.assign(new Error('User rejected the request.'), {
              code: 4001,
            });
          }

          return [ADDRESS];
        },
      },
    });

    const api = makeApi();
    const runner = createExecutionRunner({
      api,
      wallet,
      logger: noopLogger,
      pollIntervalMs: 0,
    });

    await expect(runner.run(basePlan)).rejects.toThrow(/rejected/i);

    // The delete never reached the API, the execution still holds the lock,
    // and the recorded error is the ORIGINAL rejection.
    expect(api.deleteExecution).not.toHaveBeenCalled();
    expect(runner.getPhase()).toBe('failed');
    expect(runner.getStore().context.error?.message).toMatch(/rejected/i);
  });

  it('honours autoCancelOnSignatureRejection: false', async () => {
    let signCalls = 0;
    const wallet = makeWallet();

    wallet.getProviders = () => ({
      evm: {
        request: async (args: { method: string }) => {
          if (args.method === 'personal_sign') {
            signCalls += 1;

            throw Object.assign(new Error('User rejected the request.'), {
              code: 4001,
            });
          }

          return [ADDRESS];
        },
      },
    });

    const api = makeApi();
    const runner = createExecutionRunner({
      api,
      wallet,
      logger: noopLogger,
      pollIntervalMs: 0,
      autoCancelOnSignatureRejection: false,
    });

    await expect(runner.run(basePlan)).rejects.toThrow(/rejected/i);

    expect(api.deleteExecution).not.toHaveBeenCalled();
    // No delete prompt was offered either.
    expect(signCalls).toBe(1);
  });

  it('retryDeposit() clears the superseded failure before re-prompting', async () => {
    const wallet = makeWallet();

    vi.mocked(wallet.makeTransfer!)
      .mockRejectedValueOnce(new Error('User rejected the request.'))
      .mockResolvedValueOnce({ hash: '0xdeposit' });

    const runner = createExecutionRunner({
      api: makeApi(),
      wallet,
      logger: noopLogger,
      pollIntervalMs: 0,
    });

    await expect(runner.run(basePlan)).rejects.toThrow(/not completed/);
    expect(runner.getStore().context.error).toBeDefined();

    // Nothing on the success path writes `error`, so it staying undefined
    // proves the retry cleared it rather than carrying the old failure.
    const result = await runner.retryDeposit();

    expect(result.status).toBe('SUCCESS');
    expect(runner.getStore().context.error).toBeUndefined();
  });

  it('cancel() after a failed transfer clears the recorded error', async () => {
    const wallet = makeWallet();

    vi.mocked(wallet.makeTransfer!).mockRejectedValue(
      new Error('User rejected the request.'),
    );

    const api = makeApi();
    const runner = createExecutionRunner({
      api,
      wallet,
      logger: noopLogger,
      pollIntervalMs: 0,
    });

    // The transfer failure is a retryable pause: error recorded, phase held.
    await expect(runner.run(basePlan)).rejects.toThrow(/not completed/);
    expect(runner.getPhase()).toBe('awaiting-deposit');
    expect(runner.getStore().context.error).toBeDefined();

    // Cancelling the execution must not leave its failure behind — a UI keys
    // retry/resume controls off context.error.
    await runner.cancel('exec-1');

    expect(runner.getPhase()).toBe('cancelled');
    expect(runner.getStore().context.error).toBeUndefined();

    // Nothing describing the deleted execution survives it — a cancelled
    // execution reporting `status: CREATED` would simply be false.
    const { context } = runner.getStore();

    expect(context.status).toBeUndefined();
    expect(context.execution).toBeUndefined();
    expect(context.networkFee).toBeUndefined();
    expect(context.depositAddress).toBeUndefined();
    expect(context.hasSubmittedSignature).toBe(false);
    // …but the id of what was cancelled remains, for the UI to name it.
    expect(context.executionId).toBe('exec-1');
  });

  it('cancel() of the blocking execution resets a failed runner to idle', async () => {
    let blocked = true;
    const api = makeApi({
      listExecutions: vi.fn(async (_w: string, query?: { id?: string }) => {
        if (query?.id) {
          return [execution('SUCCESS')];
        }

        return blocked ? [execution('CREATED')] : [];
      }),
    });

    const { events, onEvent } = collect();
    const runner = createExecutionRunner({
      api,
      wallet: makeWallet(),
      logger: noopLogger,
      pollIntervalMs: 0,
      onEvent,
    });

    await expect(runner.run(basePlan)).rejects.toMatchObject({
      code: 'EXECUTION_IN_FLIGHT',
    });
    expect(runner.getPhase()).toBe('failed');

    // `failed` is terminal, so cancel() cannot move to `cancelled` — it must
    // reset instead of leaving the guard error (and the UI's recovery
    // controls) standing after the delete succeeded.
    await runner.cancel('exec-1');

    expect(api.deleteExecution).toHaveBeenCalledTimes(1);
    expect(runner.getPhase()).toBe('idle');
    expect(runner.getStore().context.error).toBeUndefined();
    expect(phasesOf(events).at(-1)).toBe('idle');

    // And the runner is genuinely reusable: a fresh run goes through.
    blocked = false;

    const result = await runner.run(basePlan);

    expect(result.status).toBe('SUCCESS');
  });

  it('resume() of a different execution never replays a stale plan transfer', async () => {
    const signedOther = (status: ExecutionStatus): Execution => ({
      ...execution(status),
      id: 'exec-2',
      details: {
        ...execution().details,
        payload: undefined,
        messageSigned: true,
      },
    });

    const otherStatuses: ExecutionStatus[] = ['CREATED', 'SUCCESS'];
    const api = makeApi({
      listExecutions: vi.fn(async (_w: string, query?: { id?: string }) => {
        if (query?.id === 'exec-2') {
          const status =
            otherStatuses.length > 1 ? otherStatuses.shift() : otherStatuses[0];

          return [signedOther(status as ExecutionStatus)];
        }

        return query?.id ? [execution('SUCCESS')] : [];
      }),
    });

    const wallet = makeWallet();
    const { events, onEvent } = collect();
    const runner = createExecutionRunner({
      api,
      wallet,
      logger: noopLogger,
      pollIntervalMs: 0,
      onEvent,
    });

    // A full run leaves the runner holding exec-1's plan.
    await runner.run(basePlan);

    expect(wallet.makeTransfer).toHaveBeenCalledTimes(1);

    // Resuming a DIFFERENT execution must fall back to the cross-session
    // path — surface the address, never spend exec-1's plan on exec-2.
    const result = await runner.resume('exec-2');

    expect(result.status).toBe('SUCCESS');
    expect(wallet.makeTransfer).toHaveBeenCalledTimes(1);
    expect(events.some((e) => e.type === 'deposit-address')).toBe(true);
  });
});

describe('createExecutionRunner — resume and cancel', () => {
  it('reattaches to an execution and polls it to completion', async () => {
    const runner = createExecutionRunner({
      api: makeApi({ statusSequence: ['OPERATION_PROCESSING', 'SUCCESS'] }),
      wallet: makeWallet(),
      logger: noopLogger,
      pollIntervalMs: 0,
    });

    const result = await runner.resume('exec-1');

    expect(result.status).toBe('SUCCESS');
    expect(runner.getPhase()).toBe('success');
  });

  it('surfaces the deposit address for a signed but unfunded execution', async () => {
    // The signature landed but no deposit arrived, so the status is still
    // CREATED. Resume has to re-expose the deposit address, not just poll.
    const unfunded = execution('CREATED');

    unfunded.details = { ...unfunded.details, messageSigned: true };

    const { events, onEvent } = collect();
    const queue = [unfunded, execution('SUCCESS')];

    const runner = createExecutionRunner({
      api: makeApi({
        listExecutions: vi.fn(async () => [
          queue.shift() ?? execution('SUCCESS'),
        ]),
      }),
      wallet: makeWallet(),
      logger: noopLogger,
      pollIntervalMs: 0,
      onEvent,
    });

    await runner.resume('exec-1');

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'deposit-address',
        address: 'deposit-address',
      }),
    );
    expect(phasesOf(events)).toContain('awaiting-deposit');
  });

  it('does not treat a signed CREATED execution as unsigned', async () => {
    const unfunded = execution('CREATED');

    unfunded.details = { ...unfunded.details, messageSigned: true };

    const api = makeApi({
      listExecutions: vi.fn(async () => [unfunded]),
      submitSignature: vi.fn(),
    });

    const runner = createExecutionRunner({
      api,
      wallet: makeWallet(),
      logger: noopLogger,
      pollIntervalMs: 0,
      maxPollAttempts: 1,
    });

    await expect(runner.resume('exec-1')).rejects.toThrow(/timed out/);
    // It must not re-sign something already signed.
    expect(api.submitSignature).not.toHaveBeenCalled();
  });

  it('records and announces a resume failure', async () => {
    const { events, onEvent } = collect();

    const runner = createExecutionRunner({
      api: makeApi({ listExecutions: vi.fn().mockResolvedValue([]) }),
      wallet: makeWallet(),
      logger: noopLogger,
      pollIntervalMs: 0,
      onEvent,
    });

    await expect(runner.resume('missing')).rejects.toThrow(
      /no execution found/,
    );

    // Previously this rejected silently: no error in the store, no event, and the
    // phase stuck at idle.
    expect(events).toContainEqual(expect.objectContaining({ type: 'error' }));
    expect(runner.getPhase()).toBe('failed');
  });

  it('stops polling and reports cancellation when cancelled mid-settle', async () => {
    const api = makeApi({ statusSequence: ['DEPOSIT_PENDING'] });

    const runner = createExecutionRunner({
      api,
      wallet: makeWallet(),
      logger: noopLogger,
      pollIntervalMs: 0,
      maxPollAttempts: 10_000,
    });

    const running = runner.run(basePlan);

    // Cancel once the loop is under way.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    await runner.cancel('exec-1');

    // Previously: the transition was refused, the loop ran to exhaustion and
    // reported a bogus timeout.
    await expect(running).rejects.toThrow(/was cancelled/);
    expect(runner.getPhase()).toBe('cancelled');
    expect(api.deleteExecution).toHaveBeenCalled();
  });

  it('signs delete_execution:{id} and clears the lock', async () => {
    const api = makeApi();
    const runner = createExecutionRunner({
      api,
      wallet: makeWallet(),
      logger: noopLogger,
      pollIntervalMs: 0,
    });

    await runner.cancel('exec-42');

    expect(api.deleteExecution).toHaveBeenCalledWith(
      ADDRESS,
      'exec-42',
      expect.objectContaining({
        signature: expect.stringContaining('secp256k1:'),
      }),
    );
  });
});
