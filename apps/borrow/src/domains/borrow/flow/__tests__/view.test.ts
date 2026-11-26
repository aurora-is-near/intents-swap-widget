import { describe, expect, it } from 'vitest';

import { freshRun } from '../state';
import { viewOf } from '../view';
import type { BorrowPreviewFigures } from '../../utils/previewFigures';
import type { FlowEnv } from '../events';
import type { BorrowState, Run } from '../state';
import type { BorrowFlowInput } from '../types';

const env: FlowEnv = {
  wallet: undefined,
  runnerSigned: false,
  runnerExecutionId: undefined,
  runnerIntermediary: undefined,
  hasOnPrevious: true,
};

const INPUT = {} as BorrowFlowInput;
const FIGURES = { borrowAmount: 1n } as unknown as BorrowPreviewFigures;

const run = (overrides: Partial<Run> = {}): Run => ({
  ...freshRun(1, INPUT),
  figures: FIGURES,
  ...overrides,
});

describe('viewOf', () => {
  it.each<[string, BorrowState, unknown]>([
    ['idle', { kind: 'idle', attempt: 0 }, { kind: 'idle' }],
    [
      'checking before a quote',
      {
        kind: 'checking',
        run: run(),
        then: { kind: 'quote', runAfter: false },
      },
      { kind: 'previewing' },
    ],
    [
      'checking before a run',
      {
        kind: 'checking',
        run: run(),
        then: { kind: 'run', drive: { kind: 'retryDeposit' } as never },
      },
      { kind: 'signing' },
    ],
    [
      'tracking',
      {
        kind: 'tracking',
        warning: false,
        run: run({ executionId: 'e', step: 1 }),
      },
      { kind: 'pending', step: 1, executionId: 'e', waitingForDeposit: false },
    ],
    [
      'the "taking longer" warning',
      { kind: 'tracking', warning: true, run: run({ step: 2 }) },
      { kind: 'error', error: 'delayed', cause: undefined, step: 2 },
    ],
  ])('shows %s', (_, state, flow) => {
    expect(viewOf(state, env).state).toEqual(flow);
  });

  it('keeps the figures through a run, and has none when idle', () => {
    expect(viewOf({ kind: 'signing', run: run() }, env).figures).toBe(FIGURES);
    expect(viewOf({ kind: 'idle', attempt: 1 }, env).figures).toBeUndefined();
  });

  it('offers only the steps-only retry while funds wait, and close without the form', () => {
    const failed = (
      overrides: Partial<Run>,
      error: 'priceMoved' | 'walletDisconnected' = 'priceMoved',
    ): BorrowState => ({
      kind: 'error',
      error,
      cause: undefined,
      step: 2,
      run: run({
        executionId: 'e',
        signed: true,
        status: 'OPERATION_FAILED',
        ...overrides,
      }),
    });

    expect(viewOf(failed({}), env)).toMatchObject({
      action: 'retry',
      fundsWaiting: true,
      fundsWaitingExecutionId: 'e',
    });
    expect(viewOf(failed({ input: undefined }), env).action).toBe('close');
    // Reconnecting leads back to the steps-only retry.
    expect(viewOf(failed({}, 'walletDisconnected'), env).action).toBe(
      'reconnect',
    );
  });

  it('takes the error’s own action otherwise', () => {
    expect(
      viewOf(
        {
          kind: 'error',
          error: 'quoteMoved',
          cause: undefined,
          step: 0,
          run: run(),
        },
        env,
      ),
    ).toMatchObject({ action: 'refresh', fundsWaiting: false });
  });
});
