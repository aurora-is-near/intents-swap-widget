import { beforeEach, describe, expect, it } from 'vitest';
import type { ExecutionStatus } from '@aurora-is-near/intents-connect';

import {
  clearAllProgress,
  forgetProgress,
  isOngoingExecution,
  markCreated,
  markDepositSent,
  progressOf,
} from '../executionProgress';
import type { ExecutionProgress } from '../executionProgress';

const WALLET = '0x7A3F5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21';

const execution = (status: ExecutionStatus, messageSigned?: boolean) => ({
  id: 'exec-1',
  status,
  details: messageSigned === undefined ? {} : { messageSigned },
});

beforeEach(() => {
  clearAllProgress();
});

describe('executionProgress', () => {
  it('records the deposit per wallet, in any address case', () => {
    markCreated(WALLET, 'exec-1');

    expect(progressOf(WALLET.toLowerCase(), 'exec-1')).toEqual({
      depositSent: false,
    });

    markDepositSent(WALLET.toLowerCase(), 'exec-1');

    expect(progressOf(WALLET, 'exec-1')).toEqual({ depositSent: true });
    expect(progressOf(WALLET, 'exec-2')).toBeUndefined();
    expect(progressOf(undefined, 'exec-1')).toBeUndefined();

    forgetProgress(WALLET, 'exec-1');

    expect(progressOf(WALLET, 'exec-1')).toBeUndefined();
  });
});

describe('isOngoingExecution', () => {
  const NONE = undefined;
  const CREATED: ExecutionProgress = { depositSent: false };
  const SENT: ExecutionProgress = { depositSent: true };

  it.each<
    [
      string,
      ReturnType<typeof execution>,
      ExecutionProgress | undefined,
      boolean,
    ]
  >([
    [
      'past the deposit, whatever is known',
      execution('DEPOSIT_PROCESSING', false),
      CREATED,
      true,
    ],
    ['opening the loan', execution('OPERATION_PENDING'), NONE, true],
    [
      'its deposit sent this session',
      execution('DEPOSIT_PENDING', true),
      SENT,
      true,
    ],
    [
      'signed, nothing known (a reload)',
      execution('DEPOSIT_PENDING', true),
      NONE,
      true,
    ],
    [
      'unsigned, though DEPOSIT_PENDING',
      execution('DEPOSIT_PENDING', false),
      NONE,
      false,
    ],
    ['unsigned and CREATED', execution('CREATED'), NONE, false],
    [
      'unsigned, as this session saw',
      execution('CREATED', false),
      CREATED,
      false,
    ],
    [
      'signed and never funded this session',
      execution('DEPOSIT_PENDING', true),
      CREATED,
      false,
    ],
  ])('%s: %s', (_, found, known, ongoing) => {
    expect(isOngoingExecution(found, known)).toBe(ongoing);
  });
});
