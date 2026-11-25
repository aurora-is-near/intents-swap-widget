import { describe, expect, it } from 'vitest';

import {
  compileInputs,
  loadDefinition,
  loadFixtures,
} from '../tests/actionHarness';
import {
  type AaveBorrowExecution,
  type AaveBorrowInputs,
  resolveAaveBorrow,
} from './resolve';

const ACTION = 'aave-v3-borrow-v1';

const definition = loadDefinition(ACTION);
const validate = compileInputs<AaveBorrowInputs>(definition);
const fixtures = loadFixtures(ACTION);

/** The asset the steps receive, whose chain the execution runs on. */
const destinationAssetOf = (execution: AaveBorrowExecution): string =>
  'quote' in execution
    ? execution.quote.destinationAsset
    : execution.destinationAsset;

/**
 * What the actions repo's Go catalog returns for one fixture: the execution
 * and its chain, or the error text it would answer with.
 */
const run = (
  input: unknown,
  assetChains: Record<string, string> = {},
):
  | { execution: AaveBorrowExecution; executionChain: string }
  | { error: string } => {
  const validation = validate(input);

  if (!validation.ok) {
    return { error: validation.message };
  }

  const result = resolveAaveBorrow(validation.inputs);

  if ('error' in result) {
    return { error: `invalid action input: ${result.error}` };
  }

  const executionChain = assetChains[destinationAssetOf(result.execution)];

  if (executionChain === undefined) {
    return { error: 'fixture has no chain for the destination asset' };
  }

  if (!definition.supportedChains.includes(executionChain)) {
    return { error: `execution chain ${executionChain} is not supported` };
  }

  return { execution: result.execution, executionChain };
};

describe('aave-v3-borrow fixtures', () => {
  it('has the success and error cases the action promises', () => {
    expect(fixtures.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'base_bridge_in_weth.json',
        'base_bridge_in_eth.json',
        'steps_only.json',
        'arb_usdt_against_weth.json',
        'zero_slippage.json',
        'usdt_on_base.json',
        'wbtc_on_base.json',
        'wbtc_on_arbitrum.json',
        'cbbtc_on_arbitrum.json',
        'usdc_collateral.json',
        'zero_amount.json',
      ]),
    );
  });

  it.each(fixtures)(
    '$name provides exactly one of expected or errorContains',
    ({ fixture }) => {
      expect(fixture.input).toBeTypeOf('object');
      expect(
        (fixture.expected !== undefined) !==
          (fixture.errorContains !== undefined),
      ).toBe(true);
    },
  );

  const successes = fixtures.filter(({ fixture }) => fixture.expected);
  const failures = fixtures.filter(({ fixture }) => fixture.errorContains);

  it.each(successes)('$name: the input is valid', ({ fixture }) => {
    expect(validate(fixture.input)).toMatchObject({ ok: true });
  });

  it.each(successes)('$name resolves to expected', ({ fixture }) => {
    expect(run(fixture.input, fixture.assetChains)).toEqual(fixture.expected);
  });

  it.each(failures)('$name fails with errorContains', ({ fixture }) => {
    const result = run(fixture.input, fixture.assetChains);

    expect(result).toEqual({
      error: expect.stringContaining(fixture.errorContains ?? ''),
    });
  });
});
