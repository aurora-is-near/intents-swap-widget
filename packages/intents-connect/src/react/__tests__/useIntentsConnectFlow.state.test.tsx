import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExecutionPlan } from '@/runner/types';
import type { UseExecutionResult } from '@/react/useExecution';
import { useIntentsConnectFlow } from '@/react/useIntentsConnectFlow';

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
  run: vi.fn().mockResolvedValue(undefined),
  previewSteps: vi.fn(),
  runSteps: vi.fn(),
  runOut: vi.fn(),
  resume: vi.fn().mockResolvedValue(undefined),
  retryDeposit: vi.fn().mockResolvedValue(undefined),
  cancel: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const plan = (depositViaWallet: boolean) =>
  ({ depositViaWallet }) as unknown as ExecutionPlan<unknown>;

const render = (depositViaWallet = true) =>
  renderHook(() =>
    useIntentsConnectFlow<void>({ buildPlan: () => plan(depositViaWallet) }),
  );

beforeEach(() => {
  exec.current = fakeExec();
});

describe('useIntentsConnectFlow state', () => {
  it('runs the built plan', async () => {
    const { result } = render();

    await act(async () => {
      await result.current.submit();
    });

    expect(exec.current.run).toHaveBeenCalledWith(plan(true));
    expect(result.current.state).toBe('IDLE');
    expect(result.current.canCancel).toBe(false);
  });

  it('maps an in-flight execution to IN_FLIGHT and resumes it', async () => {
    exec.current = fakeExec({
      recovery: { kind: 'resume-or-cancel', executionId: 'exec-9' },
    });

    const { result } = render();

    expect(result.current.state).toBe('IN_FLIGHT');
    expect(result.current.recoveryExecutionId).toBe('exec-9');
    expect(result.current.canCancel).toBe(true);

    await act(async () => {
      await result.current.resume();
    });

    expect(exec.current.resume).toHaveBeenCalledWith('exec-9', {
      depositViaWallet: undefined,
    });
  });

  it('never defaults resume to a wallet re-send after a wallet-mode submit', async () => {
    const { result, rerender } = render(true);

    await act(async () => {
      await result.current.submit();
    });

    exec.current = fakeExec({
      recovery: { kind: 'resume-or-cancel', executionId: 'exec-1' },
    });
    rerender();

    await act(async () => {
      await result.current.resume();
    });

    expect(exec.current.resume).toHaveBeenCalledWith('exec-1', {
      depositViaWallet: undefined,
    });

    await act(async () => {
      await result.current.resume({ depositViaWallet: true });
    });

    expect(exec.current.resume).toHaveBeenLastCalledWith('exec-1', {
      depositViaWallet: true,
    });
  });

  it('maps a failed transfer to FAILED and retries it', async () => {
    exec.current = fakeExec({
      phase: 'awaiting-deposit',
      depositAddress: 'deposit',
      recovery: { kind: 'retry-transfer', executionId: 'exec-2' },
    });

    const { result } = render();

    expect(result.current.state).toBe('FAILED');
    expect(result.current.canCancel).toBe(true);
    // The retry button, not the QR code, is the call to action.
    expect(result.current.needsExternalDeposit).toBe(false);

    await act(async () => {
      await result.current.retryDeposit();
    });

    expect(exec.current.retryDeposit).toHaveBeenCalled();
  });

  it('asks for an external deposit while the address is waiting', () => {
    exec.current = fakeExec({
      phase: 'awaiting-deposit',
      depositAddress: 'deposit',
      executionId: 'exec-3',
    });

    const { result } = render(false);

    expect(result.current.needsExternalDeposit).toBe(true);
    expect(result.current.canCancel).toBe(true);
  });

  it('stops asking once the deposit transaction is known', () => {
    exec.current = fakeExec({
      phase: 'awaiting-deposit',
      depositAddress: 'deposit',
      depositTxHash: '0xhash',
    });

    expect(render().result.current.needsExternalDeposit).toBe(false);
  });

  it('cancels the recovering execution, else the one being driven', async () => {
    exec.current = fakeExec({
      executionId: 'driven',
      recovery: { kind: 'resume-or-cancel', executionId: 'recovering' },
    });

    const { result, rerender } = render();

    await act(async () => {
      await result.current.cancel();
    });

    expect(exec.current.cancel).toHaveBeenCalledWith('recovering');

    exec.current = fakeExec({
      executionId: 'driven',
      phase: 'awaiting-deposit',
      depositAddress: 'deposit',
    });
    rerender();

    await act(async () => {
      await result.current.cancel();
    });

    expect(exec.current.cancel).toHaveBeenCalledWith('driven');
  });

  it('offers cancel for a Solana create that failed before signing', () => {
    exec.current = fakeExec({
      phase: 'failed',
      status: 'CREATED',
      execution: { type: 'solana' } as UseExecutionResult['execution'],
    });

    expect(render().result.current.canCancel).toBe(true);
  });
});
