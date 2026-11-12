import { useCallback, useRef, useState } from 'react';

import { toError } from '@/errors';
import type { Phase } from '@/machine/phases';
import { isOutOperationExecution } from '@/runner/flows/resume';
import type { OutOperationPlan } from '@/runner/types';
import type { Execution, ExecutionQuote } from '@/types/execution';
import {
  useExecution,
  type UseExecutionOptions,
  type UseExecutionResult,
} from '@/react/useExecution';

/**
 * - `preparing`: building the plan, measuring the fee, creating.
 * - `signing`: the wallet shows the one signature.
 * - `paying-out`: signed — the steps run and 1Click pays out.
 * - `in-flight`: another execution holds the per-wallet lock — `resume()` it
 *   or `cancel()` it.
 */
export type OutFlowStage =
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'paying-out'
  | 'success'
  | 'failed'
  | 'in-flight';

const PHASE_STAGE: Record<Phase, OutFlowStage> = {
  idle: 'idle',
  'resolving-identity': 'preparing',
  planning: 'preparing',
  creating: 'preparing',
  'awaiting-signature': 'signing',
  submitting: 'paying-out',
  // Deposit phases: only reachable by resuming another flow's execution.
  'awaiting-deposit': 'paying-out',
  expired: 'paying-out',
  settling: 'paying-out',
  success: 'success',
  failed: 'failed',
  // A declined signature cancels the execution on the spot: back to start.
  cancelled: 'idle',
};

export type UseIntentsOutFlowOptions<TArgs, TParams> = {
  /** Builds the plan for one payout from the integrator's own input. */
  buildPlan: (
    args: TArgs,
  ) => OutOperationPlan<TParams> | Promise<OutOperationPlan<TParams>>;
  onEvent?: UseExecutionOptions['onEvent'];
};

export type UseIntentsOutFlowResult<TArgs> = {
  stage: OutFlowStage;
  /** The underlying execution, for phase, status, ids… */
  exec: UseExecutionResult;
  /**
   * Builds the plan and runs it. Resolves the settled execution, or
   * `undefined` when it did not succeed (see `error`). Ignored while anything
   * is in progress.
   */
  submit: (args: TArgs) => Promise<Execution | undefined>;
  /** Building the plan, running, or cancelling. */
  isBusy: boolean;
  /** `buildPlan` threw, or the run failed. */
  error?: Error;
  /** The measured network fee, in the released token. */
  networkFee?: string;
  /** What 1Click receives: the amount less the fee budget. */
  payout?: string;
  /** The payout's 1Click quote — `amountOut`, `minAmountOut` in the destination token. */
  quote?: ExecutionQuote;
  /** The execution `resume()` / `cancel()` act on while `in-flight`. */
  recoveryExecutionId?: string;
  /**
   * Reattaches to `executionId` — e.g. a withdrawal listed after a reload —
   * else to the in-flight execution, else to this flow's own. Resolves like
   * `submit`.
   */
  resume: (executionId?: string) => Promise<Execution | undefined>;
  /** Signs the cancellation of the execution holding the lock. */
  cancel: () => Promise<void>;
  /** A created execution, never signed, still holds the lock. */
  canCancel: boolean;
};

const ignore = () => undefined;

/**
 * An out-operation from user input to settlement: steps release funds where
 * the intermediary holds them and 1Click pays them out — one signature, no
 * deposit. The withdraw counterpart of `useIntentsConnectFlow`, with the
 * phases folded into stages a progress UI can render as they are.
 */
export const useIntentsOutFlow = <TArgs, TParams = unknown>({
  buildPlan,
  onEvent,
}: UseIntentsOutFlowOptions<
  TArgs,
  TParams
>): UseIntentsOutFlowResult<TArgs> => {
  const exec = useExecution({ onEvent });

  const [isBuilding, setIsBuilding] = useState(false);
  const [preparationError, setPreparationError] = useState<Error>();
  // A ref, not state: a double click lands before React re-renders.
  const submitting = useRef(false);

  const latest = useRef({ buildPlan, exec });

  latest.current = { buildPlan, exec };

  const recoveryExecutionId =
    exec.recovery?.kind === 'resume-or-cancel'
      ? exec.recovery.executionId
      : undefined;

  let stage = PHASE_STAGE[exec.phase];

  if (isBuilding) {
    stage = 'preparing';
  } else if (recoveryExecutionId) {
    stage = 'in-flight';
  } else if (preparationError) {
    stage = 'failed';
  }

  const submit = useCallback(async (args: TArgs) => {
    const { current } = latest;

    if (submitting.current || current.exec.isBusy) {
      return undefined;
    }

    submitting.current = true;
    setIsBuilding(true);
    setPreparationError(undefined);

    try {
      let run: Promise<Execution>;

      try {
        run = current.exec.runOut(await current.buildPlan(args));
      } catch (error) {
        setPreparationError(toError(error));

        return undefined;
      } finally {
        // The run has moved the phase on by now: the stage follows it.
        setIsBuilding(false);
      }

      // The run's own failures land on `exec.error` / `exec.recovery`.
      return await run.catch(ignore);
    } finally {
      submitting.current = false;
    }
  }, []);

  const resume = useCallback(async (executionId?: string) => {
    const current = latest.current.exec;
    const id =
      executionId ?? current.recovery?.executionId ?? current.executionId;

    if (!id) {
      return undefined;
    }

    // No deposit options: an out-operation has none, and another flow's
    // execution resumed here only surfaces its deposit address.
    return current.resume(id).catch(ignore);
  }, []);

  const cancel = useCallback(async () => {
    const current = latest.current.exec;
    const executionId = current.recovery?.executionId ?? current.executionId;

    await current.cancel(executionId).catch(ignore);
  }, []);

  const quote =
    exec.execution && isOutOperationExecution(exec.execution)
      ? exec.execution.quote
      : undefined;

  // A guard after the real create (fee over budget, quote moved) leaves the
  // execution holding the lock until it is cancelled.
  const canCancel =
    !!recoveryExecutionId ||
    (exec.phase === 'failed' &&
      !!exec.executionId &&
      !exec.hasSubmittedSignature);

  return {
    stage,
    exec,
    submit,
    isBusy: exec.isBusy || isBuilding || exec.isCancelling,
    error: preparationError ?? exec.error,
    networkFee: exec.networkFee,
    payout: exec.spendable,
    quote,
    recoveryExecutionId,
    resume,
    cancel,
    canCancel,
  };
};
