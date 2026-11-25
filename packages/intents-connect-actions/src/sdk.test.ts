import { readFileSync } from 'node:fs';

import type { StepContext } from '@aurora-is-near/intents-connect';
import { describe, expect, it } from 'vitest';

import { AAVE_BORROW_INTENT, aaveBorrowRecipe } from './sdk';

const BASE_POOL = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';
const BASE_GATEWAY = '0xa0d9C1E9E48Ca30c8d8C3B5D69FF5dc1f6DFfC24';
const BASE_CBBTC = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const ARB_POOL = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
const ARB_GATEWAY = '0x5283BEcEd7ADF6D003225C13896E536f2D4264FF';
const ARB_USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const INTERMEDIARY = '0x00000000000000000000000000000000000000aa';
const RECIPIENT = '0x00000000000000000000000000000000000000bb';
const USER = '0x00000000000000000000000000000000000000cc';

const ctx: StepContext = {
  intermediary: INTERMEDIARY,
  userAddress: USER,
  amount: '{MIN_AMOUNT_OUT}',
};

const PARAMS = { borrowAmount: '1500000000', recipient: RECIPIENT };

/** The steps' calls, without the metadata the action adds. */
const callsOf = (
  steps: ReturnType<ReturnType<typeof aaveBorrowRecipe>['buildSteps']>,
) => steps.map(({ metadata: _, ...call }) => call);

const borrowAndSend = (pool: string, asset: string) => [
  {
    to: pool,
    functionSignature: 'borrow(address,uint256,uint256,uint16,address)',
    parameters: [asset, '1500000000', '2', '0', INTERMEDIARY],
    value: '0',
  },
  {
    to: asset,
    functionSignature: 'transfer(address,uint256)',
    parameters: [RECIPIENT, '1500000000'],
    value: '0',
  },
];

describe('aaveBorrowRecipe', () => {
  it('is an EVM bridge-in filed as aave_borrow under the Borrow app’s id and title', () => {
    expect(AAVE_BORROW_INTENT).toBe('aave_borrow');
    expect(
      aaveBorrowRecipe({
        chain: 'base',
        collateral: 'cbBTC',
        borrowAsset: 'USDC',
      }),
    ).toMatchObject({
      id: 'aave-borrow:aave-v3:base:cbBTC:USDC',
      intent: 'aave_borrow',
      title: 'Borrow USDC against cbBTC on Aave Base',
      flow: 'bridge-in',
      type: 'evm',
    });
  });

  it('names a token as 1Click lists it: Arbitrum’s USDT is USDT0', () => {
    expect(
      aaveBorrowRecipe({
        chain: 'arb',
        collateral: 'ETH',
        borrowAsset: 'USDT',
      }),
    ).toMatchObject({
      id: 'aave-borrow:aave-v3:arb:ETH:USDT0',
      title: 'Borrow USDT0 against ETH on Aave Arbitrum',
    });
  });

  it('delivers ERC-20 collateral to its contract on the chain', () => {
    expect(
      aaveBorrowRecipe({
        chain: 'base',
        collateral: 'cbBTC',
        borrowAsset: 'USDC',
      }).destination,
    ).toEqual({
      chain: 'base',
      assetId:
        'nep141:base-0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf.omft.near',
      tokenAddress: BASE_CBBTC,
    });
  });

  it('delivers native collateral as the gas token, with no contract', () => {
    expect(
      aaveBorrowRecipe({ chain: 'arb', collateral: 'ETH', borrowAsset: 'USDC' })
        .destination,
    ).toEqual({
      chain: 'arb',
      assetId: 'nep141:arb.omft.near',
      tokenAddress: undefined,
    });
  });

  it('can be a steps-only recipe', () => {
    expect(
      aaveBorrowRecipe({
        chain: 'base',
        collateral: 'cbBTC',
        borrowAsset: 'USDC',
        flow: 'steps-only',
      }).flow,
    ).toBe('steps-only');
  });

  it('approves and supplies ERC-20 collateral for the intermediary, borrows at the variable rate and sends it on', () => {
    const recipe = aaveBorrowRecipe({
      chain: 'base',
      collateral: 'cbBTC',
      borrowAsset: 'USDC',
    });

    expect(callsOf(recipe.buildSteps(ctx, PARAMS))).toEqual([
      {
        to: BASE_CBBTC,
        functionSignature: 'approve(address,uint256)',
        parameters: [BASE_POOL, '{MIN_AMOUNT_OUT}'],
        value: '0',
      },
      {
        to: BASE_POOL,
        functionSignature: 'supply(address,uint256,address,uint16)',
        parameters: [BASE_CBBTC, '{MIN_AMOUNT_OUT}', INTERMEDIARY, '0'],
        value: '0',
      },
      ...borrowAndSend(BASE_POOL, BASE_USDC),
    ]);
  });

  it('supplies native collateral through the gateway, sent the amount', () => {
    const recipe = aaveBorrowRecipe({
      chain: 'base',
      collateral: 'ETH',
      borrowAsset: 'USDC',
    });

    expect(callsOf(recipe.buildSteps(ctx, PARAMS))).toEqual([
      {
        to: BASE_GATEWAY,
        functionSignature: 'depositETH(address,address,uint16)',
        parameters: [BASE_POOL, INTERMEDIARY, '0'],
        value: '{MIN_AMOUNT_OUT}',
      },
      ...borrowAndSend(BASE_POOL, BASE_USDC),
    ]);
  });

  it('uses the chain’s own Pool and gateway', () => {
    const recipe = aaveBorrowRecipe({
      chain: 'arb',
      collateral: 'ETH',
      borrowAsset: 'USDC',
    });

    expect(recipe.buildSteps(ctx, PARAMS).map(({ to }) => to)).toEqual([
      ARB_GATEWAY,
      ARB_POOL,
      ARB_USDC,
    ]);
  });

  it('passes a literal amount through as it is', () => {
    const recipe = aaveBorrowRecipe({
      chain: 'base',
      collateral: 'ETH',
      borrowAsset: 'USDC',
    });

    const [deposit] = recipe.buildSteps(
      { ...ctx, amount: '987654321' },
      PARAMS,
    );

    expect(deposit?.value).toBe('987654321');
  });

  it('sends to the connected wallet when no recipient is given', () => {
    const recipe = aaveBorrowRecipe({
      chain: 'base',
      collateral: 'cbBTC',
      borrowAsset: 'USDC',
    });

    const steps = recipe.buildSteps(ctx, { borrowAmount: '1' });

    expect(steps.at(-1)?.parameters).toEqual([USER, '1']);
  });

  it('gives every step a name and a description', () => {
    aaveBorrowRecipe({
      chain: 'base',
      collateral: 'cbBTC',
      borrowAsset: 'USDC',
    })
      .buildSteps(ctx, PARAMS)
      .forEach((step) => {
        expect(step.metadata).toEqual({
          name: expect.stringMatching(/\S/),
          description: expect.stringMatching(/\S/),
        });
      });
  });

  it('throws for a symbol the chain lacks', () => {
    expect(() =>
      aaveBorrowRecipe({
        chain: 'base',
        collateral: 'cbBTC',
        borrowAsset: 'USDT',
      }),
    ).toThrow('aave-v3-borrow: USDT cannot be borrowed on Base');
  });
});

describe('package entries', () => {
  const source = (path: string) =>
    readFileSync(new URL(path, import.meta.url), 'utf8');

  it.each([
    './index.ts',
    './aaveBorrow/constants.ts',
    './aaveBorrow/resolve.ts',
  ])('%s imports nothing from the SDK', (path) => {
    expect(source(path)).not.toMatch(
      /['"]@aurora-is-near\/intents-connect(\/[^'"]*)?['"]/,
    );
  });

  it('keeps the recipe out of the main entry', () => {
    expect(source('./index.ts')).not.toMatch(/sdk/);
  });
});
