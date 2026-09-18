import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GuardError,
  IntentsConnectApiError,
} from '@aurora-is-near/intents-connect';
import type { StepsPreview } from '@aurora-is-near/intents-connect';

import { explainSpendError, useSolanaSpend } from './useSolanaSpend';
import type { SolanaSpendQuote } from '../spend';

const quote = (minimumReceive = '1000'): SolanaSpendQuote => ({
  preview: {
    plan: { prepared: { steps: [] }, amount: '5' },
  } as unknown as StepsPreview,
  receive: '1100',
  minimumReceive,
  networkFee: '50',
  expiresAt: Date.now() + 30_000,
});

const setup = () => {
  const exec = { runSteps: vi.fn().mockResolvedValue(undefined) };
  const hook = renderHook(
    ({ inputKey }) => useSolanaSpend({ exec, inputKey }),
    { initialProps: { inputKey: 'walletA-ORCA-100' } },
  );

  return { ...hook, exec };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useSolanaSpend', () => {
  it('previews first, then commits the prepared plan on the second call', async () => {
    const h = setup();
    const preview = vi.fn(async () => quote());

    await act(() => h.result.current.execute(preview));

    expect(h.result.current.quote?.minimumReceive).toBe('1000');
    expect(h.result.current.isCommitted).toBe(false);
    expect(h.exec.runSteps).not.toHaveBeenCalled();

    await act(() => h.result.current.execute(preview));

    expect(preview).toHaveBeenCalledTimes(2);
    expect(h.exec.runSteps).toHaveBeenCalledWith(quote().preview.plan);
    expect(h.result.current.isCommitted).toBe(true);
  });

  it('blocks the commit and flags it when the guaranteed amount fell', async () => {
    const h = setup();

    await act(() => h.result.current.execute(async () => quote('1000')));
    await act(() => h.result.current.execute(async () => quote('900')));

    expect(h.exec.runSteps).not.toHaveBeenCalled();
    expect(h.result.current.quoteMoved).toBe(true);
    expect(h.result.current.quote?.minimumReceive).toBe('900');

    // Accepting the lower figure commits it.
    await act(() => h.result.current.execute(async () => quote('900')));

    expect(h.exec.runSteps).toHaveBeenCalledOnce();
  });

  it('accepts a higher guaranteed amount without another confirmation', async () => {
    const h = setup();

    await act(() => h.result.current.execute(async () => quote('1000')));
    await act(() => h.result.current.execute(async () => quote('1100')));

    expect(h.exec.runSteps).toHaveBeenCalledOnce();
  });

  it('drops the review when the input changes or the quote expires', async () => {
    const h = setup();

    await act(() => h.result.current.execute(async () => quote()));

    expect(h.result.current.quote).toBeDefined();

    h.rerender({ inputKey: 'walletA-ORCA-200' });

    expect(h.result.current.quote).toBeUndefined();

    await act(() => h.result.current.execute(async () => quote()));

    expect(h.result.current.quote).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(30_001);
    });

    expect(h.result.current.quote).toBeUndefined();
  });

  it('clears the review on a preview failure and explains fee estimation failures', async () => {
    const h = setup();

    await act(() => h.result.current.execute(async () => quote()));

    const error = await act(() =>
      h.result.current
        .execute(async () => {
          throw new GuardError('FEE_NOT_ESTIMATED', 'no fee');
        })
        .catch((e: unknown) => e),
    );

    expect((error as Error).message).toMatch(/could not estimate the fee/);
    expect(h.result.current.quote).toBeUndefined();
    expect(h.exec.runSteps).not.toHaveBeenCalled();
  });

  it('clears the review when the commit reports QUOTE_MOVED', async () => {
    const h = setup();

    h.exec.runSteps.mockRejectedValueOnce(
      new GuardError('QUOTE_MOVED', 'expired'),
    );
    await act(() => h.result.current.execute(async () => quote()));

    let caught: unknown;

    await act(() =>
      h.result.current
        .execute(async () => quote())
        .catch((error: unknown) => {
          caught = error;
        }),
    );

    expect(caught).toMatchObject({ code: 'QUOTE_MOVED' });
    expect(h.result.current.quote).toBeUndefined();
  });

  it('clear() drops the review explicitly', async () => {
    const h = setup();

    await act(() => h.result.current.execute(async () => quote()));
    act(() => h.result.current.clear());

    expect(h.result.current.quote).toBeUndefined();
  });

  it('ignores a preview that resolves after the input changed', async () => {
    const h = setup();
    let resolve!: (value: SolanaSpendQuote) => void;
    const pending = new Promise<SolanaSpendQuote>((r) => {
      resolve = r;
    });

    const run = act(() => h.result.current.execute(() => pending));

    h.rerender({ inputKey: 'walletB-ORCA-100' });
    resolve(quote());
    await run;

    expect(h.result.current.quote).toBeUndefined();
  });
});

describe('explainSpendError', () => {
  it('rewrites the 503 nonce shortage and the fee budget guard', () => {
    expect(
      (explainSpendError(new IntentsConnectApiError('x', 503)) as Error)
        .message,
    ).toMatch(/nonce account/);
    expect(
      (explainSpendError(new GuardError('FEE_EXCEEDS_AMOUNT', 'x')) as Error)
        .message,
    ).toMatch(/larger than this balance/);
  });

  it('passes other errors through untouched', () => {
    const error = new Error('plain');

    expect(explainSpendError(error)).toBe(error);
  });
});
