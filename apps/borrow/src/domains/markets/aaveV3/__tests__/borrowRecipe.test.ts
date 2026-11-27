import { describe, expect, it, vi } from 'vitest';
import type {
  ActionResolution,
  IntentsConnectActionsApi,
  ResolveActionRequest,
  Step,
  StepContext,
} from '@aurora-is-near/intents-connect';

import { nativeEth, usdc, weth } from '@/tests/fakeMarkets';

import { createAaveV3Adapter } from '..';
import {
  AAVE_BORROW_MARKETS,
  aaveBorrowTitle,
  BORROW_ACTION,
} from '../config/borrowAction';
import { AAVE_V3_MARKETS } from '../config/registry';
import { intersectSupported, withDeliveredAssets } from '../utils/supported';
import type { BorrowRecipeInput, LendingMarket } from '../../types';
import type {
  AaveBorrowAsset,
  AaveBorrowChain,
  AaveCollateralAsset,
} from '../config/borrowAction';
import type { AaveReadClient } from '../reserves';

/**
 * The Aave adapter's borrow recipe: the hosted `aave-v3-borrow` action, for
 * the market's chain and the action's symbols of the reserves. These tests
 * pin what Borrow asks the action for and that the recipe returns what it
 * resolves; the steps the action resolves are pinned for every pair by
 * `borrowAction.contract.test.ts`.
 */

const BASE_WETH = '0x4200000000000000000000000000000000000006';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CBBTC = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
const BASE_WSTETH = '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452';
const BASE_GHO = '0x6Bb7a212910682DCFdbd5BCBb3e28FB4E8da10Ee';
const ARB_WETH = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const ARB_USDT = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9';
const INTERMEDIARY = '0x00000000000000000000000000000000000000aa';
const RECIPIENT = '0x00000000000000000000000000000000000000bb';
const USER = '0x00000000000000000000000000000000000000cc';
const SOL = 'nep141:sol.omft.near';

const BASE: LendingMarket = {
  id: 'aave-v3:base',
  provider: 'aave-v3',
  name: 'Aave',
  chain: 'base',
  chainId: 8453,
  chainLabel: 'Base',
};

const ARB: LendingMarket = {
  ...BASE,
  id: 'aave-v3:arb',
  chain: 'arb',
  chainId: 42161,
  chainLabel: 'Arbitrum',
};

/** Steps the fake action resolves to: the recipe hands them on untouched. */
const RESOLVED_STEPS: Step[] = [
  {
    to: '0x0000000000000000000000000000000000000001',
    functionSignature: 'resolved()',
    parameters: [],
    value: '0',
  },
];

type BorrowInputs = {
  chain: AaveBorrowChain;
  collateral: AaveCollateralAsset;
  borrowAsset: AaveBorrowAsset;
  originAsset?: string;
  amount: string;
};

/** The 1Click asset ids the action delivers each collateral as. */
const ASSET_IDS: Record<string, string> = {
  'base:ETH': 'nep141:base.omft.near',
  'base:cbBTC':
    'nep141:base-0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf.omft.near',
  'arb:ETH': 'nep141:arb.omft.near',
};

/** What the hosted action answers for `inputs`, as the server would shape it. */
const resolutionFor = (
  actionId: string,
  { version, inputs }: ResolveActionRequest,
): ActionResolution => {
  const { chain, collateral, borrowAsset, originAsset, amount } =
    inputs as BorrowInputs;

  const table = AAVE_BORROW_MARKETS[chain];
  const supplied = table.collateral[collateral]!;
  const borrowed = table.borrow[borrowAsset]!;
  const assetId = ASSET_IDS[`${chain}:${collateral}`]!;
  const chainLabel = chain === 'base' ? 'Base' : 'Arbitrum';

  return {
    actionId,
    version,
    executionChain: chain,
    actionSha256Hash: BORROW_ACTION.sha256Hash,
    execution: {
      version: '1.0',
      type: 'evm',
      ...(originAsset
        ? {
            quote: {
              originAsset,
              destinationAsset: assetId,
              amount,
              swapType: 'EXACT_INPUT',
              slippageTolerance: 100,
            },
            outOperation: false,
          }
        : { destinationAsset: assetId }),
      dry: false,
      metadata: {
        intent: 'aave_borrow',
        title: aaveBorrowTitle({ chainLabel }, supplied, borrowed),
      },
      steps: RESOLVED_STEPS,
    },
  };
};

const client: AaveReadClient = {
  getBlockNumber: vi.fn(),
  readContract: vi.fn(),
  multicall: vi.fn(),
};

const listSupportedTokens = vi.fn();
const getClient = vi.fn(() => client);
const resolveAction = vi.fn<IntentsConnectActionsApi['resolveAction']>(
  async (actionId, request) => resolutionFor(actionId, request),
);

const adapter = createAaveV3Adapter({
  api: { listSupportedTokens },
  getClient,
  actionsApi: { resolveAction },
});

const ctx: StepContext = {
  intermediary: INTERMEDIARY,
  userAddress: USER,
  amount: '{MIN_AMOUNT_OUT}',
};

const PARAMS = {
  borrowAmount: '1500000000',
  recipient: RECIPIENT,
  originAsset: SOL,
  originAmount: '10000000000',
};

/** Base's cbBTC reserve: the action's ERC-20 collateral. */
const cbBtc = (asset: `0x${string}` = BASE_CBBTC) =>
  weth({
    asset,
    symbol: 'cbBTC',
    decimals: 8,
    assetId: ASSET_IDS['base:cbBTC'],
  });

/** Aave's wrapped-native reserve, delivered as the chain's gas token. */
const nativeOn = (chain: 'base' | 'arb', asset: `0x${string}`) =>
  nativeEth({ asset, assetId: ASSET_IDS[`${chain}:ETH`] });

const input = (
  overrides: Partial<BorrowRecipeInput> = {},
): BorrowRecipeInput => ({
  market: BASE,
  collateral: cbBtc(),
  borrow: usdc({ asset: BASE_USDC }),
  flow: 'bridge-in',
  ...overrides,
});

/** The inputs of the last resolve. */
const lastInputs = () => resolveAction.mock.calls.at(-1)?.[1].inputs;

describe('Aave V3 borrowRecipe', () => {
  it('is the hosted action’s recipe for an ERC-20 reserve, matched by address in any case', async () => {
    const recipe = adapter.borrowRecipe(
      input({
        collateral: cbBtc(BASE_CBBTC.toLowerCase() as `0x${string}`),
      }),
    );

    expect(recipe).toMatchObject({
      id: 'aave-borrow:aave-v3:base:cbBTC:USDC',
      intent: 'aave_borrow',
      title: 'Borrow USDC against cbBTC on Aave Base',
      flow: 'bridge-in',
      type: 'evm',
      destination: {
        chain: 'base',
        assetId:
          'nep141:base-0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf.omft.near',
        // The reserve's own address; the SDK compares it in any case.
        tokenAddress: BASE_CBBTC.toLowerCase(),
      },
    });

    await expect(recipe.buildSteps(ctx, PARAMS)).resolves.toEqual(
      RESOLVED_STEPS,
    );
    expect(resolveAction).toHaveBeenLastCalledWith('aave-v3-borrow', {
      version: 1,
      expectedSha256Hash: BORROW_ACTION.sha256Hash,
      inputs: {
        chain: 'base',
        collateral: 'cbBTC',
        borrowAsset: 'USDC',
        borrowAmount: '1500000000',
        recipient: RECIPIENT,
        originAsset: SOL,
        amount: '10000000000',
      },
    });
  });

  it('asks for ETH, delivered as the gas token, for a natively delivered reserve', async () => {
    const recipe = adapter.borrowRecipe(
      input({ collateral: nativeOn('base', BASE_WETH) }),
    );

    expect(recipe.destination).toEqual({
      chain: 'base',
      assetId: 'nep141:base.omft.near',
      tokenAddress: undefined,
    });

    await recipe.buildSteps(ctx, PARAMS);

    expect(lastInputs()).toMatchObject({ collateral: 'ETH' });
  });

  it.each([
    ['Base', BASE, BASE_WETH, BASE_USDC, 'USDC'],
    ['Arbitrum', ARB, ARB_WETH, ARB_USDT, 'USDT'],
  ] as const)(
    'supplies the WETH reserve read on %s as ETH when 1Click lists ETH and WETH',
    async (_label, market, wrapped, borrowed, borrowAsset) => {
      const aave = AAVE_V3_MARKETS.find(({ chain }) => chain === market.chain);

      if (!aave) {
        throw new Error(`no Aave market on ${market.chain}`);
      }

      const nativeAssetId = `nep141:${market.chain}.omft.near`;

      const [read] = withDeliveredAssets(
        { collateral: [weth({ asset: wrapped })], borrowable: [] },
        intersectSupported(
          [
            {
              blockchain: market.chain,
              contractAddress: wrapped.toLowerCase(),
              assetId: `nep141:${market.chain}-${wrapped.toLowerCase()}.omft.near`,
              symbol: 'WETH',
              decimals: 18,
            },
            {
              blockchain: market.chain,
              contractAddress: '',
              assetId: nativeAssetId,
              symbol: 'ETH',
              decimals: 18,
            },
          ],
          aave,
        ),
      ).collateral;

      if (!read) {
        throw new Error('the WETH reserve was not delivered');
      }

      expect(read.symbol).toBe('WETH');

      const recipe = adapter.borrowRecipe(
        input({ market, collateral: read, borrow: usdc({ asset: borrowed }) }),
      );

      expect(recipe.destination).toEqual({
        chain: market.chain,
        assetId: nativeAssetId,
        tokenAddress: undefined,
      });

      await recipe.buildSteps(ctx, PARAMS);

      expect(lastInputs()).toMatchObject({
        chain: market.chain,
        collateral: 'ETH',
        borrowAsset,
      });
    },
  );

  it('names Arbitrum’s USDT as 1Click lists it, USDT0', () => {
    expect(
      adapter.borrowRecipe(
        input({
          market: ARB,
          collateral: nativeOn('arb', ARB_WETH),
          borrow: usdc({ asset: ARB_USDT, symbol: 'USDT0' }),
        }),
      ),
    ).toMatchObject({
      id: 'aave-borrow:aave-v3:arb:ETH:USDT0',
      title: 'Borrow USDT0 against ETH on Aave Arbitrum',
    });
  });

  it('spends the context’s amount on steps-only, with no origin', async () => {
    const recipe = adapter.borrowRecipe(input({ flow: 'steps-only' }));

    expect(recipe.flow).toBe('steps-only');

    await recipe.buildSteps(
      { ...ctx, amount: '987654321' },
      { borrowAmount: '1500000000', recipient: RECIPIENT },
    );

    expect(lastInputs()).toEqual({
      chain: 'base',
      collateral: 'cbBTC',
      borrowAsset: 'USDC',
      borrowAmount: '1500000000',
      recipient: RECIPIENT,
      amount: '987654321',
    });
  });

  it('refuses a bridge-in build with a concrete amount (threeRound)', async () => {
    resolveAction.mockClear();

    await expect(
      adapter
        .borrowRecipe(input())
        .buildSteps({ ...ctx, amount: '987654321' }, PARAMS),
    ).rejects.toThrow('placeholder fee strategy');
    expect(resolveAction).not.toHaveBeenCalled();
  });

  it('refuses a bridge-in build without the bridged asset and amount', async () => {
    resolveAction.mockClear();

    await expect(
      adapter
        .borrowRecipe(input())
        .buildSteps(ctx, { borrowAmount: '1', recipient: RECIPIENT }),
    ).rejects.toThrow('params.originAsset and params.originAmount');
    expect(resolveAction).not.toHaveBeenCalled();
  });

  it('sends to the connected wallet when no recipient is given', async () => {
    await adapter
      .borrowRecipe(input())
      .buildSteps(ctx, { ...PARAMS, recipient: undefined });

    expect(lastInputs()).toMatchObject({ recipient: USER });
  });

  it('throws ACTION_MISMATCH when the action resolves another asset', async () => {
    resolveAction.mockImplementationOnce(async (actionId, request) => {
      const resolution = resolutionFor(actionId, request);

      return {
        ...resolution,
        execution: {
          ...resolution.execution,
          quote: {
            ...resolution.execution.quote!,
            destinationAsset: 'nep141:base.omft.near',
          },
        },
      };
    });

    await expect(
      adapter.borrowRecipe(input()).buildSteps(ctx, PARAMS),
    ).rejects.toMatchObject({ code: 'ACTION_MISMATCH' });
  });

  it('reads nothing but the action to build the steps', async () => {
    resolveAction.mockClear();

    const recipe = adapter.borrowRecipe(input());

    expect(resolveAction).not.toHaveBeenCalled();

    await recipe.buildSteps(ctx, PARAMS);

    expect(resolveAction).toHaveBeenCalledTimes(1);
    expect(listSupportedTokens).not.toHaveBeenCalled();
    expect(getClient).not.toHaveBeenCalled();
  });

  it('rejects a market it does not serve', () => {
    expect(() =>
      adapter.borrowRecipe(input({ market: { ...BASE, id: 'aave-v3:eth' } })),
    ).toThrow('unknown market aave-v3:eth');
  });

  it('throws for collateral the action does not cover', () => {
    expect(() =>
      adapter.borrowRecipe(
        input({ collateral: weth({ asset: BASE_WSTETH, symbol: 'wstETH' }) }),
      ),
    ).toThrow(
      `Aave V3 Base: the borrow action does not cover wstETH (${BASE_WSTETH}) as collateral`,
    );
  });

  it('throws for the WETH reserve delivered as the ERC-20, which 1Click does not fill', () => {
    expect(() =>
      adapter.borrowRecipe(input({ collateral: weth({ asset: BASE_WETH }) })),
    ).toThrow(
      `Aave V3 Base: the borrow action does not cover WETH (${BASE_WETH}) as collateral`,
    );
  });

  it("throws for a reserve of another chain's table", () => {
    expect(() =>
      adapter.borrowRecipe(
        input({ market: ARB, collateral: nativeEth({ asset: BASE_WETH }) }),
      ),
    ).toThrow('does not cover ETH');
  });

  it('throws for a borrow token the action does not cover', () => {
    expect(() =>
      adapter.borrowRecipe(
        input({ borrow: usdc({ asset: BASE_GHO, symbol: 'GHO' }) }),
      ),
    ).toThrow(
      `Aave V3 Base: the borrow action does not cover borrowing GHO (${BASE_GHO})`,
    );
  });
});
