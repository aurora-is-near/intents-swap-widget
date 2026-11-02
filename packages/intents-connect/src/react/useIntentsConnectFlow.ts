import { useCallback, useRef, useState } from 'react';

import type { ExecutionPlan } from '@/runner/types';
import {
  useExecution,
  type UseExecutionOptions,
  type UseExecutionResult,
} from '@/react/useExecution';

/**
 * - `IDLE`: nothing to recover; `submit` starts a new execution.
 * - `IN_FLIGHT`: an execution is live (this session or a previous one) —
 *   `resume()` it or `cancel()` it.
 * - `FAILED`: the deposit transfer was rejected or failed — `retryDeposit()`
 *   or `cancel()`.
 */
export type IntentsConnectFlowState = 'IDLE' | 'IN_FLIGHT' | 'FAILED';

export type UseIntentsConnectFlowOptions<TArgs, TParams> = {
  /**
   * Builds the plan for one submission from the integrator's own input
   * (token, amount, recipient…). May read chain state first.
   */
  buildPlan: (
    args: TArgs,
  ) => ExecutionPlan<TParams> | Promise<ExecutionPlan<TParams>>;
  /**
   * Replaces the default `exec.run(plan)` — e.g. to `preview` first and ask
   * the user to confirm the quote.
   */
  executePlan?: (
    plan: ExecutionPlan<TParams>,
    exec: UseExecutionResult,
  ) => Promise<unknown>;
  onEvent?: UseExecutionOptions['onEvent'];
};

export type UseIntentsConnectFlowResult<TArgs> = {
  /** The underlying execution, for phase, fees, deposit address, errors… */
  exec: UseExecutionResult;
  /** Builds the plan and runs it. Ignored while anything is in progress. */
  submit: (args: TArgs) => Promise<void>;
  state: IntentsConnectFlowState;
  /** The execution `resume()` / `cancel()` act on in a recovery state. */
  recoveryExecutionId?: string;
  /** Building the plan, running, or cancelling. */
  isBusy: boolean;
  /** `buildPlan` (or `executePlan`) threw — the execution never started. */
  preparationError?: Error;
  /**
   * Reattaches to the live execution. Pass `depositViaWallet: true` only when
   * you know no deposit was made: it lets a resume the runner did not drive
   * itself (a reload, a wallet switch) prompt the wallet transfer again.
   * Left unset, such a resume only surfaces the deposit address, so funds
   * are never sent twice. `false` never prompts.
   */
  resume: (options?: { depositViaWallet?: boolean }) => Promise<void>;
  /** Re-prompts the rejected or failed deposit transfer. */
  retryDeposit: () => Promise<void>;
  /** Signs the cancellation of the live (or recovering) execution. */
  cancel: () => Promise<void>;
  /**
   * The user has to send the deposit themselves (QR / exchange): show
   * `exec.depositAddress`, `exec.depositMemo` and `exec.deadline`.
   */
  needsExternalDeposit: boolean;
  /** A dead end the user can back out of. */
  canCancel: boolean;
};

const ignore = () => undefined;

/**
 * The whole Intents Connect flow for integrator-provided steps: build a plan
 * from user input, run it, and expose the recovery states — the glue every
 * integration otherwise writes itself (promoted from the demo app).
 *
 * Steps-only executions and preview-then-run quotes stay on `useExecution`,
 * available here as `exec`.
 */
export const useIntentsConnectFlow = <TArgs, TParams = unknown>({
  buildPlan,
  executePlan,
  onEvent,
}: UseIntentsConnectFlowOptions<
  TArgs,
  TParams
>): UseIntentsConnectFlowResult<TArgs> => {
  const exec = useExecution({ onEvent });

  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationError, setPreparationError] = useState<Error>();
  // A ref, not state: a double click lands before React re-renders.
  const submitting = useRef(false);
  const lastDepositViaWallet = useRef<boolean | undefined>(undefined);

  const latest = useRef({ buildPlan, executePlan, exec });

  latest.current = { buildPlan, executePlan, exec };

  const { recovery } = exec;

  let state: IntentsConnectFlowState = 'IDLE';

  if (recovery?.kind === 'resume-or-cancel') {
    state = 'IN_FLIGHT';
  } else if (recovery?.kind === 'retry-transfer') {
    state = 'FAILED';
  }

  const recoveryExecutionId = recovery?.executionId;

  const isBusy = exec.isBusy || isPreparing || exec.isCancelling;

  const submit = useCallback(async (args: TArgs) => {
    const { current } = latest;

    if (submitting.current || current.exec.isBusy) {
      return;
    }

    submitting.current = true;
    setIsPreparing(true);
    setPreparationError(undefined);

    try {
      const plan = await current.buildPlan(args);

      lastDepositViaWallet.current = plan.depositViaWallet;

      if (current.executePlan) {
        await current.executePlan(plan, current.exec);
      } else {
        // The run's own failures land on `exec.error` / `exec.recovery`.
        await current.exec.run(plan).catch(ignore);
      }
    } catch (error) {
      setPreparationError(
        error instanceof Error ? error : new Error(String(error)),
      );
    } finally {
      submitting.current = false;
      setIsPreparing(false);
    }
  }, []);

  const resume = useCallback(
    async ({ depositViaWallet }: { depositViaWallet?: boolean } = {}) => {
      const current = latest.current.exec;
      const executionId = current.recovery?.executionId ?? current.executionId;

      if (!executionId) {
        return;
      }

      await current
        // Deliberately NOT defaulted from the last submit: `true` turns off
        // the runner's "may already be sent" guard for any runner that did
        // not broadcast the deposit itself, so a rebuilt runner would
        // re-prompt a transfer that already went out.
        .resume(executionId, { depositViaWallet })
        .catch(ignore);
    },
    [],
  );

  const retryDeposit = useCallback(async () => {
    await latest.current.exec.retryDeposit().catch(ignore);
  }, []);

  const cancel = useCallback(async () => {
    const current = latest.current.exec;
    // Recovery states name the execution they recover; waiting for a deposit
    // is not one, so it falls back to the execution being driven.
    const executionId = current.recovery?.executionId ?? current.executionId;

    await current.cancel(executionId).catch(ignore);
  }, []);

  // The engine holds 'awaiting-deposit' the whole time funds are expected
  // ('expired' is its revivable variant). Not while a failed transfer awaits
  // a retry, nor while the engine is driving the wallet's own transfer.
  const needsExternalDeposit =
    !!exec.depositAddress &&
    !exec.depositTxHash &&
    (exec.phase === 'awaiting-deposit' || exec.phase === 'expired') &&
    state !== 'FAILED' &&
    !(lastDepositViaWallet.current !== false && state === 'IDLE' && isBusy);

  // A Solana create can fail its fee check before any signature while
  // already holding the lock.
  const solanaCreateFailed =
    exec.execution?.type === 'solana' &&
    exec.phase === 'failed' &&
    exec.status === 'CREATED';

  const canCancel =
    state !== 'IDLE' || needsExternalDeposit || solanaCreateFailed;

  return {
    exec,
    submit,
    state,
    recoveryExecutionId,
    isBusy,
    preparationError,
    resume,
    retryDeposit,
    cancel,
    needsExternalDeposit,
    canCancel,
  };
};
