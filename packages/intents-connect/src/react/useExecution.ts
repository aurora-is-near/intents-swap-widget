import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSnapshot } from 'valtio';
import {
  createExecutionMachine,
  createExecutionRunner,
  deriveExecutionRecovery,
  type Execution,
  type ExecutionPlan,
  type ExecutionRecovery,
  type ExecutionStatus,
  failGuard,
  type IntentsConnectApi,
  type Phase,
  type ResumeDepositOptions,
  type RunnerEvent,
} from '@/index';

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

const BUSY_PHASES: readonly Phase[] = [
  'resolving-identity',
  'planning',
  'creating',
  'awaiting-signature',
  'submitting',
  'awaiting-deposit',
  'settling',
];

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
  // renders, a live execution would be reset to `idle` mid-flight. The runner
  // reads through this ref, so it always sees the current connector.
  const walletRef = useRef(wallet);

  walletRef.current = wallet;

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
   * What actually distinguishes one runner from another: the account it is bound
   * to and the standard it signs with. Both feed the intermediary address and the
   * signing path, so a change here genuinely invalidates an in-flight execution —
   * unlike a change of object identity.
   */
  const walletKey = wallet
    ? `${wallet.signingStandard}:${wallet.getAddress() ?? ''}`
    : null;

  const runner = useMemo(
    () =>
      walletKey
        ? createExecutionRunner({
            ...runnerOptions,
            api: stableApi,
            // An accessor, not a value: see `walletRef` above. It is BOUND to
            // the walletKey generation that built this runner: after an
            // account or standard switch, walletRef points at the NEW wallet,
            // and letting an orphaned in-flight run read it would sign or
            // transfer with the wrong account's keys and funds.
            wallet: () => {
              const { current } = walletRef;

              if (!current) {
                return failGuard(
                  'WALLET_NOT_CONNECTED',
                  'the wallet was disconnected while an execution was running',
                );
              }

              const currentKey = `${current.signingStandard}:${current.getAddress() ?? ''}`;

              if (currentKey !== walletKey) {
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
    // The ONLY thing that invalidates a runner is the account it is bound to.
    // Object identities are deliberately absent, and so are the remaining options
    // (logger, poll interval, plugins) — those are read once at construction, so
    // including them would discard live state.
    [stableApi, walletKey],
  );

  // When the account changes (or the hook unmounts), the superseded runner is
  // disposed so an orphaned run stops polling and emitting through the shared
  // onEvent instead of surviving invisibly for minutes.
  useEffect(() => () => runner?.dispose(), [runner]);

  // A real idle machine stands in while no wallet is connected, so the snapshot
  // hook is always called unconditionally and the store shape never varies.
  const [fallbackMachine] = useState(createExecutionMachine);

  const store = runner ? runner.getStore() : fallbackMachine.getStore();
  const snapshot = useSnapshot(store);
  const ctx = snapshot.context;

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
    phase: ctx.phase,
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
    recovery: deriveExecutionRecovery(ctx.error),
    isCancelling: ctx.isCancelling,
    // Cancelling counts as busy on its own: it is commonly invoked FROM a
    // terminal phase (the in-flight recovery), where no phase says "working".
    isBusy: BUSY_PHASES.includes(ctx.phase) || ctx.isCancelling,
    run,
    resume,
    retryDeposit,
    cancel,
  };
};
