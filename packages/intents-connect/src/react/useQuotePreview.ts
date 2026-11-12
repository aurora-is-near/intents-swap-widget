import type { ExecutionPlan, ExecutionPreview } from '@/runner/types';
import type { UseExecutionResult } from '@/react/useExecution';
import { useLiveResult } from '@/react/useLiveResult';

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
  const { result, isLoading, error, refresh } = useLiveResult(
    plan,
    (current: ExecutionPlan<TParams>) => exec.preview(current),
    { debounceMs, refreshIntervalMs },
  );

  return {
    preview: result,
    isLoading,
    error,
    expiresAt: result ? deadlineOf(result) : undefined,
    refresh,
  };
};
