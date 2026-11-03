import { base64 } from '@scure/base';
import { describe, expect, it, vi } from 'vitest';

import type { CreateExecutionBody, IntentsConnectApi } from '@/api/types';
import { noopLogger } from '@/logger';
import type { Execution, ExecutionStatus, Step } from '@/types/execution';
import type { Recipe } from '@/types/recipe';
import type { WalletConnector } from '@/types/wallet';
import { createExecutionRunner } from '@/runner/createExecutionRunner';
import { isOutOperationExecution } from '@/runner/flows/resume';
import type { OutOperationPlan, RunnerEvent } from '@/runner/types';

const ADDRESS = '0xD84368a36ff4F6285F4121ED75E8c1f237E51506';
const INTERMEDIARY = '0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E';
const POOL = '0x69a5F9AD4f96ebf0a0C792dD42a01cC5C0102fef';
const USDC = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603';
const USDC_ASSET = 'nep245:monad-usdc';
const BASE_USDC = 'nep141:base-usdc.omft.near';

const wallet = (): WalletConnector => ({
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
  makeTransfer: vi.fn(),
});

const withdraw: Recipe<{ all?: boolean }> = {
  id: 'withdraw',
  intent: 'aave_withdraw',
  title: 'Withdraw from Aave',
  flow: 'out-operation',
  type: 'evm',
  destination: { chain: 'monad', assetId: USDC_ASSET, tokenAddress: USDC },
  buildSteps: ({ amount, intermediary }) => [
    {
      to: POOL,
      functionSignature: 'withdraw(address,uint256,address)',
      parameters: [USDC, amount, intermediary],
      value: '0',
    },
  ],
};

type Setup = {
  dryFee?: string;
  realFee?: string;
  finalStatus?: ExecutionStatus;
  /** What the real create echoes as the quote amount. */
  echoAmount?: (sent: string) => string;
};

const setup = ({
  dryFee = '2000',
  realFee = dryFee,
  finalStatus = 'SUCCESS',
  echoAmount = (sent) => sent,
}: Setup = {}) => {
  const bodies: CreateExecutionBody[] = [];
  let created: Execution | undefined;

  const createExecution = vi.fn<IntentsConnectApi['createExecution']>(
    async (_address, body) => {
      bodies.push(body);

      const value: Execution = {
        id: 'out-1',
        status: body.dry ? 'OPERATION_PENDING' : 'CREATED',
        type: 'evm',
        quote: {
          amount: body.dry ? body.quote.amount : echoAmount(body.quote.amount),
          amountIn: (
            BigInt(body.quote.amount) - BigInt(body.dry ? dryFee : realFee)
          ).toString(),
          amountOut: '0',
          minAmountOut: '0',
          depositAddress: 'deposit',
          depositMemo: null,
          recipient: body.quote.recipient,
        },
        steps: body.steps,
        metadata: body.metadata,
        details: {
          intermediaryAddress: INTERMEDIARY,
          networkFee: body.dry ? dryFee : realFee,
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
      evm: INTERMEDIARY,
      solana: null,
    }),
    createExecution,
    createStepsExecution: vi.fn(),
    listSupportedTokens: vi.fn(),
    submitSignature: vi.fn().mockResolvedValue({ status: 'SIGNING' }),
    recordDeposit: vi.fn(),
    listExecutions: vi.fn<IntentsConnectApi['listExecutions']>(
      async (_address, query) =>
        query?.id && created ? [{ ...created, status: finalStatus }] : [],
    ),
    deleteExecution: vi.fn().mockResolvedValue(undefined),
  };

  const events: RunnerEvent[] = [];
  const connector = wallet();
  const runner = createExecutionRunner({
    api,
    wallet: connector,
    logger: noopLogger,
    pollIntervalMs: 0,
    onEvent: (event) => events.push(event),
  });

  const plan: OutOperationPlan<{ all?: boolean }> = {
    recipe: withdraw,
    params: {},
    amount: '5000000',
    quote: { destinationAsset: BASE_USDC, recipient: ADDRESS },
  };

  return { api, runner, plan, bodies, events, connector };
};

const phasesOf = (events: RunnerEvent[]) =>
  events.filter((e) => e.type === 'phase').map((e) => e.phase);

describe('runOut', () => {
  it('releases the funds, pays them out through 1Click, and settles with no deposit', async () => {
    const h = setup();

    const result = await h.runner.runOut(h.plan);

    expect(result.status).toBe('SUCCESS');
    expect(phasesOf(h.events)).toEqual([
      'resolving-identity',
      'planning',
      'creating',
      'awaiting-signature',
      'submitting',
      'settling',
      'success',
    ]);
    expect(h.connector.makeTransfer).not.toHaveBeenCalled();
    expect(h.api.recordDeposit).not.toHaveBeenCalled();
    expect(h.api.createStepsExecution).not.toHaveBeenCalled();
  });

  it('measures the fee, then sends the amount less a fee budget', async () => {
    const h = setup({ dryFee: '2000' });

    await h.runner.runOut(h.plan);

    const [dry, real] = h.bodies;

    // Round 1: everything out, to measure the fee.
    expect(dry).toMatchObject({ dry: true, outOperation: true });
    expect(dry!.quote.amount).toBe('5000000');

    // Budget = fee + 50%: 3000, so 4 997 000 goes to 1Click.
    expect(real).toMatchObject({
      dry: false,
      outOperation: true,
      quote: {
        originAsset: USDC_ASSET,
        destinationAsset: BASE_USDC,
        amount: '4997000',
        swapType: 'EXACT_INPUT',
        recipient: ADDRESS,
      },
      metadata: {
        intent: 'aave_withdraw',
        intentsConnectFlow: 'out-operation',
        intentsConnectFeeBudget: '3000',
      },
    });
    expect(real!.steps).toEqual([
      {
        to: POOL,
        functionSignature: 'withdraw(address,uint256,address)',
        parameters: [USDC, '5000000', INTERMEDIARY],
        value: '0',
      },
      {
        to: USDC,
        functionSignature: 'transfer(address,uint256)',
        parameters: ['{DEPOSIT_ADDRESS}', '4997000'],
        value: '0',
      },
    ] satisfies Step[]);
    expect(h.events).toContainEqual({
      type: 'quoted',
      networkFee: '2000',
      spendable: '4997000',
    });
  });

  it('passes an intents payout through', async () => {
    const h = setup();

    await h.runner.runOut({
      ...h.plan,
      quote: { ...h.plan.quote, recipientType: 'INTENTS' },
    });

    expect(h.bodies[1]!.quote).toMatchObject({ recipientType: 'INTENTS' });
  });

  it('refuses, before signing, a real fee above the budget', async () => {
    const h = setup({ dryFee: '2000', realFee: '3001' });

    await expect(h.runner.runOut(h.plan)).rejects.toMatchObject({
      code: 'FEE_EXCEEDS_AMOUNT',
    });
    expect(h.api.submitSignature).not.toHaveBeenCalled();
  });

  it('refuses a quote that does not echo the payout', async () => {
    const h = setup({ echoAmount: () => '1' });

    await expect(h.runner.runOut(h.plan)).rejects.toMatchObject({
      code: 'QUOTE_MOVED',
    });
    expect(h.api.submitSignature).not.toHaveBeenCalled();
  });

  it('refuses an amount the fee would eat', async () => {
    const h = setup({ dryFee: '4000000' });

    await expect(h.runner.runOut(h.plan)).rejects.toMatchObject({
      code: 'FEE_EXCEEDS_AMOUNT',
    });
  });

  it('refuses a recipe that is not an out-operation', async () => {
    const h = setup();

    await expect(
      h.runner.runOut({
        ...h.plan,
        recipe: { ...withdraw, flow: 'steps-only' },
      }),
    ).rejects.toMatchObject({ code: 'STRATEGY_CONFLICT' });
    expect(h.api.createExecution).not.toHaveBeenCalled();
  });

  it('marks the execution so a resume never asks for a deposit', async () => {
    const h = setup();

    const result = await h.runner.runOut(h.plan);

    expect(isOutOperationExecution(result)).toBe(true);
  });
});
