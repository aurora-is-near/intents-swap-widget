import { describe, expect, it } from 'vitest';

import { AAVE_BORROW_INTENT, AAVE_BORROW_MARKETS } from './constants';
import {
  type AaveBorrowInputs,
  buildAaveBorrowSteps,
  lookupAaveBorrowPair,
  resolveAaveBorrow,
  ZERO_SLIPPAGE_ERROR,
} from './resolve';

const BASE_POOL = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';
const BASE_GATEWAY = '0xa0d9C1E9E48Ca30c8d8C3B5D69FF5dc1f6DFfC24';
const BASE_WETH = '0x4200000000000000000000000000000000000006';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const ARB_POOL = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
const ARB_GATEWAY = '0x5283BEcEd7ADF6D003225C13896E536f2D4264FF';
const ARB_USDC_NATIVE = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const ARB_USDC_E = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8';
const INTERMEDIARY = '0x00000000000000000000000000000000000000aa';
const RECIPIENT = '0x00000000000000000000000000000000000000bb';

const INPUTS: AaveBorrowInputs = {
  chain: 'base',
  borrowAsset: 'USDC',
  collateral: 'WETH',
  borrowAmount: '1500000000',
  recipient: RECIPIENT,
  amount: '10000000000',
  originAsset: 'nep141:sol.omft.near',
  slippageTolerance: 100,
  dry: false,
  publicKey: '',
};

/** The calls of the step, without the metadata the action adds. */
const calls = (steps: ReturnType<typeof buildAaveBorrowSteps>) =>
  steps.map(({ metadata: _, ...call }) => call);

/**
 * The calls the Borrow app sent before its steps came from this action (its
 * `recipe.golden.json` pins them for every pair): borrow and send after the
 * supply.
 */
const borrowAndSend = (pool: string, asset: string, amount: string) => [
  {
    to: pool,
    functionSignature: 'borrow(address,uint256,uint256,uint16,address)',
    parameters: [asset, amount, '2', '0', INTERMEDIARY],
    value: '0',
  },
  {
    to: asset,
    functionSignature: 'transfer(address,uint256)',
    parameters: [RECIPIENT, amount],
    value: '0',
  },
];

describe('buildAaveBorrowSteps', () => {
  const input = {
    chain: 'base',
    collateral: 'WETH',
    borrowAsset: 'USDC',
    collateralAmount: '{MIN_AMOUNT_OUT}',
    borrowAmount: '1500000000',
    owner: INTERMEDIARY,
    recipient: RECIPIENT,
  } as const;

  it('approves and supplies ERC-20 collateral, borrows and sends: the app’s calls', () => {
    expect(calls(buildAaveBorrowSteps(input))).toEqual([
      {
        to: BASE_WETH,
        functionSignature: 'approve(address,uint256)',
        parameters: [BASE_POOL, '{MIN_AMOUNT_OUT}'],
        value: '0',
      },
      {
        to: BASE_POOL,
        functionSignature: 'supply(address,uint256,address,uint16)',
        parameters: [BASE_WETH, '{MIN_AMOUNT_OUT}', INTERMEDIARY, '0'],
        value: '0',
      },
      ...borrowAndSend(BASE_POOL, BASE_USDC, '1500000000'),
    ]);
  });

  it('supplies native ETH through the gateway with the amount as value', () => {
    expect(
      calls(
        buildAaveBorrowSteps({
          ...input,
          collateral: 'ETH',
          collateralAmount: '420000000000000000',
        }),
      ),
    ).toEqual([
      {
        to: BASE_GATEWAY,
        functionSignature: 'depositETH(address,address,uint16)',
        parameters: [BASE_POOL, INTERMEDIARY, '0'],
        value: '420000000000000000',
      },
      ...borrowAndSend(BASE_POOL, BASE_USDC, '1500000000'),
    ]);
  });

  it('uses the Arbitrum Pool, gateway and native USDC on arb', () => {
    const steps = buildAaveBorrowSteps({
      ...input,
      chain: 'arb',
      collateral: 'ETH',
    });

    expect(calls(steps)).toEqual([
      {
        to: ARB_GATEWAY,
        functionSignature: 'depositETH(address,address,uint16)',
        parameters: [ARB_POOL, INTERMEDIARY, '0'],
        value: '{MIN_AMOUNT_OUT}',
      },
      ...borrowAndSend(ARB_POOL, ARB_USDC_NATIVE, '1500000000'),
    ]);
  });

  it('gives every step a name and a description', () => {
    buildAaveBorrowSteps(input).forEach((step) => {
      expect(step.metadata).toEqual({
        name: expect.stringMatching(/\S/),
        description: expect.stringMatching(/\S/),
      });
    });
  });

  it('throws for a symbol the chain lacks', () => {
    expect(() =>
      buildAaveBorrowSteps({ ...input, borrowAsset: 'USDT' }),
    ).toThrow('aave-v3-borrow: USDT cannot be borrowed on Base');
  });
});

describe('lookupAaveBorrowPair', () => {
  it('takes Arbitrum’s native USDC, not USDC.e', () => {
    const pair = lookupAaveBorrowPair('arb', 'WETH', 'USDC');

    expect(pair).toMatchObject({ borrow: { address: ARB_USDC_NATIVE } });
    expect(JSON.stringify(AAVE_BORROW_MARKETS).toLowerCase()).not.toContain(
      ARB_USDC_E.toLowerCase(),
    );
  });

  it('has no USDT to borrow on Base', () => {
    expect(AAVE_BORROW_MARKETS.base.borrow.USDT).toBeUndefined();
    expect(lookupAaveBorrowPair('base', 'WETH', 'USDT')).toEqual({
      error: 'USDT cannot be borrowed on Base. Choose one of: USDC.',
    });
  });

  it('has no cbBTC collateral on Arbitrum', () => {
    expect(lookupAaveBorrowPair('arb', 'cbBTC', 'USDC')).toEqual({
      error:
        'cbBTC cannot be supplied as collateral on Arbitrum. Choose one of: ETH, WETH.',
    });
  });

  it('offers no USDC collateral on either chain (Aave LTV 0)', () => {
    expect(AAVE_BORROW_MARKETS.base.collateral).not.toHaveProperty('USDC');
    expect(AAVE_BORROW_MARKETS.arb.collateral).not.toHaveProperty('USDC');
  });

  it('rejects a chain it has no table for', () => {
    // A TypeScript caller that skipped the schema.
    const chain = JSON.parse('"eth"') as 'base';

    expect(lookupAaveBorrowPair(chain, 'WETH', 'USDC')).toEqual({
      error: 'Aave V3 is not available on eth.',
    });
  });
});

describe('resolveAaveBorrow', () => {
  it('passes originAsset through untouched', () => {
    const originAsset = 'nep245:v2_1.omni.hot.tg:56_11111111111111111111';
    const result = resolveAaveBorrow({ ...INPUTS, originAsset });

    expect(result).toMatchObject({ execution: { quote: { originAsset } } });
  });

  it('files the borrow as aave_borrow with the app’s title', () => {
    expect(resolveAaveBorrow(INPUTS)).toMatchObject({
      execution: {
        metadata: {
          intent: AAVE_BORROW_INTENT,
          title: 'Borrow USDC against WETH on Aave Base',
        },
      },
    });
  });

  it('copies publicKey only when set', () => {
    const publicKey = 'ed25519:4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi';

    expect(resolveAaveBorrow({ ...INPUTS, publicKey })).toMatchObject({
      execution: { publicKey },
    });
    expect(resolveAaveBorrow(INPUTS)).not.toHaveProperty('execution.publicKey');
  });

  it('copies deadline only when set', () => {
    const deadline = '2026-12-01T00:00:00Z';

    expect(resolveAaveBorrow({ ...INPUTS, deadline })).toMatchObject({
      execution: { quote: { deadline } },
    });
    expect(resolveAaveBorrow(INPUTS)).not.toHaveProperty(
      'execution.quote.deadline',
    );
  });

  it('rejects zero slippage on a bridge-in', () => {
    expect(resolveAaveBorrow({ ...INPUTS, slippageTolerance: 0 })).toEqual({
      error: ZERO_SLIPPAGE_ERROR,
    });
  });

  it('builds a steps-only body from the literal amount without originAsset', () => {
    const { originAsset: _, ...stepsOnly } = INPUTS;
    const result = resolveAaveBorrow({ ...stepsOnly, slippageTolerance: 0 });

    expect(result).toEqual({
      execution: expect.objectContaining({
        destinationAsset:
          'nep141:base-0x4200000000000000000000000000000000000006.omft.near',
      }),
    });
    expect(result).not.toHaveProperty('execution.quote');
    expect(result).not.toHaveProperty('execution.outOperation');
    expect(result).toMatchObject({
      execution: {
        steps: [
          { parameters: [BASE_POOL, '10000000000'] },
          { parameters: [BASE_WETH, '10000000000', '{INTERMEDIARY}', '0'] },
          {},
          {},
        ],
      },
    });
  });

  it('returns the lookup error for a pair the chain lacks', () => {
    expect(
      resolveAaveBorrow({ ...INPUTS, chain: 'arb', collateral: 'cbBTC' }),
    ).toEqual({
      error:
        'cbBTC cannot be supplied as collateral on Arbitrum. Choose one of: ETH, WETH.',
    });
  });
});
