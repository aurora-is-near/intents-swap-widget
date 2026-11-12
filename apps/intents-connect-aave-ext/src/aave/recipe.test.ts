import { describe, expect, it } from 'vitest';

import { getAaveMarket } from './markets';
import { buildAaveStepsPlan } from './recipe';

const BASE = getAaveMarket('proto_base_v3')!;
const OWNER = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const ctx = {
  intermediary: '0x1111111111111111111111111111111111111111',
  userAddress: OWNER,
};

describe('buildAaveStepsPlan', () => {
  it('supplies what waits, its fee taken from the token supplied', () => {
    const plan = buildAaveStepsPlan(
      BASE,
      OWNER,
    )({
      option: {
        id: USDC,
        symbol: 'USDC',
        chain: 'base',
        tokenAddress: USDC,
        decimals: 6,
      },
      destinationAsset: 'nep141:base-usdc',
      amount: '9830000',
    });

    expect(plan).toMatchObject({
      amount: '9830000',
      feeFromAmount: true,
      recipe: {
        flow: 'steps-only',
        type: 'evm',
        destination: {
          chain: 'base',
          assetId: 'nep141:base-usdc',
          tokenAddress: USDC,
        },
      },
    });

    // The same steps as a bridged supply: approve the Pool, supply for the owner.
    expect(
      plan.recipe.buildSteps({ ...ctx, amount: '9800000' }, undefined),
    ).toEqual([
      expect.objectContaining({
        to: USDC,
        functionSignature: 'approve(address,uint256)',
        parameters: [BASE.pool, '9800000'],
      }),
      expect.objectContaining({
        to: BASE.pool,
        functionSignature: 'supply(address,uint256,address,uint16)',
        parameters: [USDC, '9800000', OWNER, '0'],
      }),
    ]);
  });

  it('supplies the native token through the gateway', () => {
    const plan = buildAaveStepsPlan(
      BASE,
      OWNER,
    )({
      option: { id: 'eth', symbol: 'ETH', chain: 'base', decimals: 18 },
      destinationAsset: 'nep141:base.omft.near',
      amount: '1000000000000000',
    });

    expect(
      plan.recipe.buildSteps({ ...ctx, amount: '990000000000000' }, undefined),
    ).toEqual([
      expect.objectContaining({
        to: BASE.native!.gateway,
        functionSignature: 'depositETH(address,address,uint16)',
        parameters: [BASE.pool, OWNER, '0'],
        value: '990000000000000',
      }),
    ]);
  });
});
