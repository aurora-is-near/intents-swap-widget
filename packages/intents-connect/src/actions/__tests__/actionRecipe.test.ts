import { describe, expect, it, vi } from 'vitest';

import { actionRecipe } from '@/actions';
import type {
  ActionResolution,
  IntentsConnectActionsApi,
  ResolvedExecution,
} from '@/actions';
import { GuardError } from '@/errors';
import type { Step } from '@/types/execution';
import type { StepContext } from '@/types/recipe';

const HASH = 'cf4a065b25d026dbf38b8724ced0d58642309f404672e552d038fa3e64b983fa';
const ETH_ON_BASE = 'nep141:base.omft.near';
const CTX: StepContext = {
  intermediary: '0x00000000000000000000000000000000000000aa',
  userAddress: '0x00000000000000000000000000000000000000cc',
  amount: '{MIN_AMOUNT_OUT}',
};

const STEPS: Step[] = [
  {
    to: '0xa0d9C1E9E48Ca30c8d8C3B5D69FF5dc1f6DFfC24',
    functionSignature: 'depositETH(address,address,uint16)',
    parameters: [
      '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      '{INTERMEDIARY}',
      '0',
    ],
    value: '{MIN_AMOUNT_OUT}',
    metadata: { name: 'Supply ETH', description: 'Supply ETH' },
  },
];

const BRIDGE_IN: ResolvedExecution = {
  version: '1.0',
  type: 'evm',
  quote: {
    originAsset: 'nep141:eth.omft.near',
    destinationAsset: ETH_ON_BASE,
    amount: '3000000000000000',
    swapType: 'EXACT_INPUT',
    slippageTolerance: 100,
  },
  outOperation: false,
  dry: false,
  metadata: {
    intent: 'aave_borrow',
    title: 'Borrow USDC against ETH on Aave Base',
  },
  steps: STEPS,
};

const resolution = (
  execution: Partial<ResolvedExecution> = {},
): ActionResolution => ({
  actionId: 'aave-v3-borrow',
  version: 1,
  executionChain: 'base',
  actionSha256Hash: HASH,
  execution: { ...BRIDGE_IN, ...execution },
});

type Params = { borrowAmount: string };

const recipeFor = (
  answer: ActionResolution,
  flow: 'bridge-in' | 'steps-only' | 'out-operation' = 'bridge-in',
) => {
  const resolveAction = vi.fn<IntentsConnectActionsApi['resolveAction']>(
    async () => answer,
  );

  const recipe = actionRecipe<Params>({
    api: { resolveAction },
    actionId: 'aave-v3-borrow',
    version: 1,
    expectedSha256Hash: HASH,
    id: 'aave-borrow:aave-v3:base:ETH:USDC',
    intent: 'aave_borrow',
    title: 'Borrow USDC against ETH on Aave Base',
    flow,
    destination: { chain: 'base', assetId: ETH_ON_BASE },
    inputs: (ctx, { borrowAmount }) => ({
      chain: 'base',
      borrowAmount,
      recipient: ctx.userAddress,
      amount: ctx.amount,
    }),
  });

  return { recipe, resolveAction };
};

describe('actionRecipe', () => {
  it('is an EVM recipe with the given static fields', () => {
    const { recipe } = recipeFor(resolution());

    expect(recipe).toMatchObject({
      id: 'aave-borrow:aave-v3:base:ETH:USDC',
      intent: 'aave_borrow',
      title: 'Borrow USDC against ETH on Aave Base',
      flow: 'bridge-in',
      type: 'evm',
      destination: { chain: 'base', assetId: ETH_ON_BASE },
    });
  });

  it('resolves the pinned action with the inputs for this build and returns its steps', async () => {
    const { recipe, resolveAction } = recipeFor(resolution());

    await expect(
      recipe.buildSteps(CTX, { borrowAmount: '1500000' }),
    ).resolves.toEqual(STEPS);
    expect(resolveAction).toHaveBeenCalledWith('aave-v3-borrow', {
      version: 1,
      expectedSha256Hash: HASH,
      inputs: {
        chain: 'base',
        borrowAmount: '1500000',
        recipient: CTX.userAddress,
        amount: '{MIN_AMOUNT_OUT}',
      },
    });
  });

  it('passes each build its own amount (no caching across amounts)', async () => {
    const { recipe, resolveAction } = recipeFor(
      resolution({ quote: undefined, destinationAsset: ETH_ON_BASE }),
      'steps-only',
    );

    await recipe.buildSteps({ ...CTX, amount: '100' }, { borrowAmount: '1' });
    await recipe.buildSteps({ ...CTX, amount: '79' }, { borrowAmount: '1' });

    expect(
      resolveAction.mock.calls.map(([, request]) => request.inputs.amount),
    ).toEqual(['100', '79']);
  });

  it('lets an actions API error through untouched', async () => {
    const error = new Error('hash changed');
    const recipe = actionRecipe<Params>({
      ...recipeFor(resolution()).recipe,
      api: { resolveAction: vi.fn().mockRejectedValue(error) },
      actionId: 'aave-v3-borrow',
      version: 1,
      inputs: () => ({}),
    });

    await expect(recipe.buildSteps(CTX, { borrowAmount: '1' })).rejects.toBe(
      error,
    );
  });

  it.each([
    ['a Solana execution', resolution({ type: 'solana' }), 'bridge-in'],
    [
      'a steps-only body for a bridge-in recipe',
      resolution({ quote: undefined, destinationAsset: ETH_ON_BASE }),
      'bridge-in',
    ],
    ['a bridge-in body for a steps-only recipe', resolution(), 'steps-only'],
    [
      'an out-operation body for a bridge-in recipe',
      resolution({ outOperation: true }),
      'bridge-in',
    ],
    [
      'another delivered asset',
      resolution({
        quote: {
          ...BRIDGE_IN.quote!,
          destinationAsset: 'nep141:arb.omft.near',
        },
      }),
      'bridge-in',
    ],
    [
      'another title',
      resolution({ metadata: { intent: 'aave_borrow', title: 'Other' } }),
      'bridge-in',
    ],
    ['another version', { ...resolution(), version: 2 }, 'bridge-in'],
    [
      'another hash than the pinned one',
      { ...resolution(), actionSha256Hash: 'f'.repeat(64) },
      'bridge-in',
    ],
  ] as const)('throws ACTION_MISMATCH for %s', async (_, answer, flow) => {
    const { recipe } = recipeFor(answer, flow);

    const error = await recipe
      .buildSteps(CTX, { borrowAmount: '1' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GuardError);
    expect(error).toMatchObject({ code: 'ACTION_MISMATCH' });
  });

  it('accepts an out-operation body paying from the destination asset', async () => {
    const { recipe } = recipeFor(
      resolution({
        outOperation: true,
        quote: { ...BRIDGE_IN.quote!, originAsset: ETH_ON_BASE },
      }),
      'out-operation',
    );

    await expect(
      recipe.buildSteps(CTX, { borrowAmount: '1' }),
    ).resolves.toEqual(STEPS);
  });
});
