import { failGuard, GuardError, IntentsConnectApiError } from '@/errors';
import * as guards from '@/machine/guards';
import {
  type Execution,
  IN_FLIGHT_STATUSES,
  type Step,
} from '@/types/execution';
import type { Captured } from '@/runner/capture';
import type { RunnerCtx } from '@/runner/ctx';
import { buildBody } from '@/runner/planHelpers';
import type { ExecutionPlan } from '@/runner/types';

export const create = async <TParams>(
  ctx: RunnerCtx,
  plan: ExecutionPlan<TParams>,
  steps: Step[],
  /**
   * The in-flight preflight, started by `run()` alongside identity resolution
   * so it does not add a serial round-trip right before the wallet prompt.
   * Captured, so a flow that dies earlier cannot turn a lost preflight into
   * an unhandled rejection; absent, `create` lists inline.
   */
  preflight?: Promise<Captured<Execution[]>>,
): Promise<Execution> => {
  const { api, getWallet, requireAddress, to, patch, emit, machine } = ctx;

  to('creating');

  guards.stepsRequiredForRealCreate(steps);

  const address = requireAddress();

  const listInFlight = () =>
    api.listExecutions(address, { status: IN_FLIGHT_STATUSES });

  // Pre-empt the 409 in-flight lock with an actionable local error. Every
  // status the service still holds the lock for has to be queried, not just
  // CREATED — a deposited-but-unsettled execution holds it too.
  let inFlight: Execution[];

  if (preflight) {
    const captured = await preflight;

    // The captured snapshot is as old as planning took (threeRound: two dry
    // rounds). A transient failure inside it must not fail a create the
    // server would accept — list fresh instead of rethrowing a stale error.
    inFlight = captured.ok ? captured.value : await listInFlight();

    // Symmetrically, an execution the snapshot saw open may have reached a
    // terminal status since. Re-confirm before failing a run the server would
    // accept — the extra round-trip only ever runs on the would-fail path,
    // and best effort: a transient failure keeps the snapshot, so the
    // actionable EXECUTION_IN_FLIGHT guard (its meta.executionId drives the
    // resume-or-cancel recovery) is not replaced by a generic network error.
    if (captured.ok && inFlight.length > 0) {
      try {
        inFlight = await listInFlight();
      } catch {
        // Keep the snapshot.
      }
    }
  } else {
    inFlight = await listInFlight();
  }

  guards.noExecutionInFlight(inFlight);

  let execution: Execution;

  try {
    execution = await api.createExecution(
      address,
      buildBody(getWallet, plan, steps, false),
    );
  } catch (error) {
    if (error instanceof IntentsConnectApiError && error.isExecutionInFlight) {
      // The preflight raced: another create won between its check and ours.
      // Best effort, re-list and rethrow through the SAME guard the preflight
      // uses, so both EXECUTION_IN_FLIGHT paths carry the identical message
      // and `meta.executionId` — recovery (resume-or-cancel) derives from the
      // meta, and without it a UI gets a dead-end failure.
      let open: Execution | undefined;

      try {
        [open] = await listInFlight();
      } catch {
        // Fall through to the message-only guard error.
      }

      if (open) {
        guards.noExecutionInFlight([open]);
      }

      return failGuard('EXECUTION_IN_FLIGHT', error.message);
    }

    throw error;
  }

  // Recorded BEFORE the post-create guards: the execution now exists
  // server-side and holds the in-flight lock, so if a guard below throws,
  // the id must already be in context for `cancel()` to clear it.
  patch({
    execution,
    executionId: execution.id,
    status: execution.status,
    networkFee: execution.details.networkFee ?? machine.context.networkFee,
  });

  emit({ type: 'created', executionId: execution.id });

  try {
    const { bakedAmount } = machine.context;

    if (bakedAmount) {
      guards.quoteMustNotHaveMoved(bakedAmount, execution.quote.minAmountOut);
    }

    guards.mustHaveSigningPayload(execution);
  } catch (error) {
    if (error instanceof GuardError) {
      throw new GuardError(
        error.code,
        `${error.message} — execution ${execution.id} was created and holds the in-flight lock; cancel('${execution.id}') clears it`,
        // Forwarded, never rebuilt: the re-wrap only appends context to the
        // message, so dropping the original guard's structured meta would
        // silently downgrade a UI's recovery actions to prose parsing.
        error.meta,
      );
    }

    throw error;
  }

  return execution;
};
