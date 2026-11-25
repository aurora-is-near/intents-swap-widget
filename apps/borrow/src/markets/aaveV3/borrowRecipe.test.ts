import type { StepContext } from '@aurora-is-near/intents-connect';
import { describe, expect, it, vi } from 'vitest';

import { nativeEth, usdc, weth } from '../../tests/fakeMarkets';
import type { BorrowRecipeInput, LendingMarket } from '../types';
import { createAaveV3Adapter } from '.';
import { AAVE_V3_MARKETS } from './registry';
import type { AaveReadClient } from './reserves';
import { intersectSupported, withDeliveredAssets } from './supported';

/**
 * The Aave adapter's borrow recipe: the `aave-v3-borrow` action's own
 * recipe, for the market's chain and the action's symbols of the reserves.
 * The recipe itself is tested in `@aurora-is-near/intents-connect-actions`
 * (`sdk.test.ts`) and pinned for every pair by
 * `loan/execution/recipe.golden.test.ts`.
 */

const BASE_POOL = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';
const BASE_GATEWAY = '0xa0d9C1E9E48Ca30c8d8C3B5D69FF5dc1f6DFfC24';
const BASE_WETH = '0x4200000000000000000000000000000000000006';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CBBTC = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
const BASE_WSTETH = '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452';
const BASE_GHO = '0x6Bb7a212910682DCFdbd5BCBb3e28FB4E8da10Ee';
const ARB_POOL = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
const ARB_GATEWAY = '0x5283BEcEd7ADF6D003225C13896E536f2D4264FF';
const ARB_WETH = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const ARB_USDT = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9';
const INTERMEDIARY = '0x00000000000000000000000000000000000000aa';
const RECIPIENT = '0x00000000000000000000000000000000000000bb';
const USER = '0x00000000000000000000000000000000000000cc';

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

const client: AaveReadClient = {
  getBlockNumber: vi.fn(),
  readContract: vi.fn(),
  multicall: vi.fn(),
};

const listSupportedTokens = vi.fn();
const getClient = vi.fn(() => client);
const adapter = createAaveV3Adapter({
  api: { listSupportedTokens },
  getClient,
});

const ctx: StepContext = {
  intermediary: INTERMEDIARY,
  userAddress: USER,
  amount: '{MIN_AMOUNT_OUT}',
};

const PARAMS = { borrowAmount: '1500000000', recipient: RECIPIENT };

/** Base's cbBTC reserve: the action's ERC-20 collateral. */
const cbBtc = (asset: `0x${string}` = BASE_CBBTC) =>
  weth({ asset, symbol: 'cbBTC', decimals: 8 });

const input = (
  overrides: Partial<BorrowRecipeInput> = {},
): BorrowRecipeInput => ({
  market: BASE,
  collateral: cbBtc(),
  borrow: usdc({ asset: BASE_USDC }),
  flow: 'bridge-in',
  ...overrides,
});

const callsOf = (recipeInput: BorrowRecipeInput) =>
  adapter
    .borrowRecipe(recipeInput)
    .buildSteps(ctx, PARAMS)
    .map(({ to, functionSignature }) => [to, functionSignature]);

describe('Aave V3 borrowRecipe', () => {
  it('is the action’s recipe for an ERC-20 reserve, matched by address in any case', () => {
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
        tokenAddress: BASE_CBBTC,
      },
    });
    expect(
      recipe
        .buildSteps(ctx, PARAMS)
        .map(({ to, functionSignature }) => [to, functionSignature]),
    ).toEqual([
      [BASE_CBBTC, 'approve(address,uint256)'],
      [BASE_POOL, 'supply(address,uint256,address,uint16)'],
      [BASE_POOL, 'borrow(address,uint256,uint256,uint16,address)'],
      [BASE_USDC, 'transfer(address,uint256)'],
    ]);
  });

  it('maps a natively delivered reserve to the gateway deposit, delivered as the gas token', () => {
    const recipeInput = input({ collateral: nativeEth({ asset: BASE_WETH }) });

    expect(adapter.borrowRecipe(recipeInput).destination).toEqual({
      chain: 'base',
      assetId: 'nep141:base.omft.near',
      tokenAddress: undefined,
    });
    expect(callsOf(recipeInput)).toEqual([
      [BASE_GATEWAY, 'depositETH(address,address,uint16)'],
      [BASE_POOL, 'borrow(address,uint256,uint256,uint16,address)'],
      [BASE_USDC, 'transfer(address,uint256)'],
    ]);
  });

  it.each([
    ['Base', BASE, BASE_WETH, BASE_GATEWAY, BASE_POOL, BASE_USDC],
    ['Arbitrum', ARB, ARB_WETH, ARB_GATEWAY, ARB_POOL, ARB_USDT],
  ] as const)(
    'supplies the WETH reserve read on %s natively when 1Click lists ETH and WETH',
    (_label, market, wrapped, gateway, pool, borrowed) => {
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

      const recipeInput = input({
        market,
        collateral: read,
        borrow: usdc({ asset: borrowed }),
      });

      expect(adapter.borrowRecipe(recipeInput).destination).toEqual({
        chain: market.chain,
        assetId: nativeAssetId,
        tokenAddress: undefined,
      });

      const steps = adapter.borrowRecipe(recipeInput).buildSteps(ctx, PARAMS);

      expect(
        steps.map(({ to, functionSignature }) => [to, functionSignature]),
      ).toEqual([
        [gateway, 'depositETH(address,address,uint16)'],
        [pool, 'borrow(address,uint256,uint256,uint16,address)'],
        [borrowed, 'transfer(address,uint256)'],
      ]);
      expect(steps[0]?.value).toBe('{MIN_AMOUNT_OUT}');
    },
  );

  it("uses the market's own Pool, gateway and tokens", () => {
    const recipeInput = input({
      market: ARB,
      collateral: nativeEth({ asset: ARB_WETH }),
      borrow: usdc({ asset: ARB_USDT, symbol: 'USDT0' }),
    });

    expect(adapter.borrowRecipe(recipeInput).id).toBe(
      'aave-borrow:aave-v3:arb:ETH:USDT0',
    );
    expect(callsOf(recipeInput)).toEqual([
      [ARB_GATEWAY, 'depositETH(address,address,uint16)'],
      [ARB_POOL, 'borrow(address,uint256,uint256,uint16,address)'],
      [ARB_USDT, 'transfer(address,uint256)'],
    ]);
  });

  it('runs steps-only when asked', () => {
    expect(adapter.borrowRecipe(input({ flow: 'steps-only' })).flow).toBe(
      'steps-only',
    );
  });

  it('supplies the context’s amount for the intermediary and sends to the recipient, else the connected wallet', () => {
    const recipe = adapter.borrowRecipe(
      input({ collateral: nativeEth({ asset: BASE_WETH }) }),
    );

    const [deposit, borrow, send] = recipe.buildSteps(
      { ...ctx, amount: '987654321' },
      PARAMS,
    );

    expect(deposit?.value).toBe('987654321');
    expect(deposit?.parameters).toEqual([BASE_POOL, INTERMEDIARY, '0']);
    expect(borrow?.parameters).toEqual([
      BASE_USDC,
      '1500000000',
      '2',
      '0',
      INTERMEDIARY,
    ]);
    expect(send?.parameters).toEqual([RECIPIENT, '1500000000']);
    expect(
      recipe.buildSteps(ctx, { borrowAmount: '1' }).at(-1)?.parameters,
    ).toEqual([USER, '1']);
  });

  it('reads nothing to build the recipe', () => {
    adapter.borrowRecipe(input()).buildSteps(ctx, PARAMS);

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
