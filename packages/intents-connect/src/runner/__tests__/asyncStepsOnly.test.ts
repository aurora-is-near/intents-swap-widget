import { describe, expect, it, vi } from 'vitest';

import type { IntentsConnectApi } from '@/api/types';
import { noopLogger } from '@/logger';
import type { Execution, Step } from '@/types/execution';
import type { AsyncRecipe } from '@/types/recipe';
import type { WalletConnector } from '@/types/wallet';
import { createExecutionRunner } from '@/runner/createExecutionRunner';
import type { StepsPlan } from '@/runner/types';

/*
 * A steps-only preview with the fee carved from the amount rebuilds the steps
 * at the post-fee amount: an async recipe (a hosted action) is resolved once
 * per amount, and every build is awaited before its steps are used.
 */

const ADDRESS = '0xD84368a36ff4F6285F4121ED75E8c1f237E51506';
const INTERMEDIARY = '0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E';
const CBBTC = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
const POOL = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';
const FEE = '21';

const wallet = (): WalletConnector => ({
  id: 'test-evm',
  name: 'Test EVM',
  chains: ['base'],
  signingStandard: 'erc191',
  connect: vi.fn(),
  disconnect: vi.fn(),
  getAddress: () => ADDRESS,
  getProviders: () => ({}),
});

const supply = (amount: string): Step[] => [
  {
    to: CBBTC,
    functionSignature: 'approve(address,uint256)',
    parameters: [POOL, amount],
    value: '0',
  },
  {
    to: POOL,
    functionSignature: 'supply(address,uint256,address,uint16)',
    parameters: [CBBTC, amount, '{INTERMEDIARY}', '0'],
    value: '0',
  },
];

describe('previewSteps — an async EVM recipe (a hosted action)', () => {
  it('resolves the steps at the gross and the post-fee amount, awaiting each', async () => {
    const buildSteps = vi.fn<AsyncRecipe['buildSteps']>(async ({ amount }) =>
      supply(amount),
    );

    const recipe: AsyncRecipe = {
      id: 'hosted-supply',
      intent: 'hosted_supply',
      title: 'Supply cbBTC',
      flow: 'steps-only',
      type: 'evm',
      destination: {
        chain: 'base',
        assetId: 'nep141:base-cbbtc',
        tokenAddress: CBBTC,
      },
      buildSteps,
    };

    const createStepsExecution = vi.fn<
      IntentsConnectApi['createStepsExecution']
    >(
      async (_address, body) =>
        ({
          id: 'dry',
          status: 'CREATED',
          type: 'evm',
          steps: body.steps,
          metadata: body.metadata,
          details: { intermediaryAddress: INTERMEDIARY, networkFee: FEE },
        }) as unknown as Execution,
    );

    const api: IntentsConnectApi = {
      getIntermediary: vi.fn().mockResolvedValue({
        originAccount: ADDRESS,
        originType: 'evm',
        evm: INTERMEDIARY,
        solana: null,
      }),
      createExecution: vi.fn(),
      createStepsExecution,
      listSupportedTokens: vi.fn(),
      submitSignature: vi.fn(),
      recordDeposit: vi.fn(),
      listExecutions: vi.fn().mockResolvedValue([]),
      deleteExecution: vi.fn(),
    };

    const plan: StepsPlan<void> = {
      recipe,
      params: undefined,
      amount: '165000',
      feeFromAmount: true,
    };

    const preview = await createExecutionRunner({
      api,
      wallet: wallet(),
      logger: noopLogger,
    }).previewSteps(plan);

    const amounts = buildSteps.mock.calls.map(([ctx]) => ctx.amount);

    expect(amounts[0]).toBe('165000');
    expect(new Set(amounts).size).toBeGreaterThan(1);
    expect(preview.spendable).toBe(amounts.at(-1));

    createStepsExecution.mock.calls.forEach(([, body]) => {
      expect(Array.isArray(body.steps)).toBe(true);
    });

    expect(preview.plan.prepared?.steps).toEqual(supply(preview.spendable));
  });
});
