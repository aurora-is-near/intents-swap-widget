import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GuardError,
  IntentsConnectApiError,
} from '@aurora-is-near/intents-connect';
import type {
  Execution,
  ExecutionPlan,
  IntentsConnectApi,
} from '@aurora-is-near/intents-connect';

import { useSolanaBuy } from './useSolanaBuy';
import { previewSolanaBuy } from '../plan';
import type { SolanaBuyParams, SolanaBuyQuote } from '../plan';

vi.mock('../plan', () => ({ previewSolanaBuy: vi.fn() }));

const plan = {
  params: { outputMint: 'ORCA' },
} as ExecutionPlan<SolanaBuyParams>;

const api = {} as IntentsConnectApi;
const quote = (minimumOutput = '1000'): SolanaBuyQuote =>
  ({
    preview: {
      execution: {} as Execution,
      plan: {
        ...plan,
        prepared: {
          steps: [],
          walletAddress: 'wallet',
          intermediary: 'account',
          quote: plan.quote,
        },
      },
    },
    outputMint: 'ORCA',
    minimumOutput,
    estimatedOutput: '1100',
    networkFee: '50',
    recipientAta: 'ata',
    expiresAt: Date.now() + 30_000,
  }) as SolanaBuyQuote;

const setup = () => {
  const exec = { run: vi.fn().mockResolvedValue(undefined), preview: vi.fn() };
  const hook = renderHook(
    ({ inputKey }) => useSolanaBuy({ api, exec, inputKey }),
    {
      initialProps: { inputKey: 'walletA-ORCA-100' },
    },
  );

  return { ...hook, exec };
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Solana quote review', () => {
  it.each(['preview', 'create'])(
    'clears the stale review when %s returns NO_QUOTE without automatically retrying',
    async (stage) => {
      vi.mocked(previewSolanaBuy).mockImplementation(async () => quote());
      const h = setup();
      const error = new IntentsConnectApiError('Quote error. NO_QUOTE', 400);

      await act(() => h.result.current.executePlan(plan));

      if (stage === 'preview') {
        vi.mocked(previewSolanaBuy).mockRejectedValueOnce(error);
      } else {
        h.exec.run.mockRejectedValueOnce(error);
      }

      await act(async () => {
        await expect(h.result.current.executePlan(plan)).rejects.toMatchObject({
          message: expect.stringContaining(
            '1Click could not quote the bridge to Solana USDC',
          ),
          cause: error,
        });
      });

      expect(h.result.current.quote).toBeUndefined();
      expect(previewSolanaBuy).toHaveBeenCalledTimes(2);
      expect(h.exec.run).toHaveBeenCalledTimes(stage === 'create' ? 1 : 0);

      await act(() => h.result.current.executePlan(plan));

      expect(h.result.current.isCommitted).toBe(false);
    },
  );

  it('clears an underfunded committed quote so cancellation leads to a fresh review', async () => {
    vi.mocked(previewSolanaBuy).mockImplementation(async () => quote());
    const h = setup();

    await act(() => h.result.current.executePlan(plan));
    h.exec.run.mockRejectedValueOnce(new GuardError('QUOTE_MOVED', 'moved'));

    await act(async () => {
      await expect(h.result.current.executePlan(plan)).rejects.toMatchObject({
        code: 'QUOTE_MOVED',
      });
    });

    expect(h.result.current.quote).toBeUndefined();

    await act(() => h.result.current.executePlan(plan));

    expect(h.result.current.isCommitted).toBe(false);
    expect(h.exec.run).toHaveBeenCalledTimes(1);
  });

  it('previews first, refreshes on Buy, and runs exactly the refreshed prepared plan', async () => {
    const initial = quote();
    const refreshed = quote('1001');

    vi.mocked(previewSolanaBuy)
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(refreshed);
    const h = setup();

    await act(() => h.result.current.executePlan(plan));

    expect(h.exec.run).not.toHaveBeenCalled();
    expect(h.result.current.quote).toBe(initial);

    await act(() => h.result.current.executePlan(plan));

    expect(h.exec.run).toHaveBeenCalledExactlyOnceWith(refreshed.preview.plan);
    expect(h.result.current.isCommitted).toBe(true);
  });

  it('requires another click when the refreshed minimum decreases', async () => {
    vi.mocked(previewSolanaBuy)
      .mockResolvedValueOnce(quote())
      .mockResolvedValueOnce(quote('900'))
      .mockResolvedValueOnce(quote('901'));
    const h = setup();

    await act(() => h.result.current.executePlan(plan));
    await act(() => h.result.current.executePlan(plan));

    expect(h.result.current.quoteMoved).toBe(true);
    expect(h.exec.run).not.toHaveBeenCalled();

    await act(() => h.result.current.executePlan(plan));

    expect(h.exec.run).toHaveBeenCalledTimes(1);
  });

  it('expires unsigned quotes without background requests, retaining committed quotes', async () => {
    vi.mocked(previewSolanaBuy).mockImplementation(async () => quote());
    const h = setup();

    await act(() => h.result.current.executePlan(plan));
    await act(() => vi.advanceTimersByTimeAsync(30_000));

    expect(h.result.current.quote).toBeUndefined();
    expect(previewSolanaBuy).toHaveBeenCalledTimes(1);

    await act(() => h.result.current.executePlan(plan));
    await act(() => h.result.current.executePlan(plan));
    await act(() => vi.advanceTimersByTimeAsync(60_000));

    expect(h.result.current.quote).toBeDefined();
    expect(previewSolanaBuy).toHaveBeenCalledTimes(3);
  });

  it('ignores a response after inputs or wallet change, even when changed back', async () => {
    let resolve: (value: SolanaBuyQuote) => void = () => undefined;

    vi.mocked(previewSolanaBuy).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const h = setup();
    let pending: Promise<void>;

    act(() => {
      pending = h.result.current.executePlan(plan);
    });
    h.rerender({ inputKey: 'walletB-KMNO-200' });
    h.rerender({ inputKey: 'walletA-ORCA-100' });
    await act(async () => {
      resolve(quote());
      await pending;
    });

    expect(h.result.current.quote).toBeUndefined();
    expect(h.exec.run).not.toHaveBeenCalled();
  });

  it('does not commit a refreshed quote if the tab unmounts', async () => {
    vi.mocked(previewSolanaBuy).mockResolvedValueOnce(quote());
    const h = setup();

    await act(() => h.result.current.executePlan(plan));
    let resolve: (value: SolanaBuyQuote) => void = () => undefined;

    vi.mocked(previewSolanaBuy).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const pending = h.result.current.executePlan(plan);

    h.unmount();
    resolve(quote());
    await pending;

    expect(h.exec.run).not.toHaveBeenCalled();
  });

  it('ignores an obsolete preview error after the wallet changes', async () => {
    let reject: (error: Error) => void = () => undefined;

    vi.mocked(previewSolanaBuy).mockImplementation(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    const h = setup();
    const pending = h.result.current.executePlan(plan);

    h.rerender({ inputKey: 'walletB-ORCA-100' });
    reject(new Error('Old wallet disconnected'));

    await expect(pending).resolves.toBeUndefined();
    expect(h.result.current.quote).toBeUndefined();
    expect(h.exec.run).not.toHaveBeenCalled();
  });
});
