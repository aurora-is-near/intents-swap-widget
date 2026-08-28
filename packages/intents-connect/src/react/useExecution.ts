import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useSnapshot } from 'valtio';
import type { IntentsConnectApi } from '@/api/types';
import { failGuard } from '@/errors';
import { createExecutionMachine } from '@/machine/machine';
import { isInFlightPhase, type Phase } from '@/machine/phases';
import { deriveExecutionRecovery, type ExecutionRecovery } from '@/recovery';
import { createExecutionRunner } from '@/runner/createExecutionRunner';
import type {
  ExecutionPlan,
  ResumeDepositOptions,
  RunnerEvent,
} from '@/runner/types';
import type { Execution, ExecutionStatus } from '@/types/execution';
import type { WalletConnector } from '@/types/wallet';

import { useIntentsConnect } from '@/react/context';

export type UseExecutionOptions = {
  /** Called for every runner event, in order. */
  onEvent?: (event: RunnerEvent) => void;
};

export type UseExecutionResult = {
  phase: Phase;
  status?: ExecutionStatus;
  executionId?: string;
  execution?: Execution;

  /** Exact figures. Only populated by the `threeRound` fee strategy. */
  networkFee?: string;
  spendable?: string;

  /** Only ever set after the signature is submitted. */
  depositAddress?: string;
  depositMemo?: string | null;
  /** ISO — the deposit-address validity deadline. */
  deadline?: string;
  depositTxHash?: string;

  error?: Error;
  /** Actionable classification of `error` — see `ExecutionRecovery`. */
  recovery?: ExecutionRecovery;
  /**
   * A `delete_execution` signature is being prompted. Orthogonal to `phase`,
   * which still names the stage the cancellation interrupted — label the
   * wallet prompt from THIS, not from the phase.
   */
  isCancelling: boolean;
  isBusy: boolean;

  run: <TParams>(plan: ExecutionPlan<TParams>) => Promise<Execution>;
  resume: (
    executionId: string,
    options?: ResumeDepositOptions,
  ) => Promise<Execution>;
  /** Re-prompts a rejected/failed deposit transfer (`DepositTransferError`). */
  retryDeposit: () => Promise<Execution>;
  cancel: (executionId?: string) => Promise<void>;
};

/**
 * What actually distinguishes one runner's wallet from another: the account it
 * is bound to and the standard it signs with. One helper on purpose — the
 * runner detects a mid-execution account switch by comparing two of these, so
 * the derivation must never drift between call sites (the provider memoises
 * its context value on the same key).
 */
export const deriveWalletKey = (wallet: WalletConnector): string =>
  `${wallet.signingStandard}:${wallet.getAddress() ?? ''}`;

/**
 * Binds one execution runner to React.
 *
 * The runner is created once per hook instance and its valtio store is read
 * through `useSnapshot`, so only components that read a changed field re-render.
 */
export const useExecution = (
  options: UseExecutionOptions = {},
): UseExecutionResult => {
  const context = useIntentsConnect();
  const { api, wallet, ...runnerOptions } = context;

  // Kept in a ref so a changing callback identity does not rebuild the runner
  // (which would discard the live execution's state).
  const onEventRef = useRef(options.onEvent);

  onEventRef.current = options.onEvent;

  // Same reasoning for the connector itself. Most React connectors return a
  // fresh object every render, so depending on its identity would rebuild the
  // runner on every render — and because the runner emits events that trigger
  // renders, a live execution would be reset to `idle` mid-flight.
  //
  // The CONTEXT VALUE is held, not `wallet` itself: the provider hands out a
  // live `get wallet()` and keeps that object's identity stable across a
  // connector swap at the same key (see IntentsConnectProvider). Snapshotting
  // `wallet` per render would defeat that for any consumer that does not
  // re-render — a memoized subtree would keep driving the runner with a
  // torn-down provider — whereas re-reading the getter always yields the
  // current connector, re-render or not.
  const contextRef = useRef(context);

  contextRef.current = context;

  // And the api client, for the same reason: an inline
  // `api={createIntentsConnectApi(...)}` changes identity every render. Nothing
  // about swapping the client should invalidate a live execution, so the runner
  // gets a stable façade that forwards to whichever client is current.
  const apiRef = useRef(api);

  apiRef.current = api;

  const stableApi = useMemo<IntentsConnectApi>(
    () => ({
      getIntermediary: (...args) => apiRef.current.getIntermediary(...args),
      createExecution: (...args) => apiRef.current.createExecution(...args),
      createStepsExecution: (...args) =>
        apiRef.current.createStepsExecution(...args),
      listSupportedTokens: (...args) =>
        apiRef.current.listSupportedTokens(...args),
      submitSignature: (...args) => apiRef.current.submitSignature(...args),
      recordDeposit: (...args) => apiRef.current.recordDeposit(...args),
      listExecutions: (...args) => apiRef.current.listExecutions(...args),
      deleteExecution: (...args) => apiRef.current.deleteExecution(...args),
    }),
    [],
  );

  /**
   * Both the standard and the account feed the intermediary address and the
   * signing path, so a change of key genuinely invalidates an in-flight
   * execution — unlike a change of object identity.
   */
  const walletKey = wallet ? deriveWalletKey(wallet) : null;

  // Bumped when the deferred dispose below is found to have already fired:
  // disposal is irreversible, so the memoized runner is then permanently dead
  // and must be rebuilt rather than held.
  const [runnerGeneration, regenerateRunner] = useReducer(
    (generation: number) => generation + 1,
    0,
  );

  const runner = useMemo(
    () =>
      walletKey
        ? createExecutionRunner({
            ...runnerOptions,
            api: stableApi,
            // An accessor, not a value: see `contextRef` above. It is BOUND
            // to the walletKey generation that built this runner: after an
            // account or standard switch the context yields the NEW wallet,
            // and letting an orphaned in-flight run read it would sign or
            // transfer with the wrong account's keys and funds.
            wallet: () => {
              const current = contextRef.current.wallet;

              if (!current) {
                return failGuard(
                  'WALLET_NOT_CONNECTED',
                  'the wallet was disconnected while an execution was running',
                );
              }

              if (deriveWalletKey(current) !== walletKey) {
                return failGuard(
                  'WALLET_NOT_CONNECTED',
                  'the connected wallet changed while an execution was running — resume() it from the new runner',
                );
              }

              return current;
            },
            onEvent: (event) => onEventRef.current?.(event),
          })
        : null,
    // The ONLY things that invalidate a runner are the account it is bound to
    // and a detected disposal (`runnerGeneration`). Object identities are
    // deliberately absent, and so are the remaining options (logger, poll
    // interval, plugins) — those are read once at construction, so including
    // them would discard live state.
    [stableApi, walletKey, runnerGeneration],
  );

  // When the account changes (or the hook unmounts), the superseded runner is
  // disposed so an orphaned run stops polling and emitting through the shared
  // onEvent instead of surviving invisibly for minutes.
  //
  // The dispose is DEFERRED a tick and cancelled if the same runner's effect
  // re-runs first: React 18 StrictMode (dev) runs mount -> cleanup -> remount
  // while useMemo keeps returning the same runner, and disposing it
  // synchronously in that cycle would irreversibly brick the hook. A wallet
  // switch is unaffected — its cleanup schedules the OLD runner's dispose,
  // which the new runner's setup deliberately does not cancel.
  const pendingDispose = useRef<{
    runner: NonNullable<typeof runner>;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  useEffect(() => {
    if (pendingDispose.current?.runner === runner) {
      clearTimeout(pendingDispose.current.timer);
      pendingDispose.current = null;
    }

    // The deferred dispose is only cancellable while its timer has not fired.
    // When cleanup and re-setup span a macrotask — React <Activity>/offscreen
    // reuse, react-freeze — the runner is already irreversibly disposed by the
    // time this effect re-runs: rebuild it instead of holding one whose every
    // call rejects with RunnerDisposedError.
    if (runner?.isDisposed()) {
      regenerateRunner();
    }

    return () => {
      if (runner) {
        pendingDispose.current = {
          runner,
          timer: setTimeout(() => runner.dispose(), 0),
        };
      }
    };
  }, [runner]);

  // A real idle machine stands in while no wallet is connected, so the snapshot
  // hook is always called unconditionally and the store shape never varies.
  const [fallbackMachine] = useState(createExecutionMachine);

  const store = runner ? runner.getStore() : fallbackMachine.getStore();
  const snapshot = useSnapshot(store);
  const ctx = snapshot.context;

  // Memoised on the error itself: it allocates a fresh object, so recomputing
  // it per render would re-run every consumer effect keyed on `recovery` for
  // the whole time an error is displayed.
  const recovery = useMemo(
    () => deriveExecutionRecovery(ctx.error),
    [ctx.error],
  );

  const requireRunner = useCallback(() => {
    if (!runner) {
      return failGuard(
        'WALLET_NOT_CONNECTED',
        'connect a wallet before starting an execution',
      );
    }

    return runner;
  }, [runner]);

  // Declared async so a missing runner REJECTS rather than throwing
  // synchronously — otherwise `run(plan).catch(...)` would still blow up at the
  // call site, which is the shape every caller writes.
  const run = useCallback(
    async <TParams>(plan: ExecutionPlan<TParams>) => requireRunner().run(plan),
    [requireRunner],
  );

  const resume = useCallback(
    async (executionId: string, depositOptions?: ResumeDepositOptions) =>
      requireRunner().resume(executionId, depositOptions),
    [requireRunner],
  );

  const retryDeposit = useCallback(
    async () => requireRunner().retryDeposit(),
    [requireRunner],
  );

  const cancel = useCallback(
    async (executionId?: string) => requireRunner().cancel(executionId),
    [requireRunner],
  );

  return {
    phase: snapshot.state,
    status: ctx.status,
    executionId: ctx.executionId,
    execution: ctx.execution as Execution | undefined,
    networkFee: ctx.networkFee,
    spendable: ctx.spendable,
    depositAddress: ctx.depositAddress,
    depositMemo: ctx.depositMemo,
    deadline: ctx.deadline,
    depositTxHash: ctx.depositTxHash,
    error: ctx.error,
    recovery,
    isCancelling: ctx.isCancelling,
    // An in-flight phase is not enough on its own: a rejected deposit transfer
    // PARKS in `awaiting-deposit` with nothing running, and reporting that as
    // busy would have a UI disable the very retryDeposit()/cancel() controls
    // `recovery` is telling it to offer. A recorded error is what separates
    // the two — every flow clears it on entry (prepareForNewFlow, or
    // retryDeposit explicitly), so it is set only while parked.
    //
    // Cancelling counts as busy on its own: it is commonly invoked FROM a
    // terminal phase (the in-flight recovery), where no phase says "working".
    isBusy: (isInFlightPhase(snapshot.state) && !ctx.error) || ctx.isCancelling,
    run,
    resume,
    retryDeposit,
    cancel,
  };
};
