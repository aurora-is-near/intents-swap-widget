import { describe, expect, it } from 'vitest';

import {
  createFakeAdapter,
  FAKE_BASE,
  usdc,
  weth,
} from '../../tests/fakeMarkets';
import { type BorrowPlanInput, buildBorrowPlan } from './plan';

const USDC_ARB = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

const input = (overrides: Partial<BorrowPlanInput> = {}): BorrowPlanInput => ({
  adapter: createFakeAdapter(),
  market: FAKE_BASE,
  collateral: weth(),
  borrow: usdc(),
  origin: {
    assetId: 'nep141:arb-usdc',
    chain: 'arb',
    decimals: 6,
    contractAddress: USDC_ARB,
  },
  amount: 3_000_000_000n,
  borrowAmount: 1_500_000_000n,
  ...overrides,
});

describe('buildBorrowPlan', () => {
  it('quotes the paid amount into the collateral, exact input, 1% slippage, deposited from the wallet', () => {
    const plan = buildBorrowPlan(input());

    expect(plan.quote).toEqual({
      originAsset: 'nep141:arb-usdc',
      destinationAsset: 'nep141:weth',
      amount: '3000000000',
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100,
    });
    expect(plan.originChain).toBe('arb');
    expect(plan.originToken).toEqual({
      contractAddress: USDC_ARB,
      decimals: 6,
    });
    expect(plan.depositViaWallet).toBe(true);
    expect(plan.prepared).toBeUndefined();
  });

  it('runs the borrow recipe with the literal borrow amount and the recipient', () => {
    const plan = buildBorrowPlan(input({ recipient: '0xbb' }));

    expect(plan.recipe.intent).toBe('aave_borrow');
    expect(plan.params).toEqual({
      borrowAmount: '1500000000',
      recipient: '0xbb',
    });
  });

  it("runs the market adapter's bridge-in recipe for the pair", () => {
    const adapter = createFakeAdapter();
    const plan = buildBorrowPlan(input({ adapter }));

    expect(adapter.borrowRecipe).toHaveBeenCalledWith({
      market: FAKE_BASE,
      collateral: weth(),
      borrow: usdc(),
      flow: 'bridge-in',
    });
    expect(plan.recipe).toBe(adapter.borrowRecipe.mock.results[0]?.value);
  });

  it('leaves the recipient to the connected wallet when it is empty', () => {
    expect(buildBorrowPlan(input({ recipient: '' })).params.recipient).toBe(
      undefined,
    );
  });

  it('quotes native NEAR as wNEAR', () => {
    const plan = buildBorrowPlan(
      input({
        origin: { assetId: 'native-near', chain: 'near', decimals: 24 },
      }),
    );

    expect(plan.quote.originAsset).toBe('nep141:wrap.near');
    expect(plan.originToken).toEqual({
      contractAddress: undefined,
      decimals: 24,
    });
  });
});
