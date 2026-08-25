import { describe, expect, it, vi } from 'vitest';

import { type GuardCode, GuardError } from '@/errors';
import type { Execution, Step } from '@/types/execution';
import * as guards from '@/machine/guards/index';

const expectGuard = (code: GuardCode, run: () => unknown) => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(GuardError);
    expect((error as GuardError).code).toBe(code);

    return;
  }

  throw new Error(
    `expected a GuardError with code ${code}, but none was thrown`,
  );
};

const step = (overrides: Partial<Step> = {}): Step => ({
  to: '0xToken',
  functionSignature: 'approve(address,uint256)',
  parameters: ['0xPool', '100'],
  value: '0',
  ...overrides,
});

const execution = (overrides: Partial<Execution> = {}): Execution =>
  ({
    id: 'exec-1',
    status: 'CREATED',
    quote: {
      amount: '1000',
      amountIn: '1000',
      amountOut: '950',
      minAmountOut: '900',
      depositAddress: 'deposit-addr',
      depositMemo: null,
    },
    details: { intermediaryAddress: '0xIntermediary' },
    steps: [],
    ...overrides,
  }) as Execution;

describe('stepsRequiredForRealCreate', () => {
  it('allows an empty steps array on a dry round', () => {
    expect(() => guards.stepsRequiredForRealCreate([], true)).not.toThrow();
  });

  it('rejects an empty steps array on a real create', () => {
    expectGuard('STEPS_REQUIRED', () =>
      guards.stepsRequiredForRealCreate([], false),
    );
  });
});

describe('round1MustBeStepless', () => {
  it('allows no steps', () => {
    expect(() => guards.round1MustBeStepless([])).not.toThrow();
  });

  it('rejects steps in round 1', () => {
    expectGuard('ROUND1_MUST_BE_STEPLESS', () =>
      guards.round1MustBeStepless([step()]),
    );
  });
});

describe('stepShapeIsLegal', () => {
  it('accepts the five documented keys', () => {
    expect(() =>
      guards.stepShapeIsLegal([step({ metadata: { name: 'x' } })], 'evm'),
    ).not.toThrow();
  });

  it('rejects an unknown key', () => {
    expectGuard('ILLEGAL_STEP_SHAPE', () =>
      guards.stepShapeIsLegal(
        [{ ...step(), gas: '1' } as unknown as Step],
        'evm',
      ),
    );
  });

  it('rejects more than 30 EVM steps', () => {
    expectGuard('ILLEGAL_STEP_SHAPE', () =>
      guards.stepShapeIsLegal(
        Array.from({ length: 31 }, () => step()),
        'evm',
      ),
    );
  });
});

describe('destinationTokenIsTouched', () => {
  it('exempts a native destination', () => {
    expect(() =>
      guards.destinationTokenIsTouched([step({ to: '0xPool' })], undefined),
    ).not.toThrow();
  });

  it('accepts a case-insensitive match on the destination token', () => {
    expect(() =>
      guards.destinationTokenIsTouched([step({ to: '0xTOKEN' })], '0xtoken'),
    ).not.toThrow();
  });

  it('rejects a step set that never calls the destination token', () => {
    expectGuard('DESTINATION_TOKEN_UNTOUCHED', () =>
      guards.destinationTokenIsTouched([step({ to: '0xPool' })], '0xToken'),
    );
  });
});

describe('recipientOnlyOnOutOperation', () => {
  it('allows no recipient on a bridge-in', () => {
    expect(() =>
      guards.recipientOnlyOnOutOperation('bridge-in', undefined),
    ).not.toThrow();
  });

  it('rejects a recipient on a bridge-in', () => {
    expectGuard('RECIPIENT_NOT_ALLOWED', () =>
      guards.recipientOnlyOnOutOperation('bridge-in', '0xUser'),
    );
  });
});

describe('strategiesAreExclusive', () => {
  const placeholderStep = step({ parameters: ['0xPool', '{MIN_AMOUNT_OUT}'] });

  it('accepts a placeholder strategy that uses the placeholder', () => {
    expect(() =>
      guards.strategiesAreExclusive({ kind: 'placeholder' }, [placeholderStep]),
    ).not.toThrow();
  });

  it('accepts a threeRound strategy with literal amounts', () => {
    expect(() =>
      guards.strategiesAreExclusive({ kind: 'threeRound' }, [step()]),
    ).not.toThrow();
  });

  it('allows a placeholder strategy whose recipe ignored the amount', () => {
    // A recipe may legitimately never interpolate ctx.amount (a bare claim(), or
    // deliberately fixed amounts). The runner warns; the guard must not block it.
    expect(() =>
      guards.strategiesAreExclusive({ kind: 'placeholder' }, [step()]),
    ).not.toThrow();
  });

  it('reports whether the steps embed the placeholder', () => {
    expect(guards.stepsUsePlaceholder([placeholderStep])).toBe(true);
    expect(guards.stepsUsePlaceholder([step()])).toBe(false);
  });

  it('rejects a threeRound strategy that leaks the placeholder', () => {
    expectGuard('STRATEGY_CONFLICT', () =>
      guards.strategiesAreExclusive({ kind: 'threeRound' }, [placeholderStep]),
    );
  });
});

describe('feeMustBeEstimated', () => {
  it('returns the fee when present', () => {
    const fee = guards.feeMustBeEstimated(
      execution({ details: { intermediaryAddress: '0x1', networkFee: '70' } }),
    );

    expect(fee).toBe('70');
  });

  it('rejects a response with no networkFee, because amounts are still gross', () => {
    expectGuard('FEE_NOT_ESTIMATED', () =>
      guards.feeMustBeEstimated(execution()),
    );
  });
});

describe('amountMustExceedFee', () => {
  it('allows a fee below the delivered amount', () => {
    expect(() => guards.amountMustExceedFee('1000', '70')).not.toThrow();
  });

  it('rejects a fee equal to the delivered amount', () => {
    expectGuard('FEE_EXCEEDS_AMOUNT', () =>
      guards.amountMustExceedFee('70', '70'),
    );
  });
});

describe('quoteMustNotHaveMoved', () => {
  it('allows a guarantee at or above the baked amount', () => {
    expect(() => guards.quoteMustNotHaveMoved('87125', '87125')).not.toThrow();
    expect(() => guards.quoteMustNotHaveMoved('87125', '90000')).not.toThrow();
  });

  it('rejects a guarantee below the baked amount', () => {
    expectGuard('QUOTE_MOVED', () =>
      guards.quoteMustNotHaveMoved('87125', '80000'),
    );
  });
});

describe('mustHaveSigningPayload', () => {
  it('returns the payload and standard', () => {
    const result = guards.mustHaveSigningPayload(
      execution({
        details: {
          intermediaryAddress: '0x1',
          signingStandard: 'erc191',
          payload: {
            standard: 'erc191',
            payload_json: '{}',
            payload_bytes_base64: 'e30=',
          },
        },
      }),
    );

    expect(result.standard).toBe('erc191');
  });

  it('rejects an execution with no payload', () => {
    expectGuard('NO_SIGNING_PAYLOAD', () =>
      guards.mustHaveSigningPayload(execution()),
    );
  });
});

describe('publicKeyMatchesStandard', () => {
  it('accepts ed25519 with a public key', () => {
    expect(() =>
      guards.publicKeyMatchesStandard('raw_ed25519', 'ed25519:abc'),
    ).not.toThrow();
  });

  it('accepts secp256k1 without a public key', () => {
    expect(() =>
      guards.publicKeyMatchesStandard('erc191', undefined),
    ).not.toThrow();
  });

  it('rejects ed25519 without a public key', () => {
    expectGuard('PUBLIC_KEY_MISMATCH', () =>
      guards.publicKeyMatchesStandard('sep53', undefined),
    );
  });

  it('rejects secp256k1 with a public key', () => {
    expectGuard('PUBLIC_KEY_MISMATCH', () =>
      guards.publicKeyMatchesStandard('erc191', 'ed25519:abc'),
    );
  });
});

describe('mustBeSignedBeforeDeposit', () => {
  it('allows a deposit once the signature is submitted', () => {
    expect(() => guards.mustBeSignedBeforeDeposit(true)).not.toThrow();
  });

  it('refuses to expose a deposit address before signing', () => {
    expectGuard('DEPOSIT_BEFORE_SIGNATURE', () =>
      guards.mustBeSignedBeforeDeposit(false),
    );
  });
});

describe('noExecutionInFlight', () => {
  it('allows an empty open list', () => {
    expect(() => guards.noExecutionInFlight([])).not.toThrow();
  });

  it('rejects when an execution is already open', () => {
    expectGuard('EXECUTION_IN_FLIGHT', () =>
      guards.noExecutionInFlight([execution()]),
    );
  });
});

describe('memoPresentForStellar', () => {
  it('ignores non-Stellar origins', () => {
    expect(() => guards.memoPresentForStellar('base', null)).not.toThrow();
  });

  it('accepts a Stellar origin with a memo', () => {
    expect(() => guards.memoPresentForStellar('stellar', 'memo')).not.toThrow();
  });

  it('rejects a Stellar origin without a memo', () => {
    expectGuard('MEMO_REQUIRED', () =>
      guards.memoPresentForStellar('stellar', null),
    );
  });
});

describe('originNetworkMatches', () => {
  it('is skipped when the connector exposes no chain id', async () => {
    await expect(
      guards.originNetworkMatches(undefined, 8453),
    ).resolves.toBeUndefined();
  });

  it('accepts a matching chain', async () => {
    await expect(
      guards.originNetworkMatches(vi.fn().mockResolvedValue(8453), 8453),
    ).resolves.toBeUndefined();
  });

  it('rejects a mismatched chain', async () => {
    await expect(
      guards.originNetworkMatches(vi.fn().mockResolvedValue(1), 8453),
    ).rejects.toMatchObject({ code: 'NETWORK_MISMATCH' });
  });
});
