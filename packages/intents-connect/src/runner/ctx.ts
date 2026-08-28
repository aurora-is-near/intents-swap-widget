import type { IntentsConnectApi } from '@/api/types';
import type { Logger } from '@/logger';
import type { Context } from '@/machine/context';
import type { ExecutionMachine } from '@/machine/machine';
import type { Phase } from '@/machine/phases';
import type { MakeTransfer, TransferPlugins } from '@/types/transfer';
import type { WalletConnector } from '@/types/wallet';
import type { DepositPlan } from '@/runner/depositPlan';
import type { RunnerEvent } from '@/runner/types';

/**
 * The runner's mutable state, shared BY REFERENCE with every stage and flow.
 *
 * Fields are read live, at the moment of use — a `cancel()` or `dispose()`
 * landing while a wallet prompt sits open must be observed by the very next
 * checkpoint. Never copy these into locals across an `await`.
 */
export type RunnerState = {
  /**
   * Ids `cancel()` has deleted server-side; observed at every
   * wallet-interaction boundary and by the polling loop. A SET, not a slot:
   * cancelling a second (stale) execution must not disarm the checkpoint for
   * the first — a signing prompt for it may still be open.
   */
  cancelledExecutionIds: Set<string>;
  /**
   * Ids this runner has already broadcast a deposit transfer for. Lives on
   * `state` rather than the context because `prepareForNewFlow()` resets the
   * machine: a same-session `resume()` would otherwise forget that it had
   * already sent the funds and prompt a second transfer for them.
   *
   * Never cleared by a new flow — a broadcast tx cannot be un-sent, and the
   * whole point is to outlive the flow that sent it.
   */
  depositSentExecutionIds: Set<string>;
  /**
   * Set by `dispose()`. A disposed runner must stop touching the wallet and
   * the API: its owner has been rebound (typically to another account), so any
   * further side effect would act on behalf of the wrong context.
   */
  disposed: boolean;
  /**
   * True while a flow (`run` / `resume` / `retryDeposit`) is executing. The
   * phase alone cannot gate re-entry: `awaiting-deposit` is both a live hold
   * (settle polling, a transfer prompt open) and the parked state a
   * DepositTransferError leaves behind for `retryDeposit()` — and only the
   * former must refuse a concurrent flow, or a double-clicked retry opens a
   * second wallet transfer prompt for the same funds.
   */
  flowInFlight: boolean;
  /**
   * Resolves when the flow holding `flowInFlight` releases it. `run()` after
   * `await cancel()` needs it: the cancelled flow's rejection takes a few
   * microtask hops (or an in-flight poll round-trip) to reach the lock's
   * `finally`, and failing the new run for that window would be spurious.
   * `undefined` while no flow is in flight.
   */
  flowSettled: Promise<void> | undefined;
  /**
   * Resolvers for in-flight polling sleeps. `dispose()` (and a completed
   * `cancel()`) call them so the settle loop observes its flag immediately
   * instead of after up to a full poll interval — which also releases the
   * loop's closure (machine, execution, plan) and, under Node/SSR, the timer
   * keeping the event loop alive.
   */
  wakeSleepers: Set<() => void>;
  /** The deposit leg of the current run, kept so `retryDeposit()` can replay the transfer. */
  activePlan: DepositPlan | undefined;
  /**
   * The id of the execution `activePlan` was created FOR. `resume()` needs it
   * to tell a same-session resume (safe to replay the plan's transfer) from a
   * cross-session one that merely reuses a runner still holding an unrelated
   * plan — context.executionId cannot be used for that, because resume patches
   * it to the resumed id before the check.
   */
  activePlanExecutionId: string | undefined;
};

/**
 * Everything a stage or flow needs from the runner, assembled once by the
 * factory. Options are already defaulted; helpers are closures over the
 * machine and `state` so extracted code shares the factory's live view.
 */
export type RunnerCtx = {
  machine: ExecutionMachine;
  state: RunnerState;
  api: IntentsConnectApi;
  logger: Logger;
  plugins?: TransferPlugins;
  pluginOptions?: unknown;
  makeTransferOverride?: MakeTransfer<void>;
  autoCancelOnSignatureRejection: boolean;
  pollIntervalMs: number;
  maxPollAttempts: number;
  /**
   * Resolved per use rather than captured once, so an accessor always yields
   * the current connector and optional members (`makeTransfer`,
   * `decodePublicKey`) are detected on the live object rather than a stale
   * snapshot.
   */
  getWallet: () => WalletConnector;
  emit: (event: RunnerEvent) => void;
  patch: (values: Partial<Context>) => void;
  /** Guarded transition; the boolean is load-bearing for cancel's fallback. */
  to: (phase: Phase) => boolean;
  /**
   * The one sanctioned escape from a terminal phase: resets the machine and
   * emits the resulting `idle` — the reset counterpart of `to`, so no call
   * site hand-rolls its own reset-plus-emit.
   */
  resetToIdle: () => void;
  /**
   * Wakes every in-flight polling sleep. One helper on purpose: the
   * copy-before-iterate subtlety (each resolver removes itself from the live
   * set) must not be re-derived per call site.
   */
  wakeAllSleepers: () => void;
  requireAddress: () => string;
  throwIfDisposed: () => void;
  throwIfCancelled: (executionId: string) => void;
  /**
   * `throwIfCancelled` then `throwIfDisposed`, in that order. Only for the
   * sites that already check in that order (sign/submit, deposit) — the
   * settle loop checks disposed first, and which error wins is observable.
   */
  assertLive: (executionId: string) => void;
  prepareForNewFlow: () => void;
  /** The paired `activePlan` + `activePlanExecutionId` write. */
  setActivePlan: (plan: DepositPlan, executionId: string) => void;
  /** Clears the pair only when it belongs to `executionId`. */
  clearActivePlanFor: (executionId: string) => void;
};
