import { describe, expect, it } from 'vitest';

import {
  compileInputs,
  loadDefinition,
  readActionFile,
} from '../tests/actionHarness';
import {
  AAVE_BORROW_ASSETS,
  AAVE_BORROW_CHAINS,
  AAVE_BORROW_MARKETS,
  AAVE_COLLATERAL_ASSETS,
} from './constants';
import type { AaveBorrowInputs } from './resolve';

const ACTION = 'aave-v3-borrow-v1';
const definition = loadDefinition(ACTION);
const validate = compileInputs<AaveBorrowInputs>(definition);

const VALID = {
  chain: 'base',
  borrowAsset: 'USDC',
  collateral: 'WETH',
  borrowAmount: '1500000000',
  recipient: '0x1111111111111111111111111111111111111111',
  amount: '10000000000',
  originAsset: 'nep141:sol.omft.near',
};

const rejection = (input: Record<string, unknown>) => {
  const result = validate(input);

  return result.ok ? undefined : result.message;
};

describe('aave-v3-borrow definition', () => {
  it('is the v1 starlark action on Base and Arbitrum', () => {
    expect(definition).toMatchObject({
      id: 'aave-v3-borrow',
      version: 1,
      templateFormat: 'starlark',
      supportedChains: ['base', 'arb'],
      inputSchema: { type: 'object', additionalProperties: false },
    });
  });

  it('keeps definition.json and meta.json in the bundled actions’ layout', () => {
    // The action hash covers definition.json's exact bytes: a formatter
    // collapsing its arrays would change it. 2-space JSON, expanded arrays,
    // a final newline, as in the actions repo.
    ['definition.json', 'meta.json'].forEach((file) => {
      const raw = readActionFile(ACTION, file);

      expect(raw).toBe(`${JSON.stringify(JSON.parse(raw), null, 2)}\n`);
    });
  });

  it('has a display name, description and tags in meta.json', () => {
    expect(JSON.parse(readActionFile(ACTION, 'meta.json'))).toEqual({
      name: expect.any(String),
      description: expect.any(String),
      tags: [],
    });
  });

  it('offers exactly the chains and symbols the tables hold', () => {
    const { properties } = definition.inputSchema;
    const markets = Object.values(AAVE_BORROW_MARKETS);
    const symbolsOf = (side: 'borrow' | 'collateral') =>
      new Set(markets.flatMap((market) => Object.keys(market[side])));

    expect(definition.supportedChains).toEqual([...AAVE_BORROW_CHAINS]);
    expect(properties.chain?.enum).toEqual([...AAVE_BORROW_CHAINS]);
    expect(properties.borrowAsset?.enum).toEqual([...AAVE_BORROW_ASSETS]);
    expect(properties.collateral?.enum).toEqual([...AAVE_COLLATERAL_ASSETS]);
    expect(new Set(AAVE_BORROW_ASSETS)).toEqual(symbolsOf('borrow'));
    expect(new Set(AAVE_COLLATERAL_ASSETS)).toEqual(symbolsOf('collateral'));
  });
});

describe('aave-v3-borrow inputs', () => {
  it('applies the defaults to omitted keys', () => {
    expect(validate(VALID)).toEqual({
      ok: true,
      inputs: { ...VALID, slippageTolerance: 100, dry: false, publicKey: '' },
    });
  });

  it('accepts the steps-only shape (no originAsset)', () => {
    const { originAsset: _, ...stepsOnly } = VALID;

    expect(validate(stepsOnly)).toMatchObject({ ok: true });
  });

  it('accepts any non-empty originAsset as given', () => {
    const originAsset = 'not-a-1click-id:Whatever/?#';

    expect(validate({ ...VALID, originAsset })).toMatchObject({
      ok: true,
      inputs: { originAsset },
    });
  });

  it.each([
    ['a short recipient', { recipient: '0x1234' }, '/recipient'],
    [
      'a non-hex recipient',
      { recipient: '0xZZZZ111111111111111111111111111111111111' },
      '/recipient',
    ],
    ['a zero amount', { amount: '0' }, '/amount'],
    ['a leading-zero amount', { amount: '0100' }, '/amount'],
    ['a decimal amount', { amount: '1.5' }, '/amount'],
    ['a non-numeric amount', { amount: 'ten' }, '/amount'],
    ['a numeric (not string) amount', { amount: 100 }, '/amount'],
    ['a zero borrowAmount', { borrowAmount: '0' }, '/borrowAmount'],
    ['a non-numeric borrowAmount', { borrowAmount: '1e6' }, '/borrowAmount'],
    ['an unknown chain', { chain: 'eth' }, '/chain'],
    ['an unknown borrow symbol', { borrowAsset: 'DAI' }, '/borrowAsset'],
    ['an unknown collateral symbol', { collateral: 'wstETH' }, '/collateral'],
    ['a dropped collateral symbol', { collateral: 'WBTC' }, '/collateral'],
    ['USDC as collateral (Aave LTV 0)', { collateral: 'USDC' }, '/collateral'],
    ['a lower-case symbol', { borrowAsset: 'usdc' }, '/borrowAsset'],
    ['an empty originAsset', { originAsset: '' }, '/originAsset'],
    ['a negative slippage', { slippageTolerance: -1 }, '/slippageTolerance'],
    [
      'a slippage above 100%',
      { slippageTolerance: 10001 },
      '/slippageTolerance',
    ],
    ['a fractional slippage', { slippageTolerance: 1.5 }, '/slippageTolerance'],
    ['a non-date deadline', { deadline: 'tomorrow' }, '/deadline'],
    ['a non-boolean dry', { dry: 'yes' }, '/dry'],
  ])('rejects %s', (_, override, path) => {
    expect(rejection({ ...VALID, ...override })).toContain(`at '${path}'`);
  });

  it('rejects an extra property', () => {
    expect(rejection({ ...VALID, pools: ['0x00'] })).toContain(
      "additional properties 'pools'",
    );
  });

  it.each([
    'chain',
    'borrowAsset',
    'collateral',
    'borrowAmount',
    'recipient',
    'amount',
  ])('requires %s', (key) => {
    const { [key as keyof typeof VALID]: _, ...rest } = VALID;

    expect(rejection(rest)).toContain(`'${key}'`);
  });
});
