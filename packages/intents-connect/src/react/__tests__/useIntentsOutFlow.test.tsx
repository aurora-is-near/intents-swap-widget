import { base64 } from '@scure/base';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { IntentsConnectApi } from '@/api/types';
import { noopLogger } from '@/logger';
import type { OutOperationPlan } from '@/runner/types';
import type { Execution } from '@/types/execution';
import type { Recipe } from '@/types/recipe';
import type { WalletConnector } from '@/types/wallet';
import { IntentsConnectProvider, useIntentsOutFlow } from '@/react';

const ADDRESS = '0xD84368a36ff4F6285F4121ED75E8c1f237E51506';
const INTERMEDIARY = '0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E';
const POOL = '0x69a5F9AD4f96ebf0a0C792dD42a01cC5C0102fef';
const USDC = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603';
const BASE_USDC = 'nep141:base-usdc.omft.near';

const gate = () => {
  let open: () => void = () => undefined;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });

  return { opened, open };
};

type Gate = ReturnType<typeof gate>;

const wallet = (signing: Gate): WalletConnector => ({
  id: 'test-evm',
  name: 'Test EVM',
  chains: ['base'],
  signingStandard: 'erc191',
  connect: vi.fn(),
  disconnect: vi.fn(),
  getAddress: () => ADDRESS,
  getProviders: () => ({
    evm: {
      request: vi.fn(async ({ method }: { method: string }) => {
        if (method === 'eth_requestAccounts') {
          return [ADDRESS];
        }

        await signing.opened;

        return `0x${'ab'.repeat(64)}1b`;
      }),
    },
  }),
  makeTransfer: vi.fn(),
});

const withdraw: Recipe = {
  id: 'withdraw',
  intent: 'aave_withdraw',
  title: 'Withdraw from Aave',
  flow: 'out-operation',
  type: 'evm',
  destination: {
    chain: 'monad',
    assetId: 'nep245:monad-usdc',
    tokenAddress: USDC,
  },
  buildSteps: ({ amount, intermediary }) => [
    {
      to: POOL,
      functionSignature: 'withdraw(address,uint256,address)',
      parameters: [USDC, amount, intermediary],
      value: '0',
    },
  ],
};

const connectApi = (submitting: Gate): IntentsConnectApi => {
  let created: Execution | undefined;

  return {
    getIntermediary: vi.fn().mockResolvedValue({
      originAccount: ADDRESS,
      originType: 'evm',
      evm: INTERMEDIARY,
      solana: null,
    }),
    createExecution: vi.fn<IntentsConnectApi['createExecution']>(
      async (_address, body) => {
        const execution: Execution = {
          id: 'out-1',
          status: body.dry ? 'OPERATION_PENDING' : 'CREATED',
          type: 'evm',
          quote: {
            amount: body.quote.amount,
            amountIn: (BigInt(body.quote.amount) - 2000n).toString(),
            amountOut: '4990000',
            minAmountOut: '4940000',
            depositAddress: 'deposit',
            depositMemo: null,
            recipient: body.quote.recipient,
          },
          steps: body.steps,
          metadata: body.metadata,
          details: {
            intermediaryAddress: INTERMEDIARY,
            networkFee: '2000',
            signingStandard: 'erc191',
            payload: {
              standard: 'erc191',
              payload_json: '{"intents":[]}',
              payload_bytes_base64: base64.encode(
                new TextEncoder().encode('{}'),
              ),
            },
          },
        };

        if (!body.dry) {
          created = execution;
        }

        return execution;
      },
    ),
    createStepsExecution: vi.fn(),
    listSupportedTokens: vi.fn(),
    submitSignature: vi.fn(async () => {
      await submitting.opened;

      return { status: 'SIGNING' as const };
    }),
    recordDeposit: vi.fn(),
    listExecutions: vi.fn<IntentsConnectApi['listExecutions']>(
      async (_address, query) =>
        query?.id && created ? [{ ...created, status: 'SUCCESS' }] : [],
    ),
    deleteExecution: vi.fn().mockResolvedValue(undefined),
  };
};

const setup = () => {
  const signing = gate();
  const submitting = gate();
  const api = connectApi(submitting);
  const connector = wallet(signing);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <StrictMode>
      <IntentsConnectProvider
        api={api}
        wallet={connector}
        logger={noopLogger}
        pollIntervalMs={0}>
        {children}
      </IntentsConnectProvider>
    </StrictMode>
  );

  return { wrapper, signing, submitting };
};

const plan = (amount: string): OutOperationPlan => ({
  recipe: withdraw,
  params: undefined,
  amount,
  quote: { destinationAsset: BASE_USDC, recipient: ADDRESS },
});

describe('useIntentsOutFlow', () => {
  it('walks the stages to a settled payout, with its figures', async () => {
    const { wrapper, signing, submitting } = setup();
    const { result } = renderHook(
      () => useIntentsOutFlow<string, void>({ buildPlan: plan }),
      { wrapper },
    );

    expect(result.current.stage).toBe('idle');

    let done: Promise<Execution | undefined> = Promise.resolve(undefined);

    act(() => {
      done = result.current.submit('5000000');
    });

    await waitFor(() => expect(result.current.stage).toBe('signing'));

    expect(result.current).toMatchObject({
      networkFee: '2000',
      // Fee plus the default 50% reserve held back.
      payout: '4997000',
      quote: { amountOut: '4990000', minAmountOut: '4940000' },
      isBusy: true,
    });

    signing.open();
    await waitFor(() => expect(result.current.stage).toBe('paying-out'));

    let settled: Execution | undefined;

    await act(async () => {
      submitting.open();
      settled = await done;
    });

    expect(settled?.status).toBe('SUCCESS');
    expect(result.current).toMatchObject({
      stage: 'success',
      isBusy: false,
      canCancel: false,
    });
    expect(result.current.error).toBeUndefined();
  });

  it('reports a plan that could not be built, and ignores double submits', async () => {
    let release: () => void = () => undefined;
    const buildPlan = vi.fn(
      () =>
        new Promise<never>((_, reject) => {
          release = () => reject(new Error('no position'));
        }),
    );

    const { result } = renderHook(
      () => useIntentsOutFlow<string>({ buildPlan }),
      { wrapper: setup().wrapper },
    );

    let first: Promise<Execution | undefined> = Promise.resolve(undefined);

    act(() => {
      first = result.current.submit('1');
      void result.current.submit('1');
    });

    expect(result.current.stage).toBe('preparing');
    expect(result.current.isBusy).toBe(true);
    expect(buildPlan).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();

      await expect(first).resolves.toBeUndefined();
    });

    expect(result.current.stage).toBe('failed');
    expect(result.current.error?.message).toBe('no position');
    expect(result.current.isBusy).toBe(false);
  });
});
