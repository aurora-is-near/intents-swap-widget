import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExecutionPlan, ExecutionPreview } from '@/runner/types';
import { useQuotePreview } from '@/react';

const plan = (amount: string): ExecutionPlan<void> =>
  ({
    recipe: { id: 'r' },
    params: undefined,
    quote: { amount },
  }) as unknown as ExecutionPlan<void>;

const previewOf = (
  target: ExecutionPlan<void>,
  deadline = '2030-01-01T00:00:00.000Z',
): ExecutionPreview<void> =>
  ({
    execution: { quote: { amountOut: target.quote.amount } },
    plan: { ...target, quote: { ...target.quote, deadline } },
  }) as unknown as ExecutionPreview<void>;

type Pending = {
  plan: ExecutionPlan<void>;
  resolve: (value: ExecutionPreview<void>) => void;
  reject: (error: Error) => void;
};

const fakeExec = () => {
  const pending: Pending[] = [];
  const preview = vi.fn(
    (target: ExecutionPlan<void>) =>
      new Promise<ExecutionPreview<void>>((resolve, reject) => {
        pending.push({ plan: target, resolve, reject });
      }),
  );

  return { exec: { preview } as never, preview, pending };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const settle = async (ms = 0) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe('useQuotePreview', () => {
  it('quotes nothing without a plan', async () => {
    const { exec, preview } = fakeExec();
    const { result } = renderHook(() => useQuotePreview({ exec, plan: null }));

    await settle(1000);

    expect(preview).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ isLoading: false });
    expect(result.current.preview).toBeUndefined();
  });

  it('waits for the input to settle, then quotes the latest plan', async () => {
    const { exec, preview, pending } = fakeExec();
    const first = plan('1');
    const second = plan('2');
    const { result, rerender } = renderHook(
      ({ current }) => useQuotePreview({ exec, plan: current }),
      { initialProps: { current: first } },
    );

    expect(result.current.isLoading).toBe(true);

    await settle(300);
    rerender({ current: second });
    await settle(499);

    expect(preview).not.toHaveBeenCalled();

    await settle(1);

    expect(preview).toHaveBeenCalledTimes(1);
    expect(preview).toHaveBeenCalledWith(second);

    await act(async () => pending[0]!.resolve(previewOf(second)));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.preview?.plan.quote.amount).toBe('2');
    expect(result.current.expiresAt).toBe(
      Date.parse('2030-01-01T00:00:00.000Z'),
    );
  });

  it("drops an older plan's result", async () => {
    const { exec, pending } = fakeExec();
    const first = plan('1');
    const second = plan('2');
    const { result, rerender } = renderHook(
      ({ current }) => useQuotePreview({ exec, plan: current }),
      { initialProps: { current: first } },
    );

    await settle(500);
    rerender({ current: second });
    await act(async () => pending[0]!.resolve(previewOf(first)));

    expect(result.current.preview).toBeUndefined();
    expect(result.current.isLoading).toBe(true);

    await settle(500);
    await act(async () => pending[1]!.resolve(previewOf(second)));

    expect(result.current.preview?.plan.quote.amount).toBe('2');
  });

  it('reports a failed preview for the current plan', async () => {
    const { exec, pending } = fakeExec();
    const current = plan('1');
    const { result } = renderHook(() =>
      useQuotePreview({ exec, plan: current }),
    );

    await settle(500);
    await act(async () => pending[0]!.reject(new Error('Amount too low')));

    expect(result.current).toMatchObject({ isLoading: false });
    expect(result.current.error?.message).toBe('Amount too low');
    expect(result.current.preview).toBeUndefined();
  });

  it('refreshes at once, keeping the quote shown meanwhile', async () => {
    const { exec, preview, pending } = fakeExec();
    const current = plan('1');
    const { result } = renderHook(() =>
      useQuotePreview({ exec, plan: current, refreshIntervalMs: 0 }),
    );

    await settle(500);
    await act(async () => pending[0]!.resolve(previewOf(current)));

    act(() => result.current.refresh());
    await settle(0);

    expect(preview).toHaveBeenCalledTimes(2);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.preview).toBeDefined();

    await act(async () =>
      pending[1]!.resolve(previewOf(current, '2031-01-01T00:00:00.000Z')),
    );

    expect(result.current.expiresAt).toBe(
      Date.parse('2031-01-01T00:00:00.000Z'),
    );
  });

  it('re-quotes the same plan on the interval', async () => {
    const { exec, preview, pending } = fakeExec();
    const current = plan('1');

    renderHook(() =>
      useQuotePreview({ exec, plan: current, refreshIntervalMs: 30_000 }),
    );

    await settle(500);
    await act(async () => pending[0]!.resolve(previewOf(current)));
    await settle(29_999);

    expect(preview).toHaveBeenCalledTimes(1);

    await settle(1);
    // The re-quote itself goes out on the next timer turn, undebounced.
    await settle(0);

    expect(preview).toHaveBeenCalledTimes(2);
  });
});
