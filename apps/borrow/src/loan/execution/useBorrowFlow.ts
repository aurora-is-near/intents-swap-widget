import {
  DepositTransferError,
  deriveExecutionRecovery,
  type Execution,
  ExecutionCancelledError,
  ExecutionPollTimeoutError,
  type ExecutionStatus,
  IN_FLIGHT_STATUSES,
  isUserRejection,
  type RunnerEvent,
  TERMINAL_STATUSES,
} from '@aurora-is-near/intents-connect';
import {
  useExecution,
  type UseExecutionResult,
  useIntentsConnect,
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
import {
  forgetProgress,
  isOngoingExecution,
  markCreated,
  markDepositSent,
  markSigned,
  progressOf,
} from './executionProgress';
import { checkLiquidity } from './liquidity';
import {
  type BorrowPreview,
  previewBorrow,
  type PreviewBorrowInput,
} from './preview';
import {
  type BorrowPreviewFigures,
  borrowPreviewFigures,
  stepsPreviewFigures,
} from './previewFigures';
import { type BorrowStepsPreview, previewBorrowSteps } from './stepsRetry';

/** The pending dialog's three steps (`n: 3`, Web-Borrow-Confirm.dc.html). */
export type BorrowPendingStep = 0 | 1 | 2;

/**
 * Why an open execution is being cancelled:
 * - `declined`: the user declined its signature just now; it was created
 *   and holds the wallet's in-flight lock, so it is cancelled at once.
 * - `previous`: an earlier one, never signed or never funded, blocks the
 *   borrow being confirmed; it is cancelled before the new one is created.
 */
export type BorrowCancelReason = 'declined' | 'previous';

/**
 * Where a borrow is, for its dialogs:
 * - `idle`: nothing started, or the user left.
 * - `previewing`: the pre-checks and the two-pass dry run are running.
 * - `confirm`: the dry run to confirm, and the figures the dialog shows.
 * - `signing`: confirmed; the execution is created and the wallet prompt
 *   for its intent is open, until the service has accepted the signature.
 * - `cancelling`: the wallet prompt for a `delete_execution` signature is
 *   open (see `BorrowCancelReason`).
 * - `pending`: signed. Step 0: the wallet is asked for the deposit
 *   transaction, or (`waitingForDeposit`, a borrow restored after a reload)
 *   the deposit is waited for, with no prompt; 1: the deposit left the
 *   wallet and the collateral is bridging to the market's chain; 2: it is
 *   being supplied, the loan opened and the borrowed funds delivered.
 * - `done`: the borrow succeeded.
 * - `error`: one of the error states (`classifyBorrowError`), drawn on
 *   `step`, the step the borrow had reached; `delayed` is a warning, and
 *   the borrow is still tracked.
 */
export type BorrowFlowState =
  | { kind: 'idle' }
  | { kind: 'previewing' }
  | {
      kind: 'confirm';
      /** A bridge-in, or a steps-only retry over the waiting collateral. */
      preview: BorrowPreview | BorrowStepsPreview;
      figures: BorrowPreviewFigures;
    }
  | { kind: 'signing' }
  | { kind: 'cancelling'; reason: BorrowCancelReason }
  | {
      kind: 'pending';
      step: BorrowPendingStep;
      executionId?: string;
      waitingForDeposit: boolean;
    }
  | { kind: 'done'; executionId: string }
  | {
      kind: 'error';
      error: BorrowErrorKind;
      cause: unknown;
      step: BorrowPendingStep;
    };

/** A steps-only retry's dry run, not a bridge-in's. */
const isStepsPreview = (
  preview: BorrowPreview | BorrowStepsPreview,
): preview is BorrowStepsPreview => 'steps' in preview;

/** A restored execution: what `restore()` reads of it. */
export type RestorableExecution = Pick<Execution, 'id' | 'status' | 'details'> &
  Partial<Pick<Execution, 'quote'>>;

/** What `start()` previews and pre-checks a borrow from. */
export type BorrowFlowInput = Omit<
  PreviewBorrowInput,
  'preview' | 'adapter'
> & {
  /** Builds the steps, and reads the market afresh for the liquidity check. */
  adapter: Pick<LendingMarketAdapter, 'borrowRecipe' | 'getMarketSnapshot'>;
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
  /**
   * Called when Borrow (or Confirm) finds an earlier execution of the wallet
   * still on its way (`isOngoingExecution`): the flow then shows and tracks
   * that one instead of starting a new borrow, so the dialog can name it as
   * the previous borrow. Without it, the flow stops at `busy`.
   */
  onPrevious?: (execution: Execution) => void;
  /**
   * Called once the execution is over: a terminal status (`SUCCESS`,
   * `DEPOSIT_FAILED`, `OPERATION_FAILED`), or it was cancelled. What
   * `onCreated` kept for it can go.
   */
  onSettled?: (executionId: string) => void;
};

export type UseBorrowFlowResult = {
  state: BorrowFlowState;
  /**
   * The figures of the dry run the borrow runs, or is about to: set each time
   * a preview is accepted, whether it goes to `confirm` or, on a retry of a
   * confirmed borrow, straight to the run; kept through signing, pending,
   * done and errors, and cleared by `start()`, `leave()` and `restore()` (a
   * restored borrow's figures are not known).
   */
  figures: BorrowPreviewFigures | undefined;
  /** Gas pre-check, the two-pass dry run and the liquidity pre-check. */
  start: (input: BorrowFlowInput) => Promise<void>;
  /** Runs the confirmed dry run's plan as it is. */
  confirm: () => Promise<void>;
  /**
   * Picks up a borrow on its way found after a reload (signed, see
   * `isOngoingExecution`): watches it with `resume()`, which never prompts
   * the wallet for a signed execution it did not create, and shows it as
   * `pending`; a `DEPOSIT_PENDING` one waits for its deposit. It never has a
   * form input: a retry that would quote again leaves it. Ignored unless
   * `idle`.
   */
  restore: (execution: RestorableExecution) => void;
  /** The error state's action, as the artboard names it. */
  action: BorrowRecoveryAction | undefined;
  /**
   * Re-runs: asks again for a declined cancellation, re-prompts the deposit
   * transfer after a `DepositTransferError`, previews afresh and runs when
   * nothing was signed, else keeps watching the signed execution.
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
   * Back to `idle`. Leaving never prompts the wallet: an execution that was
   * not signed, or not funded, is left open and cancelled when the next
   * borrow is confirmed (or it expires).
   */
  leave: () => Promise<void>;
  /**
   * The collateral arrived and the borrow step failed: the funds wait at the
   * intermediary. `retry()` and `refresh()` re-size the borrow and run it
   * steps-only from them; nothing is bridged again.
   */
  fundsWaiting: boolean;
  /** The execution the funds wait for, while `fundsWaiting`: to find them. */
  fundsWaitingExecutionId: string | undefined;
};

const STATUS_STEP: Partial<Record<ExecutionStatus, BorrowPendingStep>> = {
  DEPOSIT_PENDING: 0,
  DEPOSIT_PROCESSING: 1,
  OPERATION_PENDING: 2,
  OPERATION_PROCESSING: 2,
};

/** Statuses before the deposit was seen: it may still have to be sent. */
const AWAITING_FUNDS = new Set<ExecutionStatus>(['CREATED', 'DEPOSIT_PENDING']);

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
 *
 * The wallet's in-flight lock (one open execution per wallet):
 * - A declined signature cancels the execution at once (`cancelling`,
 *   `declined`), with a second wallet prompt the dialog explains. The SDK's
 *   own auto-cancel is off (`IntentsConnectWalletProvider`), so the dialog
 *   can say what the prompt is for before it opens.
 * - Confirming a borrow first looks for an open execution of the wallet: one
 *   on its way (`isOngoingExecution`) is waited for (`busy`); one never
 *   signed, or signed and never funded, is cancelled (`cancelling`,
 *   `previous`) and the new one created after.
 * - Leaving or closing never prompts the wallet.
 */
export const useBorrowFlow = ({
  onCreated,
  onPrevious,
  onSettled,
}: UseBorrowFlowOptions = {}): UseBorrowFlowResult => {
  const [state, setState] = useState<BorrowFlowState>({ kind: 'idle' });
  const [figures, setFigures] = useState<BorrowPreviewFigures>();
  const stateRef = useRef(state);
  const {
    address: walletAddress,
    connect,
    isConnected,
  } = useIntentsConnectWallet();

  const { api } = useIntentsConnect();
  const apiRef = useRef(api);

  apiRef.current = api;

  /** The connected wallet, read when a callback runs rather than rendered. */
  const addressRef = useRef(walletAddress);

  addressRef.current = walletAddress;

  /** The latest input, for a retry or a refresh. */
  const inputRef = useRef<BorrowFlowInput | undefined>(undefined);
  /** The confirmed dry run's borrow amount, to diagnose a failed borrow step. */
  const borrowRef = useRef<BorrowPreview | BorrowStepsPreview | undefined>(
    undefined,
  );

  /** Bumped by every new start and by leaving: stale async work is dropped. */
  const generationRef = useRef(0);
  /** A run, retry or resume is driving the runner: its events are ours. */
  const runningRef = useRef(false);
  const createdIdRef = useRef<string | undefined>(undefined);
  /** The wallet connected when this run's execution was created, or restored. */
  const createdOwnerRef = useRef<string | undefined>(undefined);
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
   * `hasSubmittedSignature: false` for an execution that was signed. Never
   * inferred from the status: an unsigned execution may read
   * `DEPOSIT_PENDING`.
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
  /** This run's deposit was broadcast (`deposit-sent`): never send it again. */
  const depositSentRef = useRef(false);
  /**
   * A restored borrow waits for its deposit, which this session did not
   * send: only its arrival (step 1 on) moves the dialog on.
   */
  const waitingForDepositRef = useRef(false);
  /**
   * The collateral of this borrow waits at the intermediary: until the user
   * leaves, every retry runs steps-only from it, never a new bridge-in.
   */
  const waitingRef = useRef(false);
  /** The wallet's intermediary, where the collateral waits. */
  const intermediaryRef = useRef<string | undefined>(undefined);
  /** The execution whose collateral waits: shown so it can be found. */
  const waitingExecutionIdRef = useRef<string | undefined>(undefined);
  /**
   * The cancellation the user declined (`cancelDeclined`), for `retry()` to
   * ask again; `previous` goes on to run the confirmed borrow once it is
   * cancelled.
   */
  const declinedCancelRef = useRef<
    { id: string; reason: BorrowCancelReason } | undefined
  >(undefined);

  const onCreatedRef = useRef(onCreated);
  const onPreviousRef = useRef(onPrevious);
  const onSettledRef = useRef(onSettled);

  onCreatedRef.current = onCreated;
  onPreviousRef.current = onPrevious;
  onSettledRef.current = onSettled;

  /** The execution is over: what was kept for it can go. */
  const settled = (executionId: string | undefined) => {
    if (executionId !== undefined) {
      onSettledRef.current?.(executionId);
    }
  };

  const setFlow = useCallback((next: BorrowFlowState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const clearDelayTimer = () => {
    clearTimeout(delayTimerRef.current);
    delayTimerRef.current = undefined;
  };

  /** Records this run's signature, here and in the session's progress. */
  const noteSigned = () => {
    signedRef.current = true;

    if (createdIdRef.current !== undefined) {
      markSigned(createdOwnerRef.current, createdIdRef.current);
    }
  };

  const toPending = (step: BorrowPendingStep) => {
    const { current } = stateRef;

    // Waiting for a deposit this session did not send: only its arrival
    // (step 1 on) moves the dialog on.
    if (waitingForDepositRef.current && step > 0) {
      waitingForDepositRef.current = false;
    }

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
            step: stepRef.current,
          });
        }
      }, BORROW_DELAYED_AFTER_MS);
    }

    setFlow({
      kind: 'pending',
      step: stepRef.current,
      executionId: createdIdRef.current,
      waitingForDeposit: waitingForDepositRef.current,
    });
  };

  const toDone = (executionId: string | undefined) => {
    runningRef.current = false;
    clearDelayTimer();

    if (executionId) {
      forgetProgress(createdOwnerRef.current, executionId);
      settled(executionId);
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

  /**
   * This run's execution was signed: by its events, which survive a wallet
   * switch, or by the runner that ran it.
   */
  const isSigned = () =>
    signedRef.current || executionRef.current?.hasSubmittedSignature === true;

  /**
   * Cancels an open execution with the wallet's `delete_execution`
   * signature, in `cancelling` so the dialog says why the prompt opened.
   * `true` once it is gone and this is still the current borrow. Declined,
   * it is `cancelDeclined`, and `retry()` asks again. Any other failure
   * (already gone, expired) counts as released: a run it still blocks is
   * then refused as `busy`.
   */
  const cancelOpen = async (
    executionId: string,
    reason: BorrowCancelReason,
  ): Promise<boolean> => {
    const generation = generationRef.current;
    const owner = addressRef.current;

    runningRef.current = false;
    clearDelayTimer();
    declinedCancelRef.current = undefined;
    setFlow({ kind: 'cancelling', reason });

    try {
      await requireExecution().cancel(executionId);
    } catch (error) {
      if (generation !== generationRef.current) {
        return false;
      }

      if (isUserRejection(error)) {
        declinedCancelRef.current = { id: executionId, reason };
        setFlow({
          kind: 'error',
          error: 'cancelDeclined',
          cause: error,
          step: 0,
        });

        return false;
      }
    }

    forgetProgress(owner, executionId);
    settled(executionId);

    if (createdIdRef.current === executionId) {
      createdIdRef.current = undefined;
    }

    return generation === generationRef.current;
  };

  /** Classifies `error` into the error state; the borrow step is read afresh. */
  const fail = async (error: unknown) => {
    const { kind } = stateRef.current;

    if (
      lastErrorRef.current === error &&
      (kind === 'error' || kind === 'cancelling')
    ) {
      return;
    }

    lastErrorRef.current = error;
    runningRef.current = false;
    clearDelayTimer();

    const createdId = createdIdRef.current;

    // The signature was declined: the created execution holds the wallet's
    // lock, so it is cancelled now, with the prompt explained.
    if (
      createdId !== undefined &&
      !isSigned() &&
      isUserRejection(error) &&
      !(error instanceof DepositTransferError)
    ) {
      if (await cancelOpen(createdId, 'declined')) {
        setFlow({ kind: 'error', error: 'rejected', cause: error, step: 0 });
      }

      return;
    }

    const generation = generationRef.current;
    const status = statusRef.current;
    const step = stepRef.current;
    let borrowStep: BorrowStepFailure | undefined;
    const input = inputRef.current;
    const borrowed = borrowRef.current;
    // This error's own recovery: the hook's `recovery` is the previous
    // render's, which may still describe an earlier error (a rejected
    // deposit, say) and misread this one.
    const recovery = deriveExecutionRecovery(error);

    // Shown as `error` at once, refined once the market is read.
    setFlow({
      kind: 'error',
      error: classifyBorrowError(error, recovery, { status }),
      cause: error,
      step,
    });

    if (status === 'OPERATION_FAILED' && input && borrowed) {
      try {
        const snapshot = await input.adapter.getMarketSnapshot(input.market);

        borrowStep = diagnoseBorrowStep({
          snapshot,
          collateral: input.collateral,
          borrow: input.borrow,
          // What was supplied: the steps-only `spendable`, else the bridge's
          // minimum received.
          collateralAmount: BigInt(
            isStepsPreview(borrowed)
              ? borrowed.steps.spendable
              : borrowed.preview.execution.quote.minAmountOut,
          ),
          borrowAmount: borrowed.borrowAmount,
        });
      } catch {
        // Unread: the failure stays unexplained.
      }

      if (generation === generationRef.current && borrowStep) {
        setFlow({
          kind: 'error',
          error: classifyBorrowError(error, recovery, { status, borrowStep }),
          cause: error,
          step,
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
          noteSigned();
          toPending(0);
        } else if (event.phase === 'settling') {
          noteSigned();
          toPending(Math.max(stepRef.current, 1) as BorrowPendingStep);
        }

        break;

      case 'status': {
        statusRef.current = event.status;
        const step = STATUS_STEP[event.status];

        if (TERMINAL_STATUSES.includes(event.status)) {
          if (createdIdRef.current !== undefined) {
            forgetProgress(createdOwnerRef.current, createdIdRef.current);
          }

          settled(createdIdRef.current);
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
        createdOwnerRef.current = addressRef.current;
        markCreated(addressRef.current, event.executionId);
        onCreatedRef.current?.(event.executionId);
        break;

      case 'deposit-address':
        noteSigned();
        toPending(0);
        break;

      case 'deposit-sent':
        noteSigned();
        depositSentRef.current = true;

        if (createdIdRef.current !== undefined) {
          markDepositSent(createdOwnerRef.current, createdIdRef.current);
        }

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
   * The collateral arrived and the borrow step failed: a new bridge-in would
   * spend the user's funds a second time.
   */
  const isFundsWaiting = () =>
    waitingRef.current ||
    (isSigned() && statusRef.current === 'OPERATION_FAILED');

  /** A fresh run's bookkeeping. */
  const resetRun = () => {
    clearDelayTimer();
    runningRef.current = false;
    createdIdRef.current = undefined;
    createdOwnerRef.current = undefined;
    statusRef.current = undefined;
    stepRef.current = 0;
    lastErrorRef.current = undefined;
    delayDismissedRef.current = false;
    signedRef.current = false;
    depositSentRef.current = false;
    waitingForDepositRef.current = false;
    declinedCancelRef.current = undefined;
  };

  const previewFor = async (
    input: BorrowFlowInput,
    generation: number,
  ): Promise<
    | { kind: 'confirm'; preview: BorrowPreview; figures: BorrowPreviewFigures }
    | undefined
  > => {
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
        settled(createdIdRef.current);
        setFlow({ kind: 'idle' });

        return;
      }

      await fail(error);
    }
  };

  /**
   * Shows and tracks a signed execution on its way that this borrow did not
   * start: one restored after a reload, or the previous borrow still running
   * when Borrow was clicked.
   */
  const follow = (found: RestorableExecution) => {
    generationRef.current += 1;
    resetRun();
    // A restored borrow has no form input: an earlier one in this session
    // (another wallet's, say) must never be quoted or run for it.
    inputRef.current = undefined;
    borrowRef.current = undefined;
    // Nor are its figures known: the dialog shows the kept rows instead.
    setFigures(undefined);
    waitingRef.current = false;
    intermediaryRef.current = undefined;
    waitingExecutionIdRef.current = undefined;
    reconnectingRef.current = false;
    reconnectResumeRef.current = undefined;
    createdIdRef.current = found.id;
    // Restored for the wallet connected now, which the record was kept for.
    createdOwnerRef.current = addressRef.current;

    const known = progressOf(addressRef.current, found.id);

    statusRef.current = found.status;
    confirmedRef.current = true;
    // Only signed borrows on their way are restored (`isOngoingExecution`).
    signedRef.current = true;
    depositSentRef.current = known?.depositSent === true;

    const step = STATUS_STEP[found.status] ?? 0;

    // A deposit this session saw leave the wallet is on its way: past step
    // 0. Otherwise a `DEPOSIT_PENDING` one may or may not have been sent:
    // it is waited for, never prompted.
    if (depositSentRef.current) {
      toPending(Math.max(step, 1) as BorrowPendingStep);
    } else {
      waitingForDepositRef.current = step === 0;
      toPending(step);
    }

    const { current } = executionRef;

    // This runner still drives it (the dialog was closed while it ran):
    // its events are followed again; a second resume would be refused.
    if (current?.isBusy === true && current.executionId === found.id) {
      runningRef.current = true;

      return;
    }

    void drive(() => requireExecution().resume(found.id));
  };

  const restore = (found: RestorableExecution) => {
    if (stateRef.current.kind === 'idle') {
      follow(found);
    }
  };

  /**
   * The previous borrow, still on its way, blocks a new one: it is shown
   * and tracked instead, named as the previous one by `onPrevious`; without
   * that, the flow stops at `busy`.
   */
  const showPrevious = (previous: Execution) => {
    if (!onPreviousRef.current) {
      setFlow({ kind: 'error', error: 'busy', cause: undefined, step: 0 });

      return;
    }

    onPreviousRef.current(previous);
    follow(previous);
  };

  /**
   * The wallet's first open execution; `undefined` when none, or when the
   * list could not be read (the runner's own preflight still refuses a
   * locked wallet, as `busy`).
   */
  const openExecution = async (): Promise<Execution | undefined> => {
    const owner = addressRef.current;

    if (owner === undefined) {
      return undefined;
    }

    try {
      const [open] = await apiRef.current.listExecutions(owner, {
        status: IN_FLIGHT_STATUSES,
      });

      return open;
    } catch {
      return undefined;
    }
  };

  const isOngoing = (open: Execution) =>
    isOngoingExecution(open, progressOf(addressRef.current, open.id));

  /**
   * Clears the wallet's in-flight lock before a new execution is created:
   * an open execution on its way is shown instead (`showPrevious`), any
   * other is cancelled (`previous`). `true` when the borrow can go on.
   */
  const clearOpenExecution = async (): Promise<boolean> => {
    const generation = generationRef.current;
    const blocking = await openExecution();

    if (generation !== generationRef.current) {
      return false;
    }

    if (!blocking) {
      return true;
    }

    if (isOngoing(blocking)) {
      showPrevious(blocking);

      return false;
    }

    return cancelOpen(blocking.id, 'previous');
  };

  /** Runs `driveRun` once the wallet's lock is clear. */
  const runClear = async (driveRun: () => Promise<{ id: string }>) => {
    setFlow({ kind: 'signing' });

    if (!(await clearOpenExecution())) {
      return;
    }

    setFlow({ kind: 'signing' });
    await drive(driveRun);
  };

  const leave = async () => {
    generationRef.current += 1;
    resetRun();
    reconnectingRef.current = false;
    reconnectResumeRef.current = undefined;
    confirmedRef.current = false;
    borrowRef.current = undefined;
    waitingRef.current = false;
    intermediaryRef.current = undefined;
    waitingExecutionIdRef.current = undefined;
    setFigures(undefined);
    setFlow({ kind: 'idle' });
  };

  const previewAnd = async (then: 'confirm' | 'run') => {
    const input = inputRef.current;

    if (!input) {
      // A borrow restored after a reload has no form input to quote again:
      // it is left, and the form starts a new one.
      await leave();

      return;
    }

    generationRef.current += 1;

    const generation = generationRef.current;

    setFlow({ kind: 'previewing' });
    resetRun();

    // An earlier borrow still on its way is shown instead of quoting a new
    // one: the new one could not start until it settles.
    const blocking = await openExecution();

    if (generation !== generationRef.current) {
      return;
    }

    if (blocking && isOngoing(blocking)) {
      showPrevious(blocking);

      return;
    }

    let next: Awaited<ReturnType<typeof previewFor>>;

    try {
      next = await previewFor(input, generation);
    } catch (error) {
      if (generation === generationRef.current) {
        await fail(error);
      }

      return;
    }

    if (!next) {
      return;
    }

    // Accepted: what the dialogs show from now on, also when it runs at once.
    setFigures(next.figures);

    if (then === 'confirm') {
      confirmedRef.current = false;
      setFlow(next);

      return;
    }

    const { plan } = next.preview.preview;

    await runClear(() => requireExecution().run(plan));
  };

  const start = async (input: BorrowFlowInput) => {
    const { kind } = stateRef.current;

    // A borrow is already on its way: the dialog is open on it.
    if (kind === 'signing' || kind === 'pending' || kind === 'cancelling') {
      return;
    }

    inputRef.current = input;
    confirmedRef.current = false;
    waitingRef.current = false;
    intermediaryRef.current = undefined;
    waitingExecutionIdRef.current = undefined;
    setFigures(undefined);
    await previewAnd('confirm');
  };

  const confirm = async () => {
    const { current } = stateRef;

    if (current.kind !== 'confirm') {
      return;
    }

    resetRun();
    confirmedRef.current = true;

    const { preview } = current;

    // The dry run's plan as it is: `run()` and `runSteps()` reuse its
    // prepared steps.
    await runClear(() =>
      isStepsPreview(preview)
        ? requireExecution().runSteps(preview.steps.plan)
        : requireExecution().run(preview.preview.plan),
    );
  };

  const fundsWaiting = state.kind === 'error' && isFundsWaiting();

  /** Where the collateral waits: the runner's execution, else the dry run's. */
  const intermediaryOf = (): string | undefined => {
    const known =
      intermediaryRef.current ??
      executionRef.current?.execution?.details.intermediaryAddress;

    const borrowed = borrowRef.current;

    if (known !== undefined || borrowed === undefined) {
      return known;
    }

    return isStepsPreview(borrowed)
      ? borrowed.steps.plan.prepared?.intermediary
      : borrowed.preview.plan.prepared?.intermediary;
  };

  /**
   * The steps-only retry: the borrow re-sized on the market read afresh and
   * the collateral waiting (`previewBorrowSteps`), back to `confirm` with the
   * new figures; confirming runs it with `runSteps()`.
   */
  const retryWaiting = async () => {
    const input = inputRef.current;
    const intermediary = intermediaryOf();

    if (!input || intermediary === undefined) {
      // Restored without its form: nothing to size the borrow from.
      return;
    }

    waitingRef.current = true;
    intermediaryRef.current = intermediary;
    waitingExecutionIdRef.current ??= createdIdRef.current;
    generationRef.current += 1;

    const generation = generationRef.current;

    setFlow({ kind: 'previewing' });
    resetRun();

    let previewed: BorrowStepsPreview;

    try {
      previewed = await previewBorrowSteps({
        adapter: input.adapter,
        market: input.market,
        collateral: input.collateral,
        borrow: input.borrow,
        ltv: input.ltv,
        recipient: input.recipient,
        intermediary,
        previewSteps: (plan) => requireExecution().previewSteps(plan),
      });
    } catch (error) {
      if (generation === generationRef.current) {
        await fail(error);
      }

      return;
    }

    if (generation !== generationRef.current) {
      return;
    }

    const stepsFigures = stepsPreviewFigures({
      spendable: BigInt(previewed.steps.spendable),
      networkFee:
        previewed.steps.networkFee === undefined
          ? undefined
          : BigInt(previewed.steps.networkFee),
      borrowAmount: previewed.borrowAmount,
      collateral: previewed.collateral,
      borrow: previewed.borrow,
    });

    borrowRef.current = previewed;
    confirmedRef.current = false;
    // Accepted: the dialogs show the re-sized borrow from now on.
    setFigures(stepsFigures);
    setFlow({ kind: 'confirm', preview: previewed, figures: stepsFigures });
  };

  /** Asks again for the cancellation the user declined. */
  const retryCancel = async (declined: {
    id: string;
    reason: BorrowCancelReason;
  }) => {
    if (!(await cancelOpen(declined.id, declined.reason))) {
      return;
    }

    if (declined.reason === 'declined') {
      setFlow({
        kind: 'error',
        error: 'rejected',
        cause: lastErrorRef.current,
        step: 0,
      });

      return;
    }

    // The previous execution is gone: the confirmed borrow goes on, quoted
    // afresh since the cancellation may have outlived its quote.
    await previewAnd(confirmedRef.current ? 'run' : 'confirm');
  };

  const retry = async () => {
    const { current } = executionRef;

    if (stateRef.current.kind !== 'error' || !current) {
      return;
    }

    const declined = declinedCancelRef.current;

    if (stateRef.current.error === 'cancelDeclined' && declined) {
      await retryCancel(declined);

      return;
    }

    if (isFundsWaiting()) {
      // The collateral waits at the intermediary: a new bridge-in would
      // spend the user's funds a second time.
      await retryWaiting();

      return;
    }

    if (
      lastErrorRef.current instanceof DepositTransferError ||
      current.recovery?.kind === 'retry-transfer'
    ) {
      // Signed: only the deposit transfer is prompted again.
      lastErrorRef.current = undefined;
      runningRef.current = true;
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
      runningRef.current = true;
      toPending(stepRef.current);
      await drive(() => current.resume(executionId));
    }
  };

  const refresh = async () => {
    // The collateral waits at the intermediary: no new bridge-in.
    if (isFundsWaiting()) {
      await retryWaiting();

      return;
    }

    await previewAnd('confirm');
  };

  /** The pending dialog of a tracked borrow, back from a warning. */
  const trackedPending = (executionId: string): BorrowFlowState => ({
    kind: 'pending',
    step: stepRef.current,
    executionId,
    waitingForDeposit: waitingForDepositRef.current,
  });

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
      setFlow(trackedPending(executionId));
      await drive(() => requireExecution().resume(executionId));

      return;
    }

    setFlow(trackedPending(executionId));
  };

  const reconnect = () => {
    reconnectingRef.current = true;
    // A signed execution whose deposit left the wallet is still live: it is
    // resumed, not quoted again. One never funded is abandoned, and the next
    // borrow cancels it.
    reconnectResumeRef.current =
      isSigned() &&
      (depositSentRef.current ||
        (statusRef.current !== undefined &&
          !AWAITING_FUNDS.has(statusRef.current)))
        ? createdIdRef.current
        : undefined;
    Promise.resolve(connect()).catch(() => {
      reconnectingRef.current = false;
      reconnectResumeRef.current = undefined;
    });
  };

  /**
   * Once the wallet is back: resume a signed execution on its way from the
   * new runner, or else re-quote, since the old dry run was prepared for the
   * runner of the wallet that left.
   */
  const afterReconnect = async () => {
    const executionId = reconnectResumeRef.current;

    reconnectResumeRef.current = undefined;

    if (executionId === undefined) {
      if (isFundsWaiting()) {
        await retryWaiting();
      } else {
        await previewAnd('confirm');
      }

      return;
    }

    lastErrorRef.current = undefined;
    createdIdRef.current = executionId;
    signedRef.current = true;
    runningRef.current = true;
    toPending(stepRef.current);
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

  useEffect(() => () => clearTimeout(delayTimerRef.current), []);

  let action: BorrowRecoveryAction | undefined;

  if (fundsWaiting && state.kind === 'error') {
    // Only the steps-only retry is offered: every other action would bridge
    // the funds in again. Restored without the form, unexplained (such as
    // nothing waiting any more), or on a pair the borrow action no longer
    // covers (its steps can't be built), it only closes.
    action =
      inputRef.current !== undefined &&
      state.error !== 'unknown' &&
      state.error !== 'pairUnsupported'
        ? 'retry'
        : 'close';
  } else if (state.kind === 'error') {
    action = borrowRecoveryAction(state.error, state.cause);
  }

  return {
    state,
    figures,
    start,
    confirm,
    restore,
    action,
    retry,
    refresh,
    reconnect,
    close,
    leave,
    fundsWaiting,
    fundsWaitingExecutionId: fundsWaiting
      ? (waitingExecutionIdRef.current ?? createdIdRef.current)
      : undefined,
  };
};
