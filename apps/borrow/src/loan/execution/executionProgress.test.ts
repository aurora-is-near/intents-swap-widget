import type { ExecutionStatus } from '@aurora-is-near/intents-connect';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearAllProgress,
  type ExecutionProgress,
  forgetProgress,
  isOngoingExecution,
  markCreated,
  markDepositSent,
  markSigned,
  progressOf,
} from './executionProgress';

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
  it('records signing and the deposit per wallet, in any address case', () => {
    markCreated(WALLET, 'exec-1');

    expect(progressOf(WALLET.toLowerCase(), 'exec-1')).toEqual({
      signed: false,
      depositSent: false,
    });

    markSigned(WALLET, 'exec-1');
    markDepositSent(WALLET.toLowerCase(), 'exec-1');

    expect(progressOf(WALLET, 'exec-1')).toEqual({
      signed: true,
      depositSent: true,
    });
    expect(progressOf(WALLET, 'exec-2')).toBeUndefined();
    expect(progressOf(undefined, 'exec-1')).toBeUndefined();

    forgetProgress(WALLET, 'exec-1');

    expect(progressOf(WALLET, 'exec-1')).toBeUndefined();
  });

  it('never records a signature for an execution it did not create', () => {
    // Watched only (restored after a reload): its deposit may be on its way.
    markSigned(WALLET, 'exec-watched');

    expect(progressOf(WALLET, 'exec-watched')).toBeUndefined();
  });
});

describe('isOngoingExecution', () => {
  const NONE = undefined;
  const CREATED: ExecutionProgress = { signed: false, depositSent: false };
  const SIGNED: ExecutionProgress = { signed: true, depositSent: false };
  const SENT: ExecutionProgress = { signed: true, depositSent: true };

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
      SIGNED,
      false,
    ],
  ])('%s: %s', (_, found, known, ongoing) => {
    expect(isOngoingExecution(found, known)).toBe(ongoing);
  });
});
