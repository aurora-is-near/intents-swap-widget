import { useCallback, useEffect, useRef, useState } from 'react';

import type { ExecutionPlan, ExecutionPreview } from '@/runner/types';
import type { UseExecutionResult } from '@/react/useExecution';

export type UseQuotePreviewOptions<TParams> = {
  /** The runner to preview with, e.g. `useIntentsConnectFlow().exec`. */
  exec: Pick<UseExecutionResult, 'preview'>;
  /**
   * What to quote, or `null` while the input is incomplete. Memoize it: a new
   * plan object is a new quote. Leave `quote.deadline` unset, so that each
   * refresh gets a fresh deadline.
   */
  plan: ExecutionPlan<TParams> | null | undefined;
  /** Waits this long for the input to settle. Defaults to 500 ms. */
  debounceMs?: number;
  /**
   * Re-quotes the same plan this often while the page is visible; `0` never.
   * Defaults to 30 s.
   */
  refreshIntervalMs?: number;
};

export type UseQuotePreviewResult<TParams> = {
  /**
   * The latest preview of the current plan. `preview.plan` carries the
   * prepared steps: run THAT plan to commit to exactly what was quoted.
   */
  preview?: ExecutionPreview<TParams>;
  /** A preview of the current plan is on its way, debounce included. */
  isLoading: boolean;
  /** Why the last preview of the current plan failed. */
  error?: Error;
  /** Epoch milliseconds: when the previewed quote's deadline passes. */
  expiresAt?: number;
  /** Re-quotes now. */
  refresh: () => void;
};

type Settled<TParams> = {
  plan: ExecutionPlan<TParams>;
  preview?: ExecutionPreview<TParams>;
  error?: Error;
};

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

const deadlineOf = <TParams>(preview: ExecutionPreview<TParams>) => {
  const deadline =
    preview.plan.quote.deadline ?? preview.execution.quote.deadline;

  const time = deadline ? Date.parse(deadline) : Number.NaN;

  return Number.isNaN(time) ? undefined : time;
};

/**
 * A live quote for a plan the user is still editing: a dry `preview` once
 * the input settles, refreshed while it stays the same. A result for an
 * older plan is dropped, never shown for the current one.
 */
export const useQuotePreview = <TParams = unknown>({
  exec,
  plan,
  debounceMs = 500,
  refreshIntervalMs = 30_000,
}: UseQuotePreviewOptions<TParams>): UseQuotePreviewResult<TParams> => {
  const [settled, setSettled] = useState<Settled<TParams>>();
  const [isLoading, setIsLoading] = useState(false);
  // Bumped to re-quote the same plan: by `refresh` or the interval.
  const [round, setRound] = useState(0);
  // Bumped to re-arm the interval timer that found the page hidden.
  const [tick, setTick] = useState(0);
  const immediate = useRef(false);
  const latestExec = useRef(exec);

  latestExec.current = exec;

  useEffect(() => {
    if (!plan) {
      setIsLoading(false);

      return undefined;
    }

    let current = true;
    const delay = immediate.current ? 0 : debounceMs;

    immediate.current = false;
    setIsLoading(true);

    const timer = setTimeout(() => {
      latestExec.current.preview(plan).then(
        (preview) => {
          if (current) {
            setSettled({ plan, preview });
            setIsLoading(false);
          }
        },
        (error: unknown) => {
          if (current) {
            setSettled({ plan, error: toError(error) });
            setIsLoading(false);
          }
        },
      );
    }, delay);

    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [plan, round, debounceMs]);

  const latest = settled?.plan === plan ? settled : undefined;
  const preview = latest?.preview;

  useEffect(() => {
    if (!preview || !refreshIntervalMs) {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        setTick((value) => value + 1);
      } else {
        immediate.current = true;
        setRound((value) => value + 1);
      }
    }, refreshIntervalMs);

    return () => clearTimeout(timer);
  }, [preview, refreshIntervalMs, tick]);

  const refresh = useCallback(() => {
    immediate.current = true;
    setRound((value) => value + 1);
  }, []);

  return {
    preview,
    // Also before the effect has run for a new plan.
    isLoading: !!plan && (isLoading || !latest),
    error: latest?.error,
    expiresAt: preview ? deadlineOf(preview) : undefined,
    refresh,
  };
};
