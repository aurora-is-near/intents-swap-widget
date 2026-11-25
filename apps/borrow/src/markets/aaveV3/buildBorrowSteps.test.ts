import { describe, expect, it, vi } from 'vitest';

import { nativeEth, usdc, weth } from '../../tests/fakeMarkets';
import type { BuildBorrowStepsInput, LendingMarket } from '../types';
import { createAaveV3Adapter } from '.';
import type { AaveReadClient } from './reserves';

/**
 * The adapter's side of the borrow steps: picking the market and mapping its
 * reserves to the `aave-v3-borrow` action's table symbols. The calls
 * themselves are the action's, tested in `@aurora-is-near/intents-connect-actions`
 * (`sdk.test.ts`, `resolve.test.ts`) and pinned for every pair by
 * `loan/execution/recipe.golden.test.ts`.
 */

const BASE_POOL = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';
const BASE_GATEWAY = '0xa0d9C1E9E48Ca30c8d8C3B5D69FF5dc1f6DFfC24';
const BASE_WETH = '0x4200000000000000000000000000000000000006';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_WSTETH = '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452';
const BASE_GHO = '0x6Bb7a212910682DCFdbd5BCBb3e28FB4E8da10Ee';
const ARB_POOL = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
const ARB_GATEWAY = '0x5283BEcEd7ADF6D003225C13896E536f2D4264FF';
const ARB_WETH = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const ARB_USDT = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9';
const INTERMEDIARY = '0x00000000000000000000000000000000000000aa';
const RECIPIENT = '0x00000000000000000000000000000000000000bb';

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

const input = (
  overrides: Partial<BuildBorrowStepsInput> = {},
): BuildBorrowStepsInput => ({
  market: BASE,
  collateral: weth({ asset: BASE_WETH }),
  borrow: usdc({ asset: BASE_USDC }),
  amount: '{MIN_AMOUNT_OUT}',
  borrowAmount: '1500000000',
  owner: INTERMEDIARY,
  recipient: RECIPIENT,
  ...overrides,
});

const callsOf = (stepsInput: BuildBorrowStepsInput) =>
  adapter
    .buildBorrowSteps(stepsInput)
    .map(({ to, functionSignature }) => [to, functionSignature]);

describe('Aave V3 buildBorrowSteps', () => {
  it('maps an ERC-20 reserve by address, in any case, to approve and supply', () => {
    expect(
      callsOf(
        input({
          collateral: weth({ asset: BASE_WETH.toLowerCase() as `0x${string}` }),
        }),
      ),
    ).toEqual([
      [BASE_WETH, 'approve(address,uint256)'],
      [BASE_POOL, 'supply(address,uint256,address,uint16)'],
      [BASE_POOL, 'borrow(address,uint256,uint256,uint16,address)'],
      [BASE_USDC, 'transfer(address,uint256)'],
    ]);
  });

  it('maps a natively delivered reserve to the gateway deposit', () => {
    expect(
      callsOf(input({ collateral: nativeEth({ asset: BASE_WETH }) })),
    ).toEqual([
      [BASE_GATEWAY, 'depositETH(address,address,uint16)'],
      [BASE_POOL, 'borrow(address,uint256,uint256,uint16,address)'],
      [BASE_USDC, 'transfer(address,uint256)'],
    ]);
  });

  it("uses the market's own Pool, gateway and tokens", () => {
    expect(
      callsOf(
        input({
          market: ARB,
          collateral: nativeEth({ asset: ARB_WETH }),
          borrow: usdc({ asset: ARB_USDT, symbol: 'USDT0' }),
        }),
      ),
    ).toEqual([
      [ARB_GATEWAY, 'depositETH(address,address,uint16)'],
      [ARB_POOL, 'borrow(address,uint256,uint256,uint16,address)'],
      [ARB_USDT, 'transfer(address,uint256)'],
    ]);
  });

  it('passes the amount, owner and recipient through', () => {
    const [deposit, borrow, send] = adapter.buildBorrowSteps(
      input({
        collateral: nativeEth({ asset: BASE_WETH }),
        amount: '987654321',
      }),
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
  });

  it('reads nothing to build the steps', () => {
    adapter.buildBorrowSteps(input());

    expect(listSupportedTokens).not.toHaveBeenCalled();
    expect(getClient).not.toHaveBeenCalled();
  });

  it('rejects a market it does not serve', () => {
    expect(() =>
      adapter.buildBorrowSteps(
        input({ market: { ...BASE, id: 'aave-v3:eth' } }),
      ),
    ).toThrow('unknown market aave-v3:eth');
  });

  it('throws for collateral the action does not cover', () => {
    expect(() =>
      adapter.buildBorrowSteps(
        input({ collateral: weth({ asset: BASE_WSTETH, symbol: 'wstETH' }) }),
      ),
    ).toThrow(
      `Aave V3 Base: the borrow action does not cover wstETH (${BASE_WSTETH}) as collateral`,
    );
  });

  it("throws for a reserve of another chain's table", () => {
    expect(() =>
      adapter.buildBorrowSteps(
        input({ market: ARB, collateral: nativeEth({ asset: BASE_WETH }) }),
      ),
    ).toThrow('does not cover ETH');
  });

  it('throws for a borrow token the action does not cover', () => {
    expect(() =>
      adapter.buildBorrowSteps(
        input({ borrow: usdc({ asset: BASE_GHO, symbol: 'GHO' }) }),
      ),
    ).toThrow(
      `Aave V3 Base: the borrow action does not cover borrowing GHO (${BASE_GHO})`,
    );
  });
});
