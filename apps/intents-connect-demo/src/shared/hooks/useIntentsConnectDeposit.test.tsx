import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExecutionPlan } from '@aurora-is-near/intents-connect';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';
import type { Token } from '@aurora-is-near/intents-swap-widget';

import { useIntentsConnectDeposit } from './useIntentsConnectDeposit';

vi.mock('@aurora-is-near/intents-swap-widget/utils', () => ({
  isNotEmptyAmount: (value: string) => BigInt(value || '0') > 0n,
}));

afterEach(cleanup);

describe('demo deposit preparation', () => {
  const plan = {} as ExecutionPlan;
  const token = { assetId: 'source' } as Token;
  const makeExec = () =>
    ({
      isBusy: false,
      run: vi.fn().mockResolvedValue(undefined),
    }) as unknown as UseExecutionResult;

  it.each([true, false])(
    'preserves direct execution and the selected funding mode (%s)',
    async (depositViaWallet) => {
      const exec = makeExec();
      const buildPlan = vi.fn().mockResolvedValue(plan);
      const { result } = renderHook(() =>
        useIntentsConnectDeposit({
          exec,
          token,
          amount: '100',
          depositViaWallet,
          buildPlan,
        }),
      );

      await act(() => result.current.deposit());

      expect(buildPlan).toHaveBeenCalledWith({
        token,
        amountAtomic: '100',
        depositViaWallet,
      });
      expect(exec.run).toHaveBeenCalledExactlyOnceWith(plan);
    },
  );

  it('runs an optional review callback without automatically starting execution', async () => {
    const exec = makeExec();
    const executePlan = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useIntentsConnectDeposit({
        exec,
        token,
        amount: '100',
        depositViaWallet: true,
        buildPlan: () => plan,
        executePlan,
      }),
    );

    await act(() => result.current.deposit());

    expect(executePlan).toHaveBeenCalledExactlyOnceWith(plan);
    expect(exec.run).not.toHaveBeenCalled();
    expect(result.current.isBusy).toBe(false);
  });

  it('surfaces preparation failures and prevents duplicate submissions', async () => {
    const exec = makeExec();
    let reject: (error: Error) => void = () => undefined;
    const buildPlan = vi.fn(
      () =>
        new Promise<ExecutionPlan>((_resolve, fail) => {
          reject = fail;
        }),
    );

    const { result } = renderHook(() =>
      useIntentsConnectDeposit({
        exec,
        token,
        amount: '100',
        depositViaWallet: true,
        buildPlan,
      }),
    );

    let pending: Promise<void>;

    act(() => {
      pending = result.current.deposit();
    });

    expect(result.current.isBusy).toBe(true);

    await act(() => result.current.deposit());

    expect(buildPlan).toHaveBeenCalledTimes(1);

    await act(async () => {
      reject(new Error('Jupiter unavailable'));
      await pending;
    });

    expect(result.current.preparationError?.message).toBe(
      'Jupiter unavailable',
    );
    expect(result.current.isBusy).toBe(false);
    expect(exec.run).not.toHaveBeenCalled();
  });
});
