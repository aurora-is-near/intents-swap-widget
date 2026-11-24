import { describe, expect, it, vi } from 'vitest';

import { nativeEth, usdc, weth } from '../../tests/fakeMarkets';
import type { BuildBorrowStepsInput, LendingMarket } from '../types';
import { createAaveV3Adapter } from '.';
import type { AaveReadClient } from './reserves';

const POOL = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';
const GATEWAY = '0xa0d9C1E9E48Ca30c8d8C3B5D69FF5dc1f6DFfC24';
const WETH = '0x4200000000000000000000000000000000000006';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
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
  collateral: weth({ asset: WETH }),
  borrow: usdc({ asset: USDC }),
  amount: '{MIN_AMOUNT_OUT}',
  borrowAmount: '1500000000',
  owner: INTERMEDIARY,
  recipient: RECIPIENT,
  ...overrides,
});

const borrowAndSend = [
  {
    to: POOL,
    functionSignature: 'borrow(address,uint256,uint256,uint16,address)',
    parameters: [USDC, '1500000000', '2', '0', INTERMEDIARY],
    value: '0',
  },
  {
    to: USDC,
    functionSignature: 'transfer(address,uint256)',
    parameters: [RECIPIENT, '1500000000'],
    value: '0',
  },
];

describe('Aave V3 buildBorrowSteps', () => {
  it('approves and supplies an ERC-20 collateral, borrows at the variable rate and sends it on', () => {
    expect(adapter.buildBorrowSteps(input())).toEqual([
      {
        to: WETH,
        functionSignature: 'approve(address,uint256)',
        parameters: [POOL, '{MIN_AMOUNT_OUT}'],
        value: '0',
      },
      {
        to: POOL,
        functionSignature: 'supply(address,uint256,address,uint16)',
        parameters: [WETH, '{MIN_AMOUNT_OUT}', INTERMEDIARY, '0'],
        value: '0',
      },
      ...borrowAndSend,
    ]);
  });

  it('supplies natively delivered collateral through the gateway, sent the amount', () => {
    expect(
      adapter.buildBorrowSteps(
        input({ collateral: nativeEth({ asset: WETH }) }),
      ),
    ).toEqual([
      {
        to: GATEWAY,
        functionSignature: 'depositETH(address,address,uint16)',
        parameters: [POOL, INTERMEDIARY, '0'],
        value: '{MIN_AMOUNT_OUT}',
      },
      ...borrowAndSend,
    ]);
  });

  it('reads nothing to build the steps', () => {
    adapter.buildBorrowSteps(input());

    expect(listSupportedTokens).not.toHaveBeenCalled();
    expect(getClient).not.toHaveBeenCalled();
  });

  it("uses the market's own Pool and gateway", () => {
    const steps = adapter.buildBorrowSteps(
      input({
        market: { ...BASE, id: 'aave-v3:arb', chain: 'arb', chainId: 42161 },
        collateral: nativeEth(),
      }),
    );

    expect(steps.map(({ to }) => to)).toEqual([
      '0x5283BEcEd7ADF6D003225C13896E536f2D4264FF',
      '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      USDC,
    ]);
  });

  it('rejects a market it does not serve', () => {
    expect(() =>
      adapter.buildBorrowSteps(
        input({ market: { ...BASE, id: 'aave-v3:eth' } }),
      ),
    ).toThrow('unknown market aave-v3:eth');
  });
});
