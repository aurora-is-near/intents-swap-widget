import { describe, expect, it } from 'vitest';
import { decodeFunctionData, encodeFunctionData, parseAbi } from 'viem';
import type { Token } from '@aurora-is-near/intents-swap-widget';

import { aaveSupplyRecipe, DEST_ASSET, POOL, USDC } from './constants';
import { buildAavePlan } from './plan';

const owner = '0x0000000000000000000000000000000000000001';
const intermediary = '0x0000000000000000000000000000000000000002';

describe('Aave supply', () => {
  it('preserves the fee-adjusted amount placeholder and gives the wallet the receipt', () => {
    const steps = aaveSupplyRecipe.buildSteps({
      userAddress: owner,
      intermediary,
      amount: '{MIN_AMOUNT_OUT}',
    });

    expect(steps[0]).toMatchObject({
      to: USDC,
      parameters: [POOL, '{MIN_AMOUNT_OUT}'],
    });
    expect(steps[1]).toMatchObject({
      to: POOL,
      parameters: [USDC, '{MIN_AMOUNT_OUT}', owner, '0'],
      value: '0',
    });

    // Exercise the ABI boundary after the service substitutes the net amount.
    const supply = steps[1]!;

    if (!('functionSignature' in supply)) {
      throw new Error('Expected an EVM supply step');
    }

    const signatures: string[] = [`function ${supply.functionSignature}`];
    const abi = parseAbi(signatures);
    const args = (supply.parameters as string[]).map((value) =>
      value === '{MIN_AMOUNT_OUT}' ? '25000000' : value,
    );

    const encoded = encodeFunctionData({ abi, functionName: 'supply', args });

    expect(decodeFunctionData({ abi, data: encoded }).args).toEqual([
      USDC,
      25000000n,
      owner,
      0,
    ]);
  });

  it.each([true, false])(
    'keeps origin units and deposit mode (%s) when bridging to Monad USDC',
    async (depositViaWallet) => {
      const token = {
        assetId: 'nep141:base.omft.near',
        blockchain: 'base',
        decimals: 18,
      } as Token;

      const plan = await buildAavePlan({
        token,
        amountAtomic: '10000000000000000',
        depositViaWallet,
      });

      expect(plan.quote).toMatchObject({
        originAsset: token.assetId,
        destinationAsset: DEST_ASSET,
        amount: '10000000000000000',
        swapType: 'EXACT_INPUT',
      });
      expect(plan.quote.recipient).toBeUndefined();
      expect(plan.originChainId).toBe(8453);
      expect(plan.originToken?.decimals).toBe(18);
      expect(plan.depositViaWallet).toBe(depositViaWallet);
      expect(plan.recipe.destination).toMatchObject({
        chain: 'monad',
        tokenAddress: USDC,
      });
    },
  );
});
