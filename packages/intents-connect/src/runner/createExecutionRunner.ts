import {
  ExecutionCancelledError,
  failGuard,
  RunnerDisposedError,
} from '@/errors';
import { defaultLogger } from '@/logger';
import type { Context } from '@/machine/context';
import { createExecutionMachine, moveTo } from '@/machine/machine';
import { isTerminalPhase, type Phase } from '@/machine/phases';
import type { WalletConnector } from '@/types/wallet';
import {
  DEFAULT_MAX_POLL_ATTEMPTS,
  DEFAULT_POLL_INTERVAL_MS,
  DOOMED_FLOW_SETTLE_TIMEOUT_MS,
} from '@/runner/constants';
import type { RunnerCtx, RunnerState } from '@/runner/ctx';
import type { DepositPlan } from '@/runner/depositPlan';
import { resume } from '@/runner/flows/resume';
import { retryDeposit } from '@/runner/flows/retryDeposit';
import { run } from '@/runner/flows/run';
import { cancel } from '@/runner/stages/cancel';
import type {
  ExecutionPlan,
  ExecutionRunner,
  ExecutionRunnerOptions,
  ResumeDepositOptions,
  RunnerEvent,
} from '@/runner/types';

/**
 * Whether `settling` resolved before the timeout. Never rejects, and always
 * clears its timer, so a settled flow cannot leave a pending handle keeping a
 * Node/SSR event loop alive.
 */
const settlesWithin = async (
  settling: Promise<void> | undefined,
  timeoutMs: number,
): Promise<boolean> => {
  if (!settling) {
    return true;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      settling.then(() => true),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Assembles the runner: defaults the options, owns the machine and the
 * mutable {@link RunnerState}, and builds the {@link RunnerCtx} every stage
 * (`stages/*`) and flow (`flows/*`) receives. All lifecycle logic lives in
 * those modules; this file is only the wiring.
 */
export const createExecutionRunner = (
  options: ExecutionRunnerOptions,
): ExecutionRunner => {
  const {
    api,
    wallet,
    plugins,
    pluginOptions,
    makeTransfer: makeTransferOverride,
    autoCancelOnSignatureRejection = true,
    logger = defaultLogger,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    maxPollAttempts = DEFAULT_MAX_POLL_ATTEMPTS,
    onEvent,
  } = options;

  const machine = createExecutionMachine();

  // Resolved per use rather than captured once, so an accessor always yields the
  // current connector and optional members (`makeTransfer`, `decodePublicKey`)
  // are detected on the live object rather than a stale snapshot.
  const getWallet = (): WalletConnector =>
    typeof wallet === 'function' ? wallet() : wallet;

  const state: RunnerState = {
    cancelledExecutionIds: new Set(),
    depositSentExecutionIds: new Set(),
    disposed: false,
    flowInFlight: false,
    flowSettled: undefined,
    wakeSleepers: new Set(),
    activePlan: undefined,
    activePlanExecutionId: undefined,
  };

  // Copied before iterating: each resolver removes itself from the set.
  const wakeAllSleepers = () => {
    [...state.wakeSleepers].forEach((wake) => wake());
  };

  /**
   * One flow at a time. The phase-based check in `prepareForNewFlow` cannot
   * cover `retryDeposit()`, whose legitimate entry phase (`awaiting-deposit`)
   * is also where a live flow holds while a transfer prompt is open or the QR
   * settle loop is polling — re-entering there would double-drive the same
   * execution (two wallet prompts for the same funds, twin settle loops).
   */
  const withFlowLock = async <T>(fn: () => Promise<T>): Promise<T> => {
    while (state.flowInFlight) {
      // A flow whose execution was cancelled is already unwinding — its
      // rejection just needs to finish propagating (or its in-flight poll to
      // return) before the lock frees. `await cancel()` followed by `run()`
      // is the sanctioned recovery, so wait the unwind out instead of failing
      // it; anything else in flight is a genuine concurrent flow.
      const drivingId = machine.context.executionId;

      const doomed =
        drivingId !== undefined && state.cancelledExecutionIds.has(drivingId);

      if (!doomed) {
        failGuard(
          'EXECUTION_IN_FLIGHT',
          'this runner is already driving an execution — wait for it, or cancel() it',
          drivingId ? { executionId: drivingId } : undefined,
        );
      }

      // BOUNDED. Nothing can abort a doomed flow parked on an open wallet
      // prompt — providers keep `personal_sign` / `eth_sendTransaction`
      // pending until the popup is dismissed — so an unbounded wait would
      // hang `await cancel(); run()` with no feedback at all. A timeout turns
      // that into the same actionable guard the non-doomed branch throws.
      // eslint-disable-next-line no-await-in-loop
      const settled = await settlesWithin(
        state.flowSettled,
        DOOMED_FLOW_SETTLE_TIMEOUT_MS,
      );

      if (!settled) {
        failGuard(
          'EXECUTION_IN_FLIGHT',
          'the cancelled execution has not released this runner yet — a wallet prompt from it is probably still open; dismiss it, or use another runner',
          drivingId ? { executionId: drivingId } : undefined,
        );
      }
    }

    state.flowInFlight = true;

    let release!: () => void;

    state.flowSettled = new Promise<void>((resolve) => {
      release = resolve;
    });

    try {
      return await fn();
    } finally {
      state.flowInFlight = false;
      state.flowSettled = undefined;
      release();
    }
  };

  const emit = (event: RunnerEvent) => onEvent?.(event);

  const patch = (values: Partial<Context>) => {
    Object.assign(machine.context, values);
  };

  const to = (phase: Phase) =>
    moveTo(machine, phase, {
      logger,
      onMoved: (moved) => emit({ type: 'phase', phase: moved }),
    });

  const resetToIdle = () => {
    machine.reset();
    emit({ type: 'phase', phase: 'idle' });
  };

  const throwIfDisposed = () => {
    if (state.disposed) {
      throw new RunnerDisposedError(machine.context.executionId);
    }
  };

  const throwIfCancelled = (executionId: string) => {
    if (state.cancelledExecutionIds.has(executionId)) {
      throw new ExecutionCancelledError(executionId);
    }
  };

  const assertLive = (executionId: string) => {
    throwIfCancelled(executionId);
    throwIfDisposed();
  };

  /**
   * Refuses re-entry while an execution is being driven, then clears the
   * previous run's machine state. Without the reset, a retry after a terminal
   * phase would run invisibly (terminal phases have no outgoing transitions)
   * against stale context — e.g. a `bakedAmount` from a previous threeRound
   * run spuriously tripping the QUOTE_MOVED guard.
   */
  const prepareForNewFlow = () => {
    throwIfDisposed();

    if (machine.current !== 'idle' && !isTerminalPhase(machine.current)) {
      const { executionId } = machine.context;

      failGuard(
        'EXECUTION_IN_FLIGHT',
        `this runner is already driving an execution (phase: ${machine.current}) — wait for it, cancel() it, or use another runner`,
        // Carried so `deriveExecutionRecovery` can offer resume-or-cancel
        // instead of a dead end — the guard's documented contract
        // (`GuardMeta.executionId`), which only `noExecutionInFlight` honoured.
        executionId ? { executionId } : undefined,
      );
    }

    machine.reset();
    state.cancelledExecutionIds.clear();
  };

  const requireAddress = (): string => {
    const address = getWallet().getAddress();

    if (!address) {
      return failGuard('WALLET_NOT_CONNECTED', 'no wallet is connected');
    }

    return address;
  };

  const setActivePlan = (plan: DepositPlan, executionId: string) => {
    state.activePlan = plan;
    state.activePlanExecutionId = executionId;
  };

  const clearActivePlanFor = (executionId: string) => {
    if (state.activePlanExecutionId === executionId) {
      state.activePlan = undefined;
      state.activePlanExecutionId = undefined;
    }
  };

  const ctx: RunnerCtx = {
    machine,
    state,
    api,
    logger,
    plugins,
    pluginOptions,
    makeTransferOverride,
    autoCancelOnSignatureRejection,
    pollIntervalMs,
    maxPollAttempts,
    getWallet,
    emit,
    patch,
    to,
    resetToIdle,
    wakeAllSleepers,
    requireAddress,
    throwIfDisposed,
    throwIfCancelled,
    assertLive,
    prepareForNewFlow,
    setActivePlan,
    clearActivePlanFor,
  };

  return {
    run: <TParams>(plan: ExecutionPlan<TParams>) =>
      withFlowLock(() => run(ctx, plan)),
    resume: (executionId: string, resumeOptions?: ResumeDepositOptions) =>
      withFlowLock(() => resume(ctx, executionId, resumeOptions)),
    retryDeposit: () => withFlowLock(() => retryDeposit(ctx)),
    cancel: (executionId?: string) => cancel(ctx, executionId),
    dispose: () => {
      state.disposed = true;
      // Wake any in-flight polling sleep so the loop hits its disposed
      // checkpoint now, not after up to a full poll interval.
      wakeAllSleepers();
    },
    isDisposed: () => state.disposed,
    getPhase: () => machine.current,
    getStore: () => machine.getStore(),
  };
};
