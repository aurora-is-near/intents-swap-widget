import { beforeAll, describe, expect, it } from 'vitest';

import {
  compileInputs,
  loadDefinition,
  loadFixtures,
  readActionFile,
} from '../tests/actionHarness';
import { loadStarlarkScript, type StarlarkScript } from '../tests/starlark';
import {
  AAVE_BORROW_ASSETS,
  AAVE_BORROW_CHAINS,
  AAVE_BORROW_INTENT,
  AAVE_BORROW_MARKETS,
  AAVE_COLLATERAL_ASSETS,
  AAVE_MARKET_NAME,
} from './constants';
import {
  type AaveBorrowInputs,
  resolveAaveBorrow,
  ZERO_SLIPPAGE_ERROR,
} from './resolve';

/**
 * `script.star` against its TypeScript twin: the tables read from the
 * script's text, then the script itself run on every fixture and on every
 * table pair. The actions repo's Go `fixtures_test.go` proves the same
 * fixtures again after hand-over.
 */

const ACTION = 'aave-v3-borrow-v1';

const source = readActionFile(ACTION, 'script.star');
const definition = loadDefinition(ACTION);
const validate = compileInputs<AaveBorrowInputs>(definition);
const fixtures = loadFixtures(ACTION);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A top-level `NAME = "..."` constant of the script. */
const stringConstant = (name: string): string | undefined =>
  new RegExp(`^${name} = "([^"\\\\]*)"$`, 'm').exec(source)?.[1];

/**
 * The script's `MARKETS` literal read as JSON: it is written with double
 * quotes, no escapes and no comments, so only Starlark's booleans and
 * trailing commas differ from JSON.
 */
const marketsTable = (): unknown => {
  const literal = /^MARKETS = (\{\n[\s\S]*?\n\})\n/m.exec(source)?.[1];

  if (literal === undefined) {
    throw new Error('script.star has no top-level MARKETS = {...} literal');
  }

  return JSON.parse(
    literal
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/,(\s*[}\]])/g, '$1'),
  );
};

describe('script.star tables', () => {
  it('defines resolve(inputs) after its constants', () => {
    const firstDef = source.search(/^def /m);

    expect(source).toMatch(/^def resolve\(inputs\):$/m);
    expect(source.search(/^MARKETS = \{$/m)).toBeGreaterThanOrEqual(0);
    expect(source.search(/^MARKETS = \{$/m)).toBeLessThan(firstDef);
  });

  it('has the same markets, pools, gateways and tokens as constants.ts', () => {
    expect(marketsTable()).toEqual(AAVE_BORROW_MARKETS);
  });

  it('has the same intent, market name and slippage message', () => {
    expect(stringConstant('INTENT')).toBe(AAVE_BORROW_INTENT);
    expect(stringConstant('MARKET_NAME')).toBe(AAVE_MARKET_NAME);
    expect(stringConstant('ZERO_SLIPPAGE_ERROR')).toBe(ZERO_SLIPPAGE_ERROR);
  });

  it('only offers symbols the input schema allows', () => {
    const { properties } = definition.inputSchema;

    expect(properties.chain?.enum).toEqual([...AAVE_BORROW_CHAINS]);
    expect(properties.borrowAsset?.enum).toEqual([...AAVE_BORROW_ASSETS]);
    expect(properties.collateral?.enum).toEqual([...AAVE_COLLATERAL_ASSETS]);
  });
});

describe('script.star run through starlark-go (WebAssembly)', () => {
  let script: StarlarkScript;

  beforeAll(async () => {
    script = await loadStarlarkScript(source);
  });

  /** As the catalog answers: the schema first, then the script. */
  const resolveLikeCatalog = async (
    input: unknown,
    assetChains: Record<string, string> = {},
  ): Promise<unknown> => {
    const validation = validate(input);

    if (!validation.ok) {
      return { error: validation.message };
    }

    const result: unknown = await script('resolve', validation.inputs);

    if (!isRecord(result)) {
      return { error: 'resolve returned no dictionary' };
    }

    if (typeof result.error === 'string') {
      return { error: `invalid action input: ${result.error}` };
    }

    const { execution } = result;

    if (!isRecord(execution)) {
      return { error: 'resolve returned no execution' };
    }

    // Bridge-in names it in the quote, steps-only at the top level.
    const destination = isRecord(execution.quote)
      ? execution.quote.destinationAsset
      : execution.destinationAsset;

    return {
      execution,
      executionChain: assetChains[String(destination)],
    };
  };

  const successes = fixtures.filter(({ fixture }) => fixture.expected);
  const failures = fixtures.filter(({ fixture }) => fixture.errorContains);

  it('covers every fixture', () => {
    expect(successes.length + failures.length).toBe(fixtures.length);
    expect(successes.length).toBeGreaterThan(0);
    expect(failures.length).toBeGreaterThan(0);
  });

  it.each(successes)('$name resolves to expected', async ({ fixture }) => {
    expect(
      await resolveLikeCatalog(fixture.input, fixture.assetChains),
    ).toEqual(fixture.expected);
  });

  it.each(failures)('$name fails with errorContains', async ({ fixture }) => {
    expect(
      await resolveLikeCatalog(fixture.input, fixture.assetChains),
    ).toEqual({ error: expect.stringContaining(fixture.errorContains ?? '') });
  });

  const base = {
    borrowAmount: '1500000000',
    recipient: '0x1111111111111111111111111111111111111111',
    amount: '10000000000',
  };

  const pairs = AAVE_BORROW_CHAINS.flatMap((chain) =>
    AAVE_BORROW_ASSETS.flatMap((borrowAsset) =>
      AAVE_COLLATERAL_ASSETS.flatMap((collateral) =>
        [
          { originAsset: 'nep141:sol.omft.near' },
          {},
          {
            originAsset: 'nep141:sol.omft.near',
            slippageTolerance: 0,
            deadline: '2026-12-01T00:00:00Z',
            dry: true,
            publicKey: 'ed25519:11111111111111111111111111111111',
          },
          { slippageTolerance: 0, publicKey: 'ed25519:1' },
        ].map((flow) => ({ ...base, chain, borrowAsset, collateral, ...flow })),
      ),
    ),
  );

  it.each(pairs)(
    '$chain $borrowAsset against $collateral (originAsset $originAsset, slippage $slippageTolerance) equals the TypeScript resolver',
    async (input) => {
      const validation = validate(input);

      expect(validation).toMatchObject({ ok: true });

      if (validation.ok) {
        expect(await script('resolve', validation.inputs)).toEqual(
          resolveAaveBorrow(validation.inputs),
        );
      }
    },
  );

  // The schema stops it first; resolve.test.ts holds the twin's message.
  it('rejects a chain outside its tables with the twin message', async () => {
    const inputs = {
      ...base,
      chain: 'eth',
      borrowAsset: 'USDC',
      collateral: 'ETH',
      slippageTolerance: 100,
      dry: false,
      publicKey: '',
    };

    expect(await script('resolve', inputs)).toEqual({
      error: 'Aave V3 is not available on eth.',
    });
  });
});
