import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { IntentsConnectApi } from '@/api/types';
import { FUNDING_STORAGE_KEY_PREFIX, type FundingRecord } from '@/funding';
import type { IntentsApi, SwapQuoteRequest } from '@/intentsApi/types';
import type { StepsPlan } from '@/runner/types';
import { type KeyValueStorage, memoryStorage } from '@/storage';
import type { Execution } from '@/types/execution';
import type { WalletConnector } from '@/types/wallet';
import {
  IntentsConnectProvider,
  type UseExecutionResult,
  useIntentsFundedFlow,
} from '@/react';

const ADDRESS = '0xCA67c1bb3fD69857E5EdAF6aA1C65371bF46A464';
const ACCOUNT = ADDRESS.toLowerCase();
const INTERMEDIARY = '0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E';
const DEPOSIT = 'b'.repeat(64);
const TOKEN = 'nep141:base-usdc.omft.near';
const DESTINATION = {
  chain: 'monad',
  assetId: 'nep245:monad-usdc',
  tokenAddress: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
};

const transferJson = () =>
  JSON.stringify({
    signer_id: ACCOUNT,
    deadline: '2099-01-01T00:00:00.000Z',
    intents: [
      {
        intent: 'transfer',
        receiver_id: DEPOSIT,
        tokens: { [TOKEN]: '1000000' },
      },
    ],
  });

/** Monad RPC: `first` on the first read (the baseline), `later` afterwards. */
const stubBalances = (later = 987_100n, first = 0n) => {
  let reads = 0;

  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body: string }) => {
      const calls = JSON.parse(init.body) as { id: number }[];
      const value = reads === 0 ? first : later;

      reads += 1;

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
    }),
  );
};

const intentsApi = (): IntentsApi => ({
  apiKey: 'key',
  baseUrl: 'https://intents.test',
  nearRpcUrl: 'https://intents.test/rpc/key',
  getTokens: vi.fn(),
  getIntentsAccountBalances: vi.fn(),
  authenticate: vi.fn(),
  refreshAccessToken: vi.fn(),
  getConfidentialBalances: vi.fn(),
  getQuote: vi.fn(async (body: SwapQuoteRequest) => ({
    correlationId: 'c',
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
      timeWhenInactive: '2099-01-01T00:00:00.000Z',
    },
  })),
  generateIntent: vi.fn(async () => ({
    intent: { standard: 'erc191' as const, payload: transferJson() },
    correlationId: 'c',
  })),
  submitIntent: vi.fn(async () => ({ intentHash: 'h', correlationId: 'c' })),
  getSwapStatus: vi.fn(async () => ({
    status: 'SUCCESS' as const,
    swapDetails: { intentHashes: [], nearTxHashes: [], amountOut: '987100' },
  })),
});

const connectApi = (): IntentsConnectApi => ({
  getIntermediary: vi.fn(async () => ({
    originAccount: ADDRESS,
    originType: 'evm' as const,
    evm: INTERMEDIARY,
    solana: null,
  })),
  createExecution: vi.fn(),
  createStepsExecution: vi.fn(),
  listSupportedTokens: vi.fn(),
  submitSignature: vi.fn(),
  recordDeposit: vi.fn(),
  listExecutions: vi.fn().mockResolvedValue([]),
  deleteExecution: vi.fn(),
});

const signer = vi.fn(async ({ method }: { method: string }) =>
  method === 'eth_requestAccounts' ? [ADDRESS] : `0x${'11'.repeat(64)}1c`,
);

const wallet: WalletConnector = {
  id: 'evm',
  name: 'Test',
  chains: ['base'],
  signingStandard: 'erc191',
  connect: vi.fn(),
  disconnect: vi.fn(),
  getAddress: () => ADDRESS,
  getProviders: () => ({ evm: { request: signer } }),
};

const fakeExec = (
  runSteps: UseExecutionResult['runSteps'] = vi.fn(
    async () => ({ id: 'steps-1', status: 'SUCCESS' }) as Execution,
  ),
): UseExecutionResult =>
  ({
    phase: 'idle',
    isBusy: false,
    isCancelling: false,
    hasSubmittedSignature: false,
    runSteps,
    resume: vi.fn(),
  }) as unknown as UseExecutionResult;

const setup = ({
  exec = fakeExec(),
  storage = memoryStorage(),
}: { exec?: UseExecutionResult; storage?: KeyValueStorage } = {}) => {
  const api = intentsApi();
  const buildStepsPlan = vi.fn(
    ({
      amount,
      context,
    }: {
      amount: string;
      context?: Record<string, unknown>;
    }) =>
      ({
        recipe: { id: 'r', intent: 'aave', flow: 'steps-only' },
        params: context,
        amount,
      }) as unknown as StepsPlan<unknown>,
  );

  const wrapper = ({ children }: { children: ReactNode }) => (
    <StrictMode>
      <IntentsConnectProvider
        api={connectApi()}
        wallet={wallet}
        intentsApi={api}
        fundingStorage={storage}>
        {children}
      </IntentsConnectProvider>
    </StrictMode>
  );

  const hook = renderHook(
    () =>
      useIntentsFundedFlow<{ amount: string }, unknown>({
        exec,
        buildFunding: ({ amount }) => ({
          source: 'intents',
          originAsset: TOKEN,
          amount,
          destination: DESTINATION,
          context: { onBehalfOf: ADDRESS },
        }),
        buildStepsPlan,
      }),
    { wrapper },
  );

  return { ...hook, api, exec, buildStepsPlan, storage };
};

afterEach(() => {
  vi.unstubAllGlobals();
  signer.mockClear();
});

describe('useIntentsFundedFlow', () => {
  it('moves the funds, then spends what arrived at the intermediary', async () => {
    stubBalances();

    const h = setup();

    expect(h.result.current.stage).toBe('idle');

    await act(() => h.result.current.submit({ amount: '1000000' }));

    await waitFor(() => expect(h.result.current.stage).toBe('success'));

    expect(h.buildStepsPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: '987100',
        context: { onBehalfOf: ADDRESS },
      }),
    );
    expect(h.exec.runSteps).toHaveBeenCalledTimes(1);
    expect(h.result.current.record).toMatchObject({
      stage: 'done',
      stepsExecutionId: 'steps-1',
    });
    expect(h.result.current.error).toBeUndefined();
  });

  it('keeps the funds waiting when the spend is declined, and supplies them later', async () => {
    stubBalances();

    const runSteps = vi
      .fn()
      .mockRejectedValueOnce(new Error('User rejected the signature'))
      .mockResolvedValueOnce({ id: 'steps-2', status: 'SUCCESS' });

    const h = setup({ exec: fakeExec(runSteps) });

    await act(() => h.result.current.submit({ amount: '1000000' }));

    await waitFor(() => expect(h.result.current.stage).toBe('ready-to-supply'));

    expect(h.result.current.error?.message).toMatch(/rejected/);

    await act(() => h.result.current.supply());

    await waitFor(() => expect(h.result.current.stage).toBe('success'));

    expect(runSteps).toHaveBeenCalledTimes(2);
  });

  it('resumes a submitted funding after a reload, without prompting', async () => {
    // The transfer was submitted before the reload: the funds already landed.
    stubBalances(987_100n, 987_100n);

    const storage = memoryStorage();
    const stored: FundingRecord = {
      v: 1,
      id: DEPOSIT,
      intentsAccountId: ACCOUNT,
      walletAddress: ADDRESS,
      source: 'intents',
      originAsset: TOKEN,
      amountIn: '1000000',
      destination: DESTINATION,
      recipient: INTERMEDIARY,
      depositAddress: DEPOSIT,
      quote: {
        amountOut: '990000',
        minAmountOut: '980000',
        timeEstimate: 30,
        timeWhenInactive: '2099-01-01T00:00:00.000Z',
      },
      correlationId: 'c',
      baselineBalance: '0',
      stage: 'submitted',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storage.set(
      `${FUNDING_STORAGE_KEY_PREFIX}${ACCOUNT}`,
      JSON.stringify([stored]),
    );

    const h = setup({ storage });

    await waitFor(() => expect(h.result.current.stage).toBe('ready-to-supply'));

    expect(signer).not.toHaveBeenCalled();
    expect(h.api.generateIntent).not.toHaveBeenCalled();
    expect(h.exec.runSteps).not.toHaveBeenCalled();
  });

  it('supplies funds stranded without a funding record', async () => {
    const h = setup();

    await act(() =>
      h.result.current.supply({
        amount: '5000000',
        context: { onBehalfOf: ADDRESS },
      }),
    );

    expect(h.buildStepsPlan).toHaveBeenCalledWith(
      expect.objectContaining({ amount: '5000000' }),
    );
    expect(h.result.current.stage).toBe('success');
  });
});
