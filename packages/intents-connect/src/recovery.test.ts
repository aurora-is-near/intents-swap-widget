import { describe, expect, it } from 'vitest';

import { DepositTransferError, GuardError } from '@/errors';
import { deriveExecutionRecovery } from '@/recovery';

describe('deriveExecutionRecovery', () => {
  it('classifies the in-flight lock as resume-or-cancel', () => {
    const error = new GuardError('EXECUTION_IN_FLIGHT', 'busy', {
      executionId: 'exec-9',
    });

    expect(deriveExecutionRecovery(error)).toEqual({
      kind: 'resume-or-cancel',
      executionId: 'exec-9',
    });
  });

  it('ignores an in-flight guard with no blocking execution id', () => {
    // The guard is thrown before any execution exists — nothing to resume or
    // cancel, so there is no action to offer.
    const error = new GuardError('EXECUTION_IN_FLIGHT', 'runner busy');

    expect(deriveExecutionRecovery(error)).toBeUndefined();
  });

  it('classifies a failed transfer as retry-transfer with its cause', () => {
    const cause = new Error('Chain 100 is not available.');
    const error = new DepositTransferError('exec-9', { cause });

    expect(deriveExecutionRecovery(error)).toEqual({
      kind: 'retry-transfer',
      executionId: 'exec-9',
      cause,
    });
  });

  it('yields nothing for other errors, other guards, and no error', () => {
    expect(deriveExecutionRecovery(new Error('boom'))).toBeUndefined();
    expect(
      deriveExecutionRecovery(new GuardError('QUOTE_MOVED', 'moved')),
    ).toBeUndefined();
    expect(deriveExecutionRecovery(undefined)).toBeUndefined();
  });
});
