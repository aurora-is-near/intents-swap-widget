import {
  DepositTransferError,
  GuardError,
} from '@aurora-is-near/intents-connect';
import { describe, expect, it } from 'vitest';
import type { Execution } from '@aurora-is-near/intents-connect';

import { dryExecution } from '@/tests/executionFixtures';

import { freshRun } from '../state';
import { transition } from '../transition';
import type { BorrowPreview } from '../../utils/preview';
import type { BorrowPreviewFigures } from '../../utils/previewFigures';
import type { BorrowStepsPreview } from '../../utils/stepsRetry';
import type { BorrowEvent, FlowEnv } from '../events';
import type { BorrowState, Run } from '../state';
import type { BorrowFlowInput } from '../types';

const WALLET = '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21';
const EXEC = 'exec-1';
const OTHER = 'exec-0';

const env = (overrides: Partial<FlowEnv> = {}): FlowEnv => ({
  wallet: WALLET,
  runnerSigned: false,
  runnerExecutionId: undefined,
  runnerIntermediary: undefined,
  hasOnPrevious: true,
  ...overrides,
});

// The transition only carries these through; their contents don't matter.
const INPUT = { market: { name: 'Aave' } } as unknown as BorrowFlowInput;
const FIGURES = { borrowAmount: 1n } as unknown as BorrowPreviewFigures;
const BRIDGE = {
  preview: { plan: { id: 'bridge' }, execution: dryExecution() },
  borrowAmount: 1n,
} as unknown as BorrowPreview;

const STEPS = {
  steps: { plan: { id: 'steps' }, spendable: '1' },
  borrowAmount: 1n,
} as unknown as BorrowStepsPreview;

const REJECTION = Object.assign(new Error('User rejected the request.'), {
  code: 4001,
});

const run = (overrides: Partial<Run> = {}): Run => ({
  ...freshRun(1, INPUT),
  borrowed: BRIDGE,
  figures: FIGURES,
  confirmed: true,
  ...overrides,
});

const open = (
  status: Execution['status'],
  messageSigned: boolean,
  id = OTHER,
): Execution => {
  const base = dryExecution();

  return { ...base, id, status, details: { ...base.details, messageSigned } };
};

const step = (state: BorrowState, event: BorrowEvent, e = env()) =>
  transition(state, event, e);

/** Applies events in order, returning the last state and every effect. */
const steps = (state: BorrowState, events: BorrowEvent[], e = env()) =>
  events.reduce(
    (acc, event) => {
      const next = transition(acc.state, event, e);

      return { state: next.state, effects: [...acc.effects, ...next.effects] };
    },
    { state, effects: [] as ReturnType<typeof transition>['effects'] },
  );

const signing = (overrides: Partial<Run> = {}): BorrowState => ({
  kind: 'signing',
  run: run(overrides),
});

const runner = (event: Extract<BorrowEvent, { type: 'RUNNER' }>['event']) =>
  ({ type: 'RUNNER', attempt: 1, event }) as const;

describe('transition: starting a borrow', () => {
  it('checks the wallet lock before quoting', () => {
    const { state, effects } = step(
      { kind: 'idle', attempt: 4 },
      { type: 'START', input: INPUT },
    );

    expect(state).toMatchObject({
      kind: 'checking',
      run: { attempt: 5, input: INPUT, confirmed: false },
      then: { kind: 'quote', runAfter: false },
    });
    expect(effects).toContainEqual({ type: 'listOpen', attempt: 5 });
  });

  it.each<[string, BorrowState]>([
    ['signing', signing()],
    [
      'cancelling',
      {
        kind: 'cancelling',
        run: run(),
        executionId: EXEC,
        reason: 'declined',
        next: { kind: 'rejected', cause: REJECTION },
      },
    ],
    ['tracking', { kind: 'tracking', run: run(), warning: false }],
  ])('is ignored while %s', (_, state) => {
    expect(step(state, { type: 'START', input: INPUT }).state).toBe(state);
  });

  it('starts over from the "taking longer" warning', () => {
    const { state } = step(
      { kind: 'tracking', run: run(), warning: true },
      { type: 'START', input: INPUT },
    );

    expect(state.kind).toBe('checking');
  });
});

describe('transition: the wallet lock', () => {
  const checking = (then: 'quote' | 'run'): BorrowState => ({
    kind: 'checking',
    run: run(),
    then:
      then === 'quote'
        ? { kind: 'quote', runAfter: false }
        : { kind: 'run', drive: { kind: 'run', plan: BRIDGE.preview.plan } },
  });

  const listed = (found?: Execution, known?: Parameters<typeof open>[0]) =>
    ({
      type: 'OPEN_LISTED',
      attempt: 1,
      open: found,
      known:
        known === undefined
          ? undefined
          : { depositSent: known === 'DEPOSIT_PROCESSING' },
    }) as const;

  it('shows the previous borrow on its way instead of quoting', () => {
    const previous = open('DEPOSIT_PROCESSING', true);
    const { state, effects } = step(checking('quote'), listed(previous));

    expect(state).toMatchObject({
      kind: 'tracking',
      run: { executionId: OTHER, step: 1, attempt: 2 },
    });
    expect(effects).toContainEqual({
      type: 'notifyPrevious',
      execution: previous,
    });
    expect(effects).toContainEqual({
      type: 'follow',
      attempt: 2,
      executionId: OTHER,
    });
  });

  it('is busy for the previous borrow without onPrevious', () => {
    const { state } = step(
      checking('quote'),
      listed(open('DEPOSIT_PENDING', true)),
      env({ hasOnPrevious: false }),
    );

    expect(state).toMatchObject({ kind: 'error', error: 'busy' });
  });

  it('quotes over an abandoned one, and cancels it only at Confirm', () => {
    const abandoned = open('DEPOSIT_PENDING', false);

    expect(step(checking('quote'), listed(abandoned))).toMatchObject({
      state: { kind: 'quoting' },
      effects: [{ type: 'quote', attempt: 1, input: INPUT }],
    });

    expect(step(checking('run'), listed(abandoned))).toMatchObject({
      state: { kind: 'cancelling', reason: 'previous', executionId: OTHER },
      effects: [{ type: 'cancel', attempt: 1, executionId: OTHER }],
    });
  });

  it('runs when nothing is open', () => {
    expect(step(checking('run'), listed())).toMatchObject({
      state: { kind: 'signing' },
      effects: [{ type: 'drive', attempt: 1, how: { kind: 'run' } }],
    });
  });

  it('drops a list for an attempt the user moved on from', () => {
    const state = checking('run');

    expect(step(state, { ...listed(), attempt: 0 }).state).toBe(state);
  });
});

describe('transition: quoting and confirming', () => {
  const quoting = (runAfter: boolean): BorrowState => ({
    kind: 'quoting',
    run: run({ borrowed: undefined, figures: undefined }),
    runAfter,
  });

  const quoted = {
    type: 'QUOTED',
    attempt: 1,
    preview: BRIDGE,
    figures: FIGURES,
  } as const;

  it('goes to confirm with the dry run and its figures', () => {
    expect(step(quoting(false), quoted).state).toMatchObject({
      kind: 'confirm',
      run: { figures: FIGURES, borrowed: BRIDGE, confirmed: false },
    });
  });

  it('checks the lock and runs at once when already confirmed', () => {
    expect(step(quoting(true), quoted)).toMatchObject({
      state: { kind: 'checking', then: { kind: 'run' } },
      effects: [{ type: 'listOpen', attempt: 1 }],
    });
  });

  it('confirms a steps-only dry run as runSteps', () => {
    const { state } = step(
      {
        kind: 'confirm',
        run: {
          ...run({ confirmed: false }),
          borrowed: STEPS,
          figures: FIGURES,
        },
      },
      { type: 'CONFIRM' },
    );

    expect(state).toMatchObject({
      kind: 'checking',
      run: { confirmed: true, attempt: 2 },
      then: { kind: 'run', drive: { kind: 'runSteps' } },
    });
  });
});

describe('transition: signing and tracking', () => {
  it('records the created execution and tells the page', () => {
    const { state, effects } = step(
      signing(),
      runner({ type: 'created', executionId: EXEC }),
    );

    expect(state).toMatchObject({
      kind: 'signing',
      run: { executionId: EXEC, owner: WALLET },
    });
    expect(effects).toEqual([
      { type: 'progress', op: 'created', wallet: WALLET, executionId: EXEC },
      { type: 'notifyCreated', executionId: EXEC },
    ]);
  });

  it('is signed once the deposit is asked for, and arms the delay timer', () => {
    const { state, effects } = step(
      signing({ executionId: EXEC, owner: WALLET }),
      runner({ type: 'phase', phase: 'awaiting-deposit' }),
    );

    expect(state).toMatchObject({
      kind: 'tracking',
      warning: false,
      run: { step: 0, signed: true },
    });
    expect(effects).toContainEqual({ type: 'armDelay', attempt: 1 });
  });

  it('records nothing for an execution it only follows until its deposit is sent', () => {
    const restored: BorrowState = {
      kind: 'tracking',
      warning: false,
      run: run({ executionId: OTHER, signed: true }),
    };

    const { effects } = steps(restored, [
      runner({ type: 'phase', phase: 'awaiting-deposit' }),
      runner({ type: 'deposit-address', address: '0xdep', memo: null }),
    ]);

    expect(effects.filter((effect) => effect.type === 'progress')).toEqual([]);
  });

  it('records a sent deposit and moves to bridging, never back', () => {
    const { state, effects } = steps(
      signing({ executionId: EXEC, owner: WALLET }),
      [
        runner({ type: 'deposit-sent', txHash: '0xtx' }),
        runner({ type: 'status', status: 'OPERATION_PROCESSING' }),
        runner({ type: 'status', status: 'DEPOSIT_PENDING' }),
      ],
    );

    expect(state).toMatchObject({
      kind: 'tracking',
      run: { step: 2, depositSent: true },
    });
    expect(effects).toContainEqual({
      type: 'progress',
      op: 'depositSent',
      wallet: WALLET,
      executionId: EXEC,
    });
  });

  it('ignores runner events of another attempt, and the runner’s own error', () => {
    const state = signing({ executionId: EXEC });

    expect(
      step(state, {
        type: 'RUNNER',
        attempt: 0,
        event: { type: 'phase', phase: 'awaiting-deposit' },
      }).state,
    ).toBe(state);
    expect(step(state, runner({ type: 'error', error: REJECTION })).state).toBe(
      state,
    );
  });

  it('is done on SUCCESS, and forgets the execution once', () => {
    const { state, effects } = step(
      {
        kind: 'tracking',
        warning: false,
        run: run({ executionId: EXEC, owner: WALLET }),
      },
      runner({ type: 'status', status: 'SUCCESS' }),
    );

    expect(state).toMatchObject({ kind: 'done', executionId: EXEC });
    expect(effects).toContainEqual({
      type: 'notifySettled',
      executionId: EXEC,
    });
    expect(effects).toContainEqual({
      type: 'progress',
      op: 'forget',
      wallet: WALLET,
      executionId: EXEC,
    });
    expect(effects.filter(({ type }) => type !== 'clearDelay')).toHaveLength(2);
  });
});

describe('transition: the "taking longer" warning', () => {
  const tracking: BorrowState = {
    kind: 'tracking',
    warning: false,
    run: run({ executionId: EXEC, step: 1, delayArmed: true }),
  };

  it('warns, keeps tracking underneath, and closes back to pending for good', () => {
    const warned = steps(tracking, [
      { type: 'DELAY_ELAPSED', attempt: 1 },
      runner({ type: 'status', status: 'OPERATION_PROCESSING' }),
    ]);

    expect(warned.state).toMatchObject({
      kind: 'tracking',
      warning: true,
      run: { step: 2 },
    });

    const closed = step(warned.state, { type: 'CLOSE' });

    expect(closed.state).toMatchObject({
      kind: 'tracking',
      warning: false,
      run: { delayDismissed: true },
    });

    // Not armed again once closed.
    expect(
      step(
        closed.state,
        runner({ type: 'status', status: 'OPERATION_PENDING' }),
      ).effects,
    ).not.toContainEqual(expect.objectContaining({ type: 'armDelay' }));
  });
});

describe('transition: a declined signature', () => {
  const created = signing({ executionId: EXEC, owner: WALLET });

  it('cancels the execution it created, then is rejected', () => {
    const declined = step(created, {
      type: 'RUN_FAILED',
      attempt: 1,
      error: REJECTION,
    });

    expect(declined).toMatchObject({
      state: { kind: 'cancelling', reason: 'declined', executionId: EXEC },
      effects: [{ type: 'clearDelay' }, { type: 'cancel', executionId: EXEC }],
    });

    const cancelled = step(declined.state, {
      type: 'CANCELLED',
      attempt: 1,
      executionId: EXEC,
    });

    expect(cancelled.state).toMatchObject({
      kind: 'error',
      error: 'rejected',
      cause: REJECTION,
      step: 0,
      run: { executionId: undefined },
    });
    expect(cancelled.effects).toContainEqual({
      type: 'notifySettled',
      executionId: EXEC,
    });
  });

  it('is rejected without cancelling when the runner already submitted the signature', () => {
    expect(
      step(
        created,
        { type: 'RUN_FAILED', attempt: 1, error: REJECTION },
        env({ runnerSigned: true }),
      ).state,
    ).toMatchObject({ kind: 'error', error: 'rejected' });
  });

  it('asks again for a declined cancellation', () => {
    const { state } = steps(created, [
      { type: 'RUN_FAILED', attempt: 1, error: REJECTION },
      {
        type: 'CANCEL_FAILED',
        attempt: 1,
        executionId: EXEC,
        error: REJECTION,
      },
    ]);

    expect(state).toMatchObject({ kind: 'error', error: 'cancelDeclined' });
    expect(step(state, { type: 'RETRY' })).toMatchObject({
      state: { kind: 'cancelling', reason: 'declined' },
      effects: [{ type: 'cancel', executionId: EXEC }],
    });
  });

  it('re-quotes once an earlier request’s declined cancellation goes through', () => {
    const blocked: BorrowState = {
      kind: 'cancelling',
      run: run(),
      executionId: OTHER,
      reason: 'previous',
      next: { kind: 'run', drive: { kind: 'run', plan: BRIDGE.preview.plan } },
    };

    const { state } = steps(blocked, [
      {
        type: 'CANCEL_FAILED',
        attempt: 1,
        executionId: OTHER,
        error: REJECTION,
      },
      { type: 'RETRY' },
      { type: 'CANCELLED', attempt: 1, executionId: OTHER },
    ]);

    expect(state).toMatchObject({
      kind: 'checking',
      then: { kind: 'quote', runAfter: true },
    });
  });
});

describe('transition: other failures', () => {
  const signed = (overrides: Partial<Run> = {}): BorrowState => ({
    kind: 'tracking',
    warning: false,
    run: run({ executionId: EXEC, owner: WALLET, signed: true, ...overrides }),
  });

  it('is depositRejected, and retries only the deposit transfer', () => {
    const failed = step(signed(), {
      type: 'RUN_FAILED',
      attempt: 1,
      error: new DepositTransferError(EXEC, { cause: REJECTION }),
    });

    expect(failed.state).toMatchObject({
      kind: 'error',
      error: 'depositRejected',
    });
    expect(step(failed.state, { type: 'RETRY' })).toMatchObject({
      state: { kind: 'tracking' },
      effects: expect.arrayContaining([
        expect.objectContaining({
          type: 'drive',
          how: { kind: 'retryDeposit' },
        }),
      ]),
    });
  });

  it('diagnoses a failed borrow step and refines the error', () => {
    const failed = steps(signed(), [
      runner({ type: 'status', status: 'OPERATION_FAILED' }),
      {
        type: 'RUN_FAILED',
        attempt: 1,
        error: new Error('execution OPERATION_FAILED'),
      },
    ]);

    expect(failed.state).toMatchObject({ kind: 'error', error: 'unknown' });

    const diagnose = failed.effects.find(
      (effect) => effect.type === 'diagnose',
    );

    expect(diagnose).toBeDefined();

    const { state } = step(failed.state, {
      type: 'DIAGNOSED',
      attempt: 1,
      cause: failed.state.kind === 'error' ? failed.state.cause : undefined,
      borrowStep: 'priceMoved',
    });

    expect(state).toMatchObject({ kind: 'error', error: 'priceMoved' });
  });

  it('is quoteMoved, and refreshes to a new quote', () => {
    const failed = step(signing(), {
      type: 'RUN_FAILED',
      attempt: 1,
      error: new GuardError('QUOTE_MOVED', 'moved'),
    });

    expect(failed.state).toMatchObject({ kind: 'error', error: 'quoteMoved' });
    expect(step(failed.state, { type: 'REFRESH' }).state).toMatchObject({
      kind: 'checking',
      then: { kind: 'quote', runAfter: false },
    });
  });
});

describe('transition: restoring, leaving, reconnecting', () => {
  it('restores a signed DEPOSIT_PENDING borrow waiting for its deposit', () => {
    const { state, effects } = step(
      { kind: 'idle', attempt: 3 },
      {
        type: 'RESTORE',
        execution: open('DEPOSIT_PENDING', true, EXEC),
        known: undefined,
      },
    );

    expect(state).toMatchObject({
      kind: 'tracking',
      run: {
        executionId: EXEC,
        step: 0,
        waitingForDeposit: true,
        input: undefined,
      },
    });
    expect(effects).toContainEqual({
      type: 'follow',
      attempt: 4,
      executionId: EXEC,
    });
  });

  it('leaves without ever cancelling', () => {
    const { state, effects } = step(signing({ executionId: EXEC }), {
      type: 'LEAVE',
    });

    expect(state).toEqual({ kind: 'idle', attempt: 2 });
    expect(effects).toEqual([{ type: 'clearDelay' }]);
  });

  it('resumes after reconnecting when the deposit was sent, else re-quotes', () => {
    const failed = (overrides: Partial<Run>): BorrowState => ({
      kind: 'error',
      error: 'unknown',
      cause: new GuardError('WALLET_NOT_CONNECTED', 'left'),
      step: 1,
      run: run({ executionId: EXEC, signed: true, ...overrides }),
    });

    expect(
      steps(failed({ depositSent: true }), [
        { type: 'RECONNECT' },
        { type: 'WALLET_BACK' },
      ]),
    ).toMatchObject({
      state: { kind: 'tracking' },
      effects: expect.arrayContaining([
        { type: 'connect' },
        expect.objectContaining({
          type: 'drive',
          how: { kind: 'resume', executionId: EXEC },
        }),
      ]),
    });

    expect(
      steps(failed({ depositSent: false }), [
        { type: 'RECONNECT' },
        { type: 'WALLET_BACK' },
      ]).state,
    ).toMatchObject({ kind: 'checking', then: { kind: 'quote' } });
  });
});
