import { afterEach, describe, expect, it, vi } from 'vitest';

import type { IntentsConnectApi } from '@/api/types';
import { GuardError, IntentsApiError } from '@/errors';
import {
  createFundingStore,
  type FundingEvent,
  type FundingRecord,
  type FundingRequest,
  fundIntermediaryFromIntents,
  type FundIntermediaryOptions,
  quoteFunding,
  resumeFunding,
  signAndSubmitFunding,
} from '@/funding';
import type {
  GenerateIntentRequest,
  GenerateIntentResult,
  IntentsApi,
  SubmitIntentRequest,
  SubmitIntentResult,
  SwapQuoteRequest,
  SwapQuoteResponse,
  SwapStatus,
  SwapStatusResult,
  UserTokenOptions,
} from '@/intentsApi/types';
import { memoryStorage } from '@/storage';
import type { Execution } from '@/types/execution';

const NOW = Date.UTC(2026, 10, 2, 12, 0, 0);
const WALLET = '0xCA67c1bb3fD69857E5EdAF6aA1C65371bF46A464';
const SIGNER = WALLET.toLowerCase();
const INTERMEDIARY = '0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E';
const DEPOSIT = 'a'.repeat(64);
const TOKEN =
  'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near';

const MONAD_USDC = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603';

const request = (overrides: Partial<FundingRequest> = {}): FundingRequest => ({
  source: 'intents',
  originAsset: TOKEN,
  amount: '1000000',
  destination: {
    chain: 'monad',
    assetId: 'nep245:monad-usdc',
    tokenAddress: MONAD_USDC,
  },
  context: { onBehalfOf: WALLET },
  ...overrides,
});

const transferJson = () =>
  JSON.stringify({
    signer_id: SIGNER,
    verifying_contract: 'intents.near',
    deadline: new Date(NOW + 60_000).toISOString(),
    nonce: 'n',
    intents: [
      {
        intent: 'transfer',
        receiver_id: DEPOSIT,
        tokens: { [TOKEN]: '1000000' },
      },
    ],
  });

/** Monad RPC: answers every `eth_call` with the next balance (the last repeats). */
const stubBalances = (...balances: bigint[]) => {
  const queue = [...balances];
  const fetchImpl = vi.fn(async (_url: string, init?: { body?: string }) => {
    const calls = JSON.parse(init!.body!) as { id: number }[];
    const value = queue.length > 1 ? queue.shift()! : queue[0]!;

    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify(
          calls.map(({ id }) => ({
            jsonrpc: '2.0',
            id,
            result: `0x${value.toString(16)}`,
          })),
        ),
    };
  });

  vi.stubGlobal('fetch', fetchImpl);

  return fetchImpl;
};

type Setup = {
  statuses?: SwapStatus[];
  inFlight?: Execution[];
  signature?: () => Promise<string>;
};

const setup = ({
  statuses = ['PENDING_DEPOSIT', 'PROCESSING', 'SUCCESS'],
  inFlight = [],
  signature = async () => `0x${'11'.repeat(64)}1c`,
}: Setup = {}) => {
  const statusQueue = [...statuses];
  const events: FundingEvent[] = [];
  const store = createFundingStore({
    storage: memoryStorage(),
    now: () => NOW,
  });

  const intentsApi = {
    getQuote: vi.fn(
      async (
        body: SwapQuoteRequest,
        _options?: UserTokenOptions,
      ): Promise<SwapQuoteResponse> => ({
        correlationId: 'corr-1',
        timestamp: '',
        signature: '',
        quoteRequest: body,
        quote: {
          depositAddress: DEPOSIT,
          amountIn: body.amount,
          minAmountIn: body.amount,
          amountOut: '990000',
          minAmountOut: '980000',
          timeEstimate: 30,
          deadline: new Date(NOW + 15 * 60_000).toISOString(),
          timeWhenInactive: new Date(NOW + 15 * 60_000).toISOString(),
        },
      }),
    ),
    generateIntent: vi.fn(
      async (
        _body: GenerateIntentRequest,
        _options?: UserTokenOptions,
      ): Promise<GenerateIntentResult> => ({
        intent: { standard: 'erc191', payload: transferJson() },
        correlationId: 'corr-2',
      }),
    ),
    submitIntent: vi.fn(
      async (
        _body: SubmitIntentRequest,
        _options?: UserTokenOptions,
      ): Promise<SubmitIntentResult> => ({
        intentHash: 'intent-hash',
        correlationId: 'corr-3',
      }),
    ),
    getSwapStatus: vi.fn(
      async (
        _query: { depositAddress: string; depositMemo?: string },
        _options?: UserTokenOptions,
      ): Promise<SwapStatusResult> => {
        const status =
          statusQueue.length > 1 ? statusQueue.shift()! : statusQueue[0]!;

        return {
          status,
          swapDetails: {
            intentHashes: [],
            nearTxHashes: [],
            amountOut: '985000',
            refundedAmount: status === 'REFUNDED' ? '1000000' : undefined,
          },
        };
      },
    ),
  } satisfies Pick<
    IntentsApi,
    'getQuote' | 'generateIntent' | 'submitIntent' | 'getSwapStatus'
  >;

  const connectApi = {
    listExecutions: vi.fn(async () => inFlight),
    getIntermediary: vi.fn(async () => ({
      originAccount: WALLET,
      originType: 'evm' as const,
      evm: INTERMEDIARY,
      solana: null,
    })),
  } satisfies Pick<IntentsConnectApi, 'listExecutions' | 'getIntermediary'>;

  const request_ = vi.fn(async ({ method }: { method: string }) =>
    method === 'eth_requestAccounts' ? [WALLET] : signature(),
  );

  const options: FundIntermediaryOptions = {
    intentsApi,
    connectApi,
    wallet: {
      signingStandard: 'erc191',
      getAddress: () => WALLET,
      getProviders: () => ({ evm: { request: request_ } }),
    },
    store,
    rpcs: { monad: ['https://monad.test'] },
    pollIntervalMs: 0,
    onEvent: (event) => events.push(event),
    now: () => NOW,
  };

  return {
    options,
    intentsApi,
    connectApi,
    store,
    events,
    walletRequest: request_,
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fundIntermediaryFromIntents', () => {
  it('quotes, signs once, watches 1Click and waits for the funds', async () => {
    stubBalances(5n, 5n, 985_005n);

    const h = setup();
    const record = await fundIntermediaryFromIntents(request(), h.options);

    expect(record).toMatchObject({
      stage: 'arrived',
      depositAddress: DEPOSIT,
      recipient: INTERMEDIARY,
      intentHash: 'intent-hash',
      amountOut: '985000',
      baselineBalance: '5',
      arrivedBalance: '985005',
      context: { onBehalfOf: WALLET },
    });
    expect(h.intentsApi.getQuote.mock.calls[0]![0]).toMatchObject({
      dry: false,
      swapType: 'EXACT_INPUT',
      depositType: 'INTENTS',
      refundType: 'INTENTS',
      refundTo: SIGNER,
      recipient: INTERMEDIARY,
      recipientType: 'DESTINATION_CHAIN',
      originAsset: TOKEN,
      destinationAsset: 'nep245:monad-usdc',
      amount: '1000000',
    });
    expect(h.intentsApi.getQuote.mock.calls[0]![0]).not.toHaveProperty(
      'confidentiality',
    );
    expect(h.intentsApi.generateIntent).toHaveBeenCalledWith(
      {
        type: 'swap_transfer',
        standard: 'erc191',
        signerId: SIGNER,
        depositAddress: DEPOSIT,
      },
      {},
    );
    expect(
      h.walletRequest.mock.calls.filter(([a]) => a.method === 'personal_sign'),
    ).toHaveLength(1);
    expect(
      h.events.flatMap((e) => (e.type === 'phase' ? [e.phase] : [])),
    ).toEqual([
      'resolving',
      'quoting',
      'awaiting-signature',
      'submitting',
      'bridging',
      'awaiting-arrival',
    ]);
  });

  it('persists `submitting` before it submits', async () => {
    stubBalances(0n, 990_000n);

    const h = setup();
    let stageAtSubmit: string | undefined;

    h.intentsApi.submitIntent.mockImplementation(async () => {
      stageAtSubmit = h.store.state.records[SIGNER]?.[0]?.stage;

      return { intentHash: 'h', correlationId: 'c' };
    });

    await fundIntermediaryFromIntents(request(), h.options);

    expect(stageAtSubmit).toBe('submitting');
  });

  it('refuses a quote that is not the one requested, before any prompt', async () => {
    stubBalances(0n);

    const h = setup();

    h.intentsApi.getQuote.mockImplementation(async (body) => ({
      correlationId: 'c',
      timestamp: '',
      signature: '',
      quoteRequest: { ...body, recipient: '0xattacker' },
      quote: {
        depositAddress: DEPOSIT,
        amountIn: body.amount,
        minAmountIn: body.amount,
        amountOut: '1',
        minAmountOut: '1',
        timeEstimate: 1,
      },
    }));

    await expect(
      fundIntermediaryFromIntents(request(), h.options),
    ).rejects.toMatchObject({ code: 'PAYLOAD_MISMATCH' });
    expect(h.intentsApi.generateIntent).not.toHaveBeenCalled();
    expect(h.store.state.records[SIGNER] ?? []).toEqual([]);
  });

  it('stops before the prompt when confirmQuote throws', async () => {
    stubBalances(0n);

    const h = setup();

    await expect(
      fundIntermediaryFromIntents(request(), {
        ...h.options,
        confirmQuote: () => {
          throw new Error('too small');
        },
      }),
    ).rejects.toThrow('too small');
    expect(h.intentsApi.generateIntent).not.toHaveBeenCalled();
  });

  it('keeps a declined transfer `quoted`, so it can be signed again', async () => {
    stubBalances(0n, 990_000n);

    let declined = true;
    const h = setup({
      signature: async () => {
        if (declined) {
          throw Object.assign(new Error('User rejected'), { code: 4001 });
        }

        return `0x${'11'.repeat(64)}1c`;
      },
    });

    await expect(
      fundIntermediaryFromIntents(request(), h.options),
    ).rejects.toMatchObject({ code: 'USER_REJECTED' });

    const [quoted] = h.store.state.records[SIGNER]!;

    expect(quoted!.stage).toBe('quoted');
    expect(h.intentsApi.submitIntent).not.toHaveBeenCalled();

    declined = false;

    await expect(
      signAndSubmitFunding(quoted!, h.options),
    ).resolves.toMatchObject({ stage: 'submitted' });
  });

  it('watches, rather than re-signing, when the submit outcome is unknown', async () => {
    stubBalances(0n, 990_000n);

    const h = setup();

    h.intentsApi.submitIntent.mockRejectedValueOnce(new TypeError('offline'));

    await expect(
      fundIntermediaryFromIntents(request(), h.options),
    ).resolves.toMatchObject({ stage: 'arrived' });
    expect(h.intentsApi.submitIntent).toHaveBeenCalledTimes(1);
  });

  it('goes back to `quoted` when 1Click refuses the transfer and saw nothing', async () => {
    stubBalances(0n);

    const h = setup({ statuses: ['PENDING_DEPOSIT'] });

    h.intentsApi.submitIntent.mockRejectedValueOnce(
      new IntentsApiError('Invalid signature', 400),
    );

    await expect(
      fundIntermediaryFromIntents(request(), h.options),
    ).rejects.toMatchObject({ code: 'SUBMIT_REJECTED' });
    expect(h.store.state.records[SIGNER]![0]!.stage).toBe('quoted');
  });

  it('reports a refund and records it', async () => {
    stubBalances(0n);

    const h = setup({ statuses: ['PROCESSING', 'REFUNDED'] });

    await expect(
      fundIntermediaryFromIntents(request(), h.options),
    ).rejects.toMatchObject({
      code: 'REFUNDED',
      meta: { refundedAmount: '1000000', depositAddress: DEPOSIT },
    });
    expect(h.store.state.records[SIGNER]![0]).toMatchObject({
      stage: 'refunded',
      refundedAmount: '1000000',
    });
  });

  it('records a failed swap', async () => {
    stubBalances(0n);

    const h = setup({ statuses: ['FAILED'] });

    await expect(
      fundIntermediaryFromIntents(request(), h.options),
    ).rejects.toMatchObject({ code: 'SWAP_FAILED' });
    expect(h.store.state.records[SIGNER]![0]!.stage).toBe('failed');
  });

  it('tolerates a deposit address 1Click does not know yet', async () => {
    stubBalances(0n, 990_000n);

    const h = setup();

    h.intentsApi.getSwapStatus.mockRejectedValueOnce(
      new IntentsApiError('Deposit address not found', 404),
    );

    await expect(
      fundIntermediaryFromIntents(request(), h.options),
    ).resolves.toMatchObject({ stage: 'arrived' });
  });

  it('refuses while an execution of the wallet is in flight', async () => {
    stubBalances(0n);

    const h = setup({ inFlight: [{ id: 'exec-1' } as Execution] });

    const error = await fundIntermediaryFromIntents(request(), h.options).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(GuardError);
    expect(error).toMatchObject({
      code: 'EXECUTION_IN_FLIGHT',
      meta: { executionId: 'exec-1' },
    });
    expect(h.intentsApi.getQuote).not.toHaveBeenCalled();
  });

  it('refuses a second funding while one is live', async () => {
    stubBalances(0n);

    const h = setup();

    await quoteFunding(request(), h.options);

    await expect(quoteFunding(request(), h.options)).rejects.toMatchObject({
      code: 'FUNDING_IN_FLIGHT',
    });
  });
});

describe('confidential funding', () => {
  it('needs an authorized session', async () => {
    const h = setup();

    await expect(
      quoteFunding(request({ source: 'confidential' }), h.options),
    ).rejects.toMatchObject({ code: 'NOT_AUTHORIZED' });
  });

  it('sends the session token on every intents call, on confidential rails', async () => {
    stubBalances(0n, 990_000n);

    const h = setup();
    const withAccessToken = <T>(call: (token: string) => Promise<T>) =>
      call('tok');

    await fundIntermediaryFromIntents(request({ source: 'confidential' }), {
      ...h.options,
      withAccessToken,
    });

    expect(h.intentsApi.getQuote.mock.calls[0]).toEqual([
      expect.objectContaining({
        depositType: 'CONFIDENTIAL_INTENTS',
        refundType: 'CONFIDENTIAL_INTENTS',
      }),
      { accessToken: 'tok' },
    ]);
    expect(h.intentsApi.generateIntent.mock.calls[0]![1]).toEqual({
      accessToken: 'tok',
    });
    expect(h.intentsApi.submitIntent.mock.calls[0]![1]).toEqual({
      accessToken: 'tok',
    });
    expect(h.intentsApi.getSwapStatus.mock.calls[0]![1]).toEqual({
      accessToken: 'tok',
    });
  });

  it('detects arrival without amounts when status is all 1Click reports', async () => {
    stubBalances(0n, 0n, 981_000n);

    const h = setup();

    h.intentsApi.getSwapStatus.mockResolvedValue({
      status: 'SUCCESS',
    } as never);

    await expect(
      fundIntermediaryFromIntents(request({ source: 'confidential' }), {
        ...h.options,
        withAccessToken: (call) => call('tok'),
      }),
    ).resolves.toMatchObject({ stage: 'arrived', arrivedBalance: '981000' });
  });
});

describe('resumeFunding', () => {
  const stored = (overrides: Partial<FundingRecord>): FundingRecord => ({
    v: 1,
    id: DEPOSIT,
    intentsAccountId: SIGNER,
    walletAddress: WALLET,
    source: 'intents',
    originAsset: TOKEN,
    amountIn: '1000000',
    destination: request().destination,
    recipient: INTERMEDIARY,
    depositAddress: DEPOSIT,
    quote: {
      amountOut: '990000',
      minAmountOut: '980000',
      timeEstimate: 30,
      timeWhenInactive: new Date(NOW + 10 * 60_000).toISOString(),
    },
    correlationId: 'c',
    baselineBalance: '0',
    stage: 'submitted',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  });

  it('watches a submitted funding to the end without prompting', async () => {
    stubBalances(990_000n);

    const h = setup({ statuses: ['SUCCESS'] });

    await expect(
      resumeFunding(stored({ stage: 'submitting' }), h.options),
    ).resolves.toMatchObject({ stage: 'arrived' });
    expect(h.walletRequest).not.toHaveBeenCalled();
    expect(h.intentsApi.generateIntent).not.toHaveBeenCalled();
    expect(h.intentsApi.submitIntent).not.toHaveBeenCalled();
  });

  it('leaves a live quote for the user to sign, and abandons an expired one', async () => {
    const h = setup();

    await expect(
      resumeFunding(stored({ stage: 'quoted' }), h.options),
    ).resolves.toMatchObject({ stage: 'quoted' });
    await expect(
      resumeFunding(stored({ stage: 'quoted' }), {
        ...h.options,
        now: () => NOW + 20 * 60_000,
      }),
    ).resolves.toMatchObject({ stage: 'abandoned' });
    expect(h.walletRequest).not.toHaveBeenCalled();
  });

  it('abandons a transfer that never reached 1Click after the deadline', async () => {
    const h = setup({ statuses: ['PENDING_DEPOSIT'] });

    await expect(
      resumeFunding(stored({ stage: 'submitted' }), {
        ...h.options,
        now: () => NOW + 30 * 60_000,
      }),
    ).rejects.toMatchObject({ code: 'QUOTE_EXPIRED' });
    expect(h.store.state.records[SIGNER]![0]!.stage).toBe('abandoned');
  });

  it('stops polling on abort and keeps the record resumable', async () => {
    const h = setup({ statuses: ['PROCESSING'] });
    const controller = new AbortController();

    const watching = resumeFunding(stored({ stage: 'submitted' }), {
      ...h.options,
      pollIntervalMs: 5,
      signal: controller.signal,
    });

    controller.abort(new Error('left the page'));

    await expect(watching).rejects.toThrow('left the page');
    expect(h.store.state.records[SIGNER]![0]!.stage).toBe('submitted');
  });
});
