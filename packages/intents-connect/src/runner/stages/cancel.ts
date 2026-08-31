import { signIntentsConnectText } from '@/signers/intentsConnect';
import type { RunnerCtx } from '@/runner/ctx';

export const cancel = async (ctx: RunnerCtx, executionId?: string) => {
  const { api, machine, state, getWallet, requireAddress, patch, to } = ctx;

  // dispose()'s contract — no further wallet or API side effect — binds
  // cancel too: a disposed runner's owner has been rebound, so prompting a
  // delete signature or deleting server-side would act for the wrong context.
  ctx.throwIfDisposed();

  const id = executionId ?? machine.context.executionId;

  if (!id) {
    throw new Error('no execution to cancel');
  }

  const activeWallet = getWallet();

  // Flagged before the wallet is touched and cleared in the `finally` below,
  // so a UI can label the prompt it is about to show — the phase alone
  // cannot say it, since cancelling interrupts whatever phase was current.
  patch({ isCancelling: true });

  try {
    const envelope = await signIntentsConnectText({
      text: `delete_execution:${id}`,
      standard: activeWallet.signingStandard,
      address: requireAddress(),
      providers: activeWallet.getProviders(),
      decodePublicKey: activeWallet.decodePublicKey?.bind(activeWallet),
    });

    // The wallet prompt can sit open across a dispose(); a signature approved
    // after it must not be turned into a server-side delete on behalf of the
    // rebound context — the same checkpoint every other stage places right
    // before its side effect.
    ctx.throwIfDisposed();

    // Flagged BEFORE the delete round-trip so any concurrent stage — the poll
    // loop, a pending signature submit, a pending transfer — stops at its next
    // checkpoint. Rolled back if the delete fails, so a live run is not halted
    // for an execution that still exists.
    const wasAlreadyCancelled = state.cancelledExecutionIds.has(id);

    state.cancelledExecutionIds.add(id);

    try {
      await api.deleteExecution(requireAddress(), id, envelope);
    } catch (error) {
      if (!wasAlreadyCancelled) {
        state.cancelledExecutionIds.delete(id);
      }

      throw error;
    }

    // The cancelled execution's plan must not survive it: a later resume()
    // matching on a recycled id would otherwise replay a transfer for an
    // execution that no longer exists.
    ctx.clearActivePlanFor(id);

    // The machine cleanup below describes THIS runner's execution — it must
    // not run when an explicit id targets some other execution (a stale one
    // from an earlier session, cancelled while this runner drives a live
    // one). The delete already happened either way; only the local state is
    // ownership-gated. An empty context.executionId counts as ownership only
    // while NO flow is in flight: then the runner never recorded one (e.g.
    // the in-flight preflight failed before create) and the cancel IS this
    // runner's recovery — but a live flow that has not reached create() yet
    // also has no id, and wiping its context mid-planning would report a run
    // as cancelled while it keeps executing.
    const ownsMachineState =
      machine.context.executionId === id ||
      (machine.context.executionId === undefined && !state.flowInFlight);

    if (!ownsMachineState) {
      return;
    }

    // The delete is final, so any polling loop can be woken to hit its
    // cancelled checkpoint right away. Only after the delete: waking earlier
    // would kill the loop for a delete that might still fail and roll back.
    ctx.wakeAllSleepers();

    // Nothing that DESCRIBES the deleted execution may outlive it. A UI keys
    // its recovery actions off `error` and renders `status` / `networkFee` /
    // the deposit address, all of which now refer to something that no longer
    // exists server-side — a cancelled execution reporting `status: CREATED`
    // is simply false. `executionId` stays, so a UI can still name what was
    // cancelled, as does `intermediary`, which is per wallet rather than per
    // execution. Only needed on the legal-transition path; the reset below
    // clears everything on the terminal-phase path.
    patch({
      error: undefined,
      execution: undefined,
      status: undefined,
      networkFee: undefined,
      spendable: undefined,
      bakedAmount: undefined,
      depositAddress: undefined,
      depositMemo: undefined,
      deadline: undefined,
      depositTxHash: undefined,
      hasSubmittedSignature: false,
    });

    // `to` refuses the move when the machine sits in a terminal phase — the
    // common case being `failed` after the EXECUTION_IN_FLIGHT guard, where
    // the execution being cancelled blocks a run this runner never started.
    // The delete succeeded either way, so the stale terminal state (and the
    // guard error a UI keys its recovery controls on) must not outlive it:
    // reset to a clean idle so the next run starts unblocked.
    if (!to('cancelled')) {
      ctx.resetToIdle();
    }
  } finally {
    patch({ isCancelling: false });
  }
};
