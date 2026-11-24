import type { Step } from '@aurora-is-near/intents-connect';
import { describe, expect, it } from 'vitest';

import {
  createFakeAdapter,
  FAKE_BASE,
  nativeEth,
  usdc,
  weth,
} from '../../tests/fakeMarkets';
import { AAVE_BORROW_INTENT, aaveBorrowRecipe } from './recipe';

const INTERMEDIARY = '0x00000000000000000000000000000000000000aa';
const USER = '0x00000000000000000000000000000000000000cc';
const RECIPIENT = '0x00000000000000000000000000000000000000bb';

const STEP: Step = {
  to: '0x0000000000000000000000000000000000000009',
  functionSignature: 'marker()',
  parameters: [],
  value: '0',
};

const setup = (collateral = weth()) => {
  const adapter = createFakeAdapter({ buildBorrowSteps: () => [STEP] });
  const recipe = aaveBorrowRecipe(adapter, FAKE_BASE, collateral, usdc());

  return { adapter, recipe };
};

const ctx = {
  intermediary: INTERMEDIARY,
  userAddress: USER,
  amount: '{MIN_AMOUNT_OUT}',
};

describe('aaveBorrowRecipe', () => {
  it('is an EVM bridge-in filed as aave_borrow', () => {
    const { recipe } = setup();

    expect(AAVE_BORROW_INTENT).toBe('aave_borrow');
    expect(recipe).toMatchObject({
      id: 'aave-borrow:fake:base:WETH:USDC',
      intent: 'aave_borrow',
      title: 'Borrow USDC against WETH on Aave Base',
      flow: 'bridge-in',
      type: 'evm',
    });
  });

  it('delivers the ERC-20 collateral to the market chain', () => {
    expect(setup().recipe.destination).toEqual({
      chain: 'base',
      assetId: 'nep141:weth',
      tokenAddress: '0x0000000000000000000000000000000000000001',
    });
  });

  it('delivers natively delivered collateral as the gas token, with no contract', () => {
    expect(setup(nativeEth()).recipe.destination).toEqual({
      chain: 'base',
      assetId: 'nep141:eth',
      tokenAddress: undefined,
    });
  });

  it('makes the intermediary the owner, sends to the recipient and passes {MIN_AMOUNT_OUT} through untouched', () => {
    const { adapter, recipe } = setup();

    const steps = recipe.buildSteps(ctx, {
      borrowAmount: '1500000000',
      recipient: RECIPIENT,
    });

    expect(steps).toEqual([STEP]);
    expect(adapter.buildBorrowSteps).toHaveBeenCalledWith({
      market: FAKE_BASE,
      collateral: weth(),
      borrow: usdc(),
      amount: '{MIN_AMOUNT_OUT}',
      borrowAmount: '1500000000',
      owner: INTERMEDIARY,
      recipient: RECIPIENT,
    });
  });

  it('sends to the connected wallet when no recipient is given', () => {
    const { adapter, recipe } = setup();

    recipe.buildSteps(ctx, { borrowAmount: '1' });

    expect(adapter.buildBorrowSteps).toHaveBeenCalledWith(
      expect.objectContaining({ owner: INTERMEDIARY, recipient: USER }),
    );
  });

  it('passes a literal amount through as it is', () => {
    const { adapter, recipe } = setup();

    recipe.buildSteps({ ...ctx, amount: '987654321' }, { borrowAmount: '1' });

    expect(adapter.buildBorrowSteps).toHaveBeenCalledWith(
      expect.objectContaining({ amount: '987654321' }),
    );
  });
});
