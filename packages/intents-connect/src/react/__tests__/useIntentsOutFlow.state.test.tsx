import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Phase } from '@/machine/phases';
import type { OutOperationPlan } from '@/runner/types';
import type { Execution } from '@/types/execution';
import type { UseExecutionResult } from '@/react/useExecution';
import {
  type OutFlowStage,
  useIntentsOutFlow,
} from '@/react/useIntentsOutFlow';

const exec: { current: UseExecutionResult } = {
  current: undefined as unknown as UseExecutionResult,
};

vi.mock('@/react/useExecution', () => ({
  useExecution: () => exec.current,
}));

const fakeExec = (
  overrides: Partial<UseExecutionResult> = {},
): UseExecutionResult => ({
  phase: 'idle',
  hasSubmittedSignature: false,
  isCancelling: false,
  isBusy: false,
  preview: vi.fn(),
  run: vi.fn(),
  previewSteps: vi.fn(),
  runSteps: vi.fn(),
  runOut: vi.fn().mockResolvedValue(undefined),
  resume: vi.fn().mockResolvedValue(undefined),
  retryDeposit: vi.fn(),
  cancel: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const plan = { amount: '1' } as unknown as OutOperationPlan<unknown>;

const render = () =>
  renderHook(() => useIntentsOutFlow<void>({ buildPlan: () => plan }));

const execution = (flow?: string) =>
  ({
    id: 'exec-1',
    quote: { amountOut: '9' },
    metadata: flow ? { intentsConnectFlow: flow } : {},
  }) as unknown as Execution;

beforeEach(() => {
  exec.current = fakeExec();
});

describe('useIntentsOutFlow state', () => {
  it.each<[Phase, OutFlowStage]>([
    ['idle', 'idle'],
    ['resolving-identity', 'preparing'],
    ['planning', 'preparing'],
    ['creating', 'preparing'],
    ['awaiting-signature', 'signing'],
    ['submitting', 'paying-out'],
    ['settling', 'paying-out'],
    ['success', 'success'],
    ['failed', 'failed'],
    // A declined signature is cancelled on the spot.
    ['cancelled', 'idle'],
  ])('maps the %s phase to the %s stage', (phase, stage) => {
    exec.current = fakeExec({ phase });

    expect(render().result.current.stage).toBe(stage);
  });

  it('runs the built plan as an out-operation', async () => {
    const { result } = render();

    await act(async () => {
      await result.current.submit();
    });

    expect(exec.current.runOut).toHaveBeenCalledWith(plan);
    expect(exec.current.run).not.toHaveBeenCalled();
  });

  it('resolves undefined, not a rejection, when the run fails', async () => {
    exec.current = fakeExec({
      runOut: vi.fn().mockRejectedValue(new Error('FEE_EXCEEDS_AMOUNT')),
    });

    const { result } = render();

    await act(async () => {
      await expect(result.current.submit()).resolves.toBeUndefined();
    });
  });

  it('maps a held lock to in-flight, and resumes or cancels that execution', async () => {
    exec.current = fakeExec({
      phase: 'failed',
      recovery: { kind: 'resume-or-cancel', executionId: 'exec-9' },
    });

    const { result } = render();

    expect(result.current.stage).toBe('in-flight');
    expect(result.current.recoveryExecutionId).toBe('exec-9');
    expect(result.current.canCancel).toBe(true);

    await act(async () => {
      await result.current.resume();
      await result.current.cancel();
    });

    expect(exec.current.resume).toHaveBeenCalledWith('exec-9');
    expect(exec.current.cancel).toHaveBeenCalledWith('exec-9');
  });

  it('resumes a named execution, such as one listed after a reload', async () => {
    exec.current = fakeExec({ executionId: 'exec-1' });

    const { result } = render();

    await act(async () => {
      await result.current.resume('exec-7');
    });

    expect(exec.current.resume).toHaveBeenCalledWith('exec-7');
  });

  it('offers cancel for a created execution a guard refused before signing', () => {
    exec.current = fakeExec({
      phase: 'failed',
      executionId: 'exec-2',
      hasSubmittedSignature: false,
    });

    expect(render().result.current.canCancel).toBe(true);

    exec.current = fakeExec({
      phase: 'failed',
      executionId: 'exec-2',
      hasSubmittedSignature: true,
    });

    expect(render().result.current.canCancel).toBe(false);
  });

  it("exposes only an out-operation's quote", () => {
    exec.current = fakeExec({ execution: execution('out-operation') });

    expect(render().result.current.quote).toEqual({ amountOut: '9' });

    exec.current = fakeExec({ execution: execution() });

    expect(render().result.current.quote).toBeUndefined();
  });
});
