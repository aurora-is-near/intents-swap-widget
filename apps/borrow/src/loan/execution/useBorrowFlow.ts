import {
  DepositTransferError,
  ExecutionCancelledError,
  ExecutionPollTimeoutError,
  type ExecutionStatus,
  type RunnerEvent,
  TERMINAL_STATUSES,
} from '@aurora-is-near/intents-connect';
import {
  useExecution,
  type UseExecutionResult,
} from '@aurora-is-near/intents-connect/react';
import { useIntentsConnectWallet } from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { LendingMarketAdapter } from '../../markets/types';
import {
  BORROW_DELAYED_AFTER_MS,
  type BorrowErrorKind,
  BorrowPreCheckError,
  borrowRecoveryAction,
  type BorrowRecoveryAction,
  type BorrowStepFailure,
  checkOriginGas,
  classifyBorrowError,
  diagnoseBorrowStep,
  type GasPreCheckInput,
} from './classifyBorrowError';
import { checkLiquidity } from './liquidity';
import {
  type BorrowPreview,
  previewBorrow,
  type PreviewBorrowInput,
} from './preview';
import {
  type BorrowPreviewFigures,
  borrowPreviewFigures,
} from './previewFigures';

/** The pending dialog's three steps (`n: 3`, Web-Borrow-Confirm.dc.html). */
export type BorrowPendingStep = 0 | 1 | 2;

/**
 * Where a borrow is, for its dialogs:
 * - `idle`: nothing started, or the user left.
 * - `previewing`: the pre-checks and the two-pass dry run are running.
 * - `confirm`: the dry run to confirm, and the figures the dialog shows.
 * - `signing`: confirmed; the execution is created and the wallet prompt is
 *   open, until the service has accepted the signature.
 * - `pending`: signed. Step 0: the deposit is being sent; 1: the collateral
 *   is bridging to the market's chain; 2: it is being supplied, the loan
 *   opened and the borrowed funds delivered (the operation).
 * - `done`: the borrow succeeded.
 * - `error`: one of the error states (`classifyBorrowError`); `delayed` is a
 *   warning, and the borrow is still tracked.
 */
export type BorrowFlowState =
  | { kind: 'idle' }
  | { kind: 'previewing' }
  | { kind: 'confirm'; preview: BorrowPreview; figures: BorrowPreviewFigures }
  | { kind: 'signing' }
  | { kind: 'pending'; step: BorrowPendingStep; executionId?: string }
  | { kind: 'done'; executionId: string }
  | { kind: 'error'; error: BorrowErrorKind; cause: unknown };

/** What `start()` previews and pre-checks a borrow from. */
export type BorrowFlowInput = Omit<
  PreviewBorrowInput,
  'preview' | 'adapter'
> & {
  /** Builds the steps, and reads the market afresh for the liquidity check. */
  adapter: Pick<LendingMarketAdapter, 'buildBorrowSteps' | 'getMarketSnapshot'>;
  /**
   * The wallet's balances (`useFundingAssets().rows`) for the gas
   * pre-check; `undefined` while not read, which skips it.
   */
  fundingRows: GasPreCheckInput['rows'];
};

export type UseBorrowFlowOptions = {
  /**
   * Called once an execution is created (the runner's `created` event), so
   * an in-flight borrow can be found again after a reload.
   */
  onCreated?: (executionId: string) => void;
};

export type UseBorrowFlowResult = {
  state: BorrowFlowState;
  /** Gas pre-check, the two-pass dry run and the liquidity pre-check. */
  start: (input: BorrowFlowInput) => Promise<void>;
  /** Runs the confirmed dry run's plan as it is. */
  confirm: () => Promise<void>;
  /** The error state's action, as the artboard names it. */
  action: BorrowRecoveryAction | undefined;
  /**
   * Re-runs: re-prompts the deposit transfer after a `DepositTransferError`,
   * previews afresh and runs when nothing was signed, else keeps watching the
   * signed execution.
   */
  retry: () => Promise<void>;
  /** Re-quotes and goes back to `confirm`. */
  refresh: () => Promise<void>;
  /** Opens the wallet's connect modal; once connected, re-quotes. */
  reconnect: () => void;
  /**
   * Closes the dialog. A signed borrow keeps being tracked (back to
   * `pending`); anything else is left (`leave()`).
   */
  close: () => Promise<void>;
  /**
   * Back to `idle`. A created execution that was not signed is cancelled, so
   * it does not hold the wallet's in-flight lock.
   */
  leave: () => Promise<void>;
  /**
   * The collateral arrived and the borrow step failed: the funds wait at the
   * intermediary, and `retry()` does nothing until the steps-only retry
   * lands (see the TODO in `retry`).
   */
  fundsWaiting: boolean;
};

const STATUS_STEP: Partial<Record<ExecutionStatus, BorrowPendingStep>> = {
  DEPOSIT_PENDING: 0,
  DEPOSIT_PROCESSING: 1,
  OPERATION_PENDING: 2,
  OPERATION_PROCESSING: 2,
};

/**
 * Phases before the service has the signature. `submitting` is one: the
 * runner enters it BEFORE `submitSignature`, and a failed submit leaves the
 * execution CREATED, unsigned and holding the wallet's lock.
 */
const SIGNING_PHASES = new Set([
  'resolving-identity',
  'planning',
  'creating',
  'awaiting-signature',
  'submitting',
]);

/**
 * A borrow from the confirm dialog to done or an error, over the SDK's
 * `useExecution({ onEvent })`: one state union for the dialogs, driven by
 * the runner's events, and the recovery actions the error artboards name.
 */
export const useBorrowFlow = ({
  onCreated,
}: UseBorrowFlowOptions = {}): UseBorrowFlowResult => {
  const [state, setState] = useState<BorrowFlowState>({ kind: 'idle' });
  const stateRef = useRef(state);

  /** The latest input, for a retry or a refresh. */
  const inputRef = useRef<BorrowFlowInput | undefined>(undefined);
  /** The confirmed dry run's borrow amount, to diagnose a failed borrow step. */
  const borrowRef = useRef<BorrowPreview | undefined>(undefined);
  /** Bumped by every new start and by leaving: stale async work is dropped. */
  const generationRef = useRef(0);
  /** A run, retry or resume is driving the runner: its events are ours. */
  const runningRef = useRef(false);
  const createdIdRef = useRef<string | undefined>(undefined);
  const statusRef = useRef<ExecutionStatus | undefined>(undefined);
  const stepRef = useRef<BorrowPendingStep>(0);
  const lastErrorRef = useRef<unknown>(undefined);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  /** The `delayed` warning was shown and closed: it is not shown again. */
  const delayDismissedRef = useRef(false);
  /**
   * This run's signature was submitted. Kept by the hook rather than read
   * from the runner: after a wallet switch the new runner reports
   * `hasSubmittedSignature: false` for an execution that was signed.
   */
  const signedRef = useRef(false);
  /**
   * The user confirmed this borrow's figures. Until then, a retry previews
   * back to `confirm` instead of running.
   */
  const confirmedRef = useRef(false);
  const reconnectingRef = useRef(false);
  /** The signed execution to resume once the wallet is back. */
  const reconnectResumeRef = useRef<string | undefined>(undefined);
  const onCreatedRef = useRef(onCreated);

  onCreatedRef.current = onCreated;

  const setFlow = useCallback((next: BorrowFlowState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const clearDelayTimer = () => {
    clearTimeout(delayTimerRef.current);
    delayTimerRef.current = undefined;
  };

  const toPending = (step: BorrowPendingStep) => {
    const { current } = stateRef;

    stepRef.current = Math.max(stepRef.current, step) as BorrowPendingStep;

    // The `delayed` warning stays up while tracking goes on underneath.
    // (Other errors stop the run, so no event reaches here after one.)
    if (
      current.kind === 'done' ||
      (current.kind === 'error' && current.error === 'delayed')
    ) {
      return;
    }

    if (!delayTimerRef.current && !delayDismissedRef.current) {
      delayTimerRef.current = setTimeout(() => {
        if (stateRef.current.kind === 'pending') {
          setFlow({
            kind: 'error',
            error: classifyBorrowError(undefined, undefined, {
              pendingMs: BORROW_DELAYED_AFTER_MS + 1,
            }),
            cause: undefined,
          });
        }
      }, BORROW_DELAYED_AFTER_MS);
    }

    setFlow({
      kind: 'pending',
      step: stepRef.current,
      executionId: createdIdRef.current,
    });
  };

  const toDone = (executionId: string | undefined) => {
    runningRef.current = false;
    clearDelayTimer();

    if (executionId) {
      setFlow({ kind: 'done', executionId });
    }
  };

  const executionRef = useRef<UseExecutionResult | undefined>(undefined);

  /** The hook's latest result: set on every render, before any callback runs. */
  const requireExecution = (): UseExecutionResult => {
    if (!executionRef.current) {
      throw new Error('useExecution has not rendered yet');
    }

    return executionRef.current;
  };

  /** Classifies `error` into the error state; the borrow step is read afresh. */
  const fail = async (error: unknown) => {
    if (lastErrorRef.current === error && stateRef.current.kind === 'error') {
      return;
    }

    lastErrorRef.current = error;
    runningRef.current = false;
    clearDelayTimer();

    const generation = generationRef.current;
    const status = statusRef.current;
    let borrowStep: BorrowStepFailure | undefined;
    const input = inputRef.current;
    const borrowed = borrowRef.current;

    // Shown as `error` at once, refined once the market is read.
    setFlow({
      kind: 'error',
      error: classifyBorrowError(error, executionRef.current?.recovery, {
        status,
      }),
      cause: error,
    });

    if (status === 'OPERATION_FAILED' && input && borrowed) {
      try {
        const snapshot = await input.adapter.getMarketSnapshot(input.market);

        borrowStep = diagnoseBorrowStep({
          snapshot,
          collateral: input.collateral,
          borrow: input.borrow,
          collateralAmount: BigInt(
            borrowed.preview.execution.quote.minAmountOut,
          ),
          borrowAmount: borrowed.borrowAmount,
        });
      } catch {
        // Unread: the failure stays unexplained.
      }

      if (generation === generationRef.current && borrowStep) {
        setFlow({
          kind: 'error',
          error: classifyBorrowError(error, executionRef.current?.recovery, {
            status,
            borrowStep,
          }),
          cause: error,
        });
      }
    }
  };

  const onEvent = (event: RunnerEvent) => {
    if (!runningRef.current) {
      return;
    }

    switch (event.type) {
      case 'phase':
        if (SIGNING_PHASES.has(event.phase)) {
          if (stateRef.current.kind !== 'pending') {
            setFlow({ kind: 'signing' });
          }
        } else if (event.phase === 'awaiting-deposit') {
          signedRef.current = true;
          toPending(0);
        } else if (event.phase === 'settling') {
          signedRef.current = true;
          toPending(Math.max(stepRef.current, 1) as BorrowPendingStep);
        }

        break;

      case 'status': {
        statusRef.current = event.status;
        const step = STATUS_STEP[event.status];

        // Past CREATED, the service has the signature.
        if (event.status !== 'CREATED') {
          signedRef.current = true;
        }

        if (step !== undefined) {
          toPending(step);
        } else if (event.status === 'SUCCESS') {
          toDone(createdIdRef.current);
        }

        break;
      }

      case 'created':
        createdIdRef.current = event.executionId;
        onCreatedRef.current?.(event.executionId);
        break;
      case 'deposit-address':
        signedRef.current = true;
        toPending(0);
        break;
      case 'deposit-sent':
        signedRef.current = true;
        toPending(1);
        break;
      case 'error':
        void fail(event.error);
        break;
      // `quoted`: exact fee figures, emitted only by the three-round fee
      // strategy; the confirm dialog already shows the dry run's.
      default:
        break;
    }
  };

  const execution = useExecution({ onEvent });

  executionRef.current = execution;

  /**
   * This run's execution was signed: by its events, which survive a wallet
   * switch, or by the runner that ran it.
   */
  const isSigned = () =>
    signedRef.current || executionRef.current?.hasSubmittedSignature === true;

  const { connect, isConnected } = useIntentsConnectWallet();

  /**
   * Cancels a created execution that was never signed: until then it holds
   * the wallet's in-flight lock. One the runner already cancelled (a
   * rejected signature is, by default) is left alone.
   */
  const releaseUnsigned = async () => {
    const { current } = executionRef;
    const executionId = createdIdRef.current;

    createdIdRef.current = undefined;

    if (
      !current ||
      executionId === undefined ||
      isSigned() ||
      current.phase === 'cancelled'
    ) {
      return;
    }

    try {
      await current.cancel(executionId);
    } catch {
      // Already gone, or the lock is released when it expires.
    }
  };

  /** A fresh run's bookkeeping. */
  const resetRun = () => {
    clearDelayTimer();
    runningRef.current = false;
    createdIdRef.current = undefined;
    statusRef.current = undefined;
    stepRef.current = 0;
    lastErrorRef.current = undefined;
    delayDismissedRef.current = false;
    signedRef.current = false;
  };

  const previewFor = async (
    input: BorrowFlowInput,
    generation: number,
  ): Promise<BorrowFlowState | undefined> => {
    const { adapter, fundingRows, ...previewInput } = input;

    if (
      checkOriginGas({
        rows: fundingRows,
        origin: input.origin,
        amount: input.amount,
      }) === 'short'
    ) {
      throw new BorrowPreCheckError(
        'noGas',
        `Not enough gas on ${input.origin.chain} for the deposit`,
      );
    }

    const previewed = await previewBorrow({
      ...previewInput,
      adapter,
      preview: (plan) => requireExecution().preview(plan),
    });

    const snapshot = await adapter.getMarketSnapshot(input.market);

    if (
      checkLiquidity(snapshot, input.borrow, previewed.borrowAmount) ===
      'noLiquidity'
    ) {
      throw new BorrowPreCheckError(
        'noLiquidity',
        `${input.market.name} can't lend ${input.borrow.symbol} at this size now`,
      );
    }

    if (generation !== generationRef.current) {
      return undefined;
    }

    borrowRef.current = previewed;

    return {
      kind: 'confirm',
      preview: previewed,
      figures: borrowPreviewFigures({
        execution: previewed.preview.execution,
        borrowAmount: previewed.borrowAmount,
        paid: {
          assetId: input.origin.assetId,
          decimals: input.origin.decimals,
        },
        collateral: input.collateral,
        borrow: input.borrow,
      }),
    };
  };

  /** Drives the runner with `drive`; its events move the state. */
  const drive = async (driveRun: () => Promise<{ id: string }>) => {
    const generation = generationRef.current;

    runningRef.current = true;

    try {
      const result = await driveRun();

      if (generation === generationRef.current) {
        toDone(result.id || createdIdRef.current);
      }
    } catch (error) {
      if (generation !== generationRef.current) {
        return;
      }

      if (error instanceof ExecutionCancelledError) {
        runningRef.current = false;
        setFlow({ kind: 'idle' });

        return;
      }

      await fail(error);
    }
  };

  const previewAnd = async (then: 'confirm' | 'run') => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    generationRef.current += 1;

    const generation = generationRef.current;

    setFlow({ kind: 'previewing' });
    // An earlier run's unsigned execution would hold the wallet's lock.
    await releaseUnsigned();
    resetRun();

    let next: BorrowFlowState | undefined;

    try {
      next = await previewFor(input, generation);
    } catch (error) {
      if (generation === generationRef.current) {
        await fail(error);
      }

      return;
    }

    if (!next || next.kind !== 'confirm') {
      return;
    }

    if (then === 'confirm') {
      confirmedRef.current = false;
      setFlow(next);

      return;
    }

    setFlow({ kind: 'signing' });
    await drive(() => requireExecution().run(next.preview.preview.plan));
  };

  const start = async (input: BorrowFlowInput) => {
    const { kind } = stateRef.current;

    // A borrow is already on its way: the dialog is open on it.
    if (kind === 'signing' || kind === 'pending') {
      return;
    }

    inputRef.current = input;
    confirmedRef.current = false;
    await previewAnd('confirm');
  };

  const confirm = async () => {
    const { current } = stateRef;

    if (current.kind !== 'confirm') {
      return;
    }

    resetRun();
    confirmedRef.current = true;
    setFlow({ kind: 'signing' });
    // The dry run's plan as it is: `run()` reuses its prepared steps.
    await drive(() => requireExecution().run(current.preview.preview.plan));
  };

  /**
   * The collateral arrived and the borrow step failed: a new bridge-in would
   * spend the user's funds a second time.
   */
  const isFundsWaiting = () =>
    isSigned() && statusRef.current === 'OPERATION_FAILED';

  const fundsWaiting = state.kind === 'error' && isFundsWaiting();

  const retry = async () => {
    const { current } = executionRef;

    if (stateRef.current.kind !== 'error' || !current) {
      return;
    }

    if (
      lastErrorRef.current instanceof DepositTransferError ||
      current.recovery?.kind === 'retry-transfer'
    ) {
      // Signed: only the deposit transfer is prompted again.
      lastErrorRef.current = undefined;
      toPending(stepRef.current);
      await drive(() => current.retryDeposit());

      return;
    }

    if (!isSigned()) {
      // Nothing signed: the old quote is stale, so preview afresh. Run it at
      // once only when the user already confirmed this borrow; a failure
      // before that (a pre-check, the dry run) goes back to `confirm`.
      await previewAnd(confirmedRef.current ? 'run' : 'confirm');

      return;
    }

    if (isFundsWaiting()) {
      // TODO(borrow-execution): the collateral arrived and the borrow step
      // failed, so the funds wait at the intermediary. The retry re-quotes
      // the borrow amount and runs a steps-only plan from them, as the Aave
      // extension's `buildAaveStepsPlan` / `feeFromAmount` do
      // (`runSteps`). `recovery` does not expose the waiting funds, so
      // until they are read (`useIntermediaryBalance`), nothing is retried:
      // a new bridge-in would spend the user's funds a second time.
      return;
    }

    const status = statusRef.current;

    if (status !== undefined && TERMINAL_STATUSES.includes(status)) {
      // Over (DEPOSIT_FAILED: the deposit was refunded) and no longer
      // holding the lock: resuming would only fail again, so start over.
      await previewAnd('confirm');

      return;
    }

    const executionId = createdIdRef.current ?? current.executionId;

    if (executionId) {
      // Signed and still live (a poll timeout, say): keep watching it.
      lastErrorRef.current = undefined;
      createdIdRef.current = executionId;
      toPending(stepRef.current);
      await drive(() => current.resume(executionId));
    }
  };

  const refresh = async () => {
    // The collateral waits at the intermediary: no new bridge-in.
    if (isFundsWaiting()) {
      return;
    }

    await previewAnd('confirm');
  };

  const leave = async () => {
    generationRef.current += 1;
    await releaseUnsigned();
    resetRun();
    reconnectingRef.current = false;
    reconnectResumeRef.current = undefined;
    confirmedRef.current = false;
    borrowRef.current = undefined;
    setFlow({ kind: 'idle' });
  };

  const close = async () => {
    const { current } = stateRef;
    const executionId = createdIdRef.current;
    const tracked =
      current.kind === 'pending' ||
      (current.kind === 'error' && current.error === 'delayed');

    if (!tracked || executionId === undefined) {
      await leave();

      return;
    }

    delayDismissedRef.current = true;
    clearDelayTimer();

    if (
      current.kind === 'error' &&
      current.cause instanceof ExecutionPollTimeoutError
    ) {
      // Polling stopped: reattach to keep tracking it.
      lastErrorRef.current = undefined;
      setFlow({ kind: 'pending', step: stepRef.current, executionId });
      await drive(() => requireExecution().resume(executionId));

      return;
    }

    setFlow({ kind: 'pending', step: stepRef.current, executionId });
  };

  const reconnect = () => {
    reconnectingRef.current = true;
    // A signed execution is still live and holds the lock: it is resumed,
    // not quoted again.
    reconnectResumeRef.current = isSigned() ? createdIdRef.current : undefined;
    Promise.resolve(connect()).catch(() => {
      reconnectingRef.current = false;
      reconnectResumeRef.current = undefined;
    });
  };

  /**
   * Once the wallet is back: resume a signed execution from the new runner,
   * or else re-quote, since the old dry run was prepared for the runner of
   * the wallet that left.
   */
  const afterReconnect = async () => {
    const executionId = reconnectResumeRef.current;

    reconnectResumeRef.current = undefined;

    if (executionId === undefined) {
      await previewAnd('confirm');

      return;
    }

    lastErrorRef.current = undefined;
    createdIdRef.current = executionId;
    signedRef.current = true;
    setFlow({ kind: 'pending', step: stepRef.current, executionId });
    await drive(() => requireExecution().resume(executionId));
  };

  const afterReconnectRef = useRef(afterReconnect);

  afterReconnectRef.current = afterReconnect;

  // `execution.preview` changes with the runner, which is rebuilt for the
  // new wallet.
  useEffect(() => {
    if (isConnected && reconnectingRef.current) {
      reconnectingRef.current = false;
      void afterReconnectRef.current();
    }
  }, [isConnected, execution.preview]);

  // Leaving the page with a created, unsigned execution releases its lock.
  const unmountRef = useRef(() => {});

  unmountRef.current = () => {
    clearDelayTimer();
    void releaseUnsigned();
  };

  useEffect(() => () => unmountRef.current(), []);

  let action: BorrowRecoveryAction | undefined;

  if (fundsWaiting) {
    // Only closing is offered: every other action would bridge the funds in
    // again (see the TODO in `retry`).
    action = 'close';
  } else if (state.kind === 'error') {
    action = borrowRecoveryAction(state.error, state.cause);
  }

  return {
    state,
    start,
    confirm,
    action,
    retry,
    refresh,
    reconnect,
    close,
    leave,
    fundsWaiting,
  };
};
