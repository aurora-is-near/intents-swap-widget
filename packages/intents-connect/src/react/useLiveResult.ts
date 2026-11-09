import { useCallback, useEffect, useRef, useState } from 'react';

type Settled<TInput, TResult> = {
  input: TInput;
  result?: TResult;
  error?: Error;
};

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

type LiveResult<TResult> = {
  /** The latest result for the current input. */
  result?: TResult;
  /** A result for the current input is on its way, debounce included. */
  isLoading: boolean;
  /** Why the last call for the current input failed. */
  error?: Error;
  /** Calls again now. */
  refresh: () => void;
};

/**
 * A live answer for an input the user is still editing: `run` once the input
 * settles, again every `refreshIntervalMs` while it stays the same and the
 * page is visible. A result for an older input is dropped, never shown for
 * the current one. `input` must be memoized: a new object is a new call.
 */
export const useLiveResult = <TInput, TResult>(
  input: TInput | null | undefined,
  run: (input: TInput) => Promise<TResult>,
  {
    debounceMs,
    refreshIntervalMs,
  }: { debounceMs: number; refreshIntervalMs: number },
): LiveResult<TResult> => {
  const [settled, setSettled] = useState<Settled<TInput, TResult>>();
  const [isLoading, setIsLoading] = useState(false);
  // Bumped to call again for the same input: by `refresh` or the interval.
  const [round, setRound] = useState(0);
  // Bumped to re-arm the interval timer that found the page hidden.
  const [tick, setTick] = useState(0);
  const immediate = useRef(false);
  const latestRun = useRef(run);

  latestRun.current = run;

  useEffect(() => {
    if (input === null || input === undefined) {
      setIsLoading(false);

      return undefined;
    }

    let current = true;
    const delay = immediate.current ? 0 : debounceMs;

    immediate.current = false;
    setIsLoading(true);

    const timer = setTimeout(() => {
      latestRun.current(input).then(
        (result) => {
          if (current) {
            setSettled({ input, result });
            setIsLoading(false);
          }
        },
        (error: unknown) => {
          if (current) {
            setSettled({ input, error: toError(error) });
            setIsLoading(false);
          }
        },
      );
    }, delay);

    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [input, round, debounceMs]);

  const latest = settled?.input === input ? settled : undefined;
  const result = latest?.result;

  useEffect(() => {
    if (result === undefined || !refreshIntervalMs) {
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
  }, [result, refreshIntervalMs, tick]);

  const refresh = useCallback(() => {
    immediate.current = true;
    setRound((value) => value + 1);
  }, []);

  const pending = input !== null && input !== undefined;

  return {
    result,
    // Also before the effect has run for a new input.
    isLoading: pending && (isLoading || !latest),
    error: latest?.error,
    refresh,
  };
};
