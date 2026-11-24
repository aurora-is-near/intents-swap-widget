import {
  DepositTransferError,
  type Execution,
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
  lockingExecutionId,
} from './classifyBorrowError';
import { checkLiquidity } from './liquidity';
import type { BorrowOrigin } from './plan';
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
import { isBorrowExecution } from './recipe';
import { type BorrowStepsPreview, previewBorrowSteps } from './stepsRetry';

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
 * - `deposit`: signed, but this session can't tell that the deposit was sent
 *   (a reload, or a reconnect, before it was): it waits for the user to send
 *   it (`canSend`, `sendDeposit()`), or, without the token to send it in,
 *   shows the deposit address while the runner watches for it.
 * - `done`: the borrow succeeded.
 * - `error`: one of the error states (`classifyBorrowError`); `delayed` is a
 *   warning, and the borrow is still tracked. `inFlight` and
 *   `transferFailed` carry the execution they are about (`lock`).
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
  | { kind: 'pending'; step: BorrowPendingStep; executionId?: string }
  | {
      kind: 'deposit';
      executionId: string;
      depositAddress: string | undefined;
      canSend: boolean;
    }
  | { kind: 'done'; executionId: string }
  | {
      kind: 'error';
      error: BorrowErrorKind;
      cause: unknown;
      /**
       * Where the borrow was when it failed, for the dialog's step marks:
       * `null` before anything was signed (a pre-check, the dry run, creating
       * the execution), every step waiting; a pending step for an
       * unexplained error after signing. Absent, the kind's own step
       * (`errorCopy`) is used.
       */
      step?: BorrowPendingStep | null;
      /**
       * `inFlight`: the execution holding the wallet's lock;
       * `transferFailed`: the signed borrow whose transfer failed. Absent
       * when no execution could be named.
       */
      lock?: BorrowLock;
    };

/**
 * Where a lock-holding execution is: never signed (`CREATED` without
 * `details.messageSigned`), signed and waiting for a deposit not known to be
 * sent (`DEPOSIT_PENDING`), or past both (running).
 */
export type BorrowLockStage = 'unsigned' | 'deposit' | 'running';

/**
 * Whose the execution is: one of this app's borrows (`aave_borrow`), another
 * app's run on the same wallet, or not known (it could not be looked up).
 */
export type BorrowLockOwner = 'borrow' | 'other' | 'unknown';

/** The execution an `inFlight` or `transferFailed` error is about. */
export type BorrowLock = {
  executionId: string;
  owner: BorrowLockOwner;
  stage: BorrowLockStage;
  /** The execution as looked up, when it was. */
  execution?: RestorableExecution;
  /** What a kept record says about its deposit. */
  saved?: RestoredDeposit;
};

/** An execution's lock stage; `depositSent` from the kept record. */
export const lockStageOf = (
  execution: Pick<Execution, 'status' | 'details'>,
  depositSent?: boolean,
): BorrowLockStage => {
  if (
    execution.status === 'CREATED' &&
    execution.details?.messageSigned !== true
  ) {
    return 'unsigned';
  }

  return execution.status === 'DEPOSIT_PENDING' && depositSent !== true
    ? 'deposit'
    : 'running';
};

/** What is known of the execution `executionId`, looked up or not. */
const lockOf = (
  executionId: string,
  found: FoundExecution | undefined,
): BorrowLock => {
  if (!found) {
    return { executionId, owner: 'unknown', stage: 'running' };
  }

  const { execution, saved } = found;

  return {
    executionId,
    owner: isBorrowExecution(execution) ? 'borrow' : 'other',
    stage: lockStageOf(execution, saved?.depositSent),
    execution,
    ...(saved ? { saved } : {}),
  };
};

/** A steps-only retry's dry run, not a bridge-in's. */
const isStepsPreview = (
  preview: BorrowPreview | BorrowStepsPreview,
): preview is BorrowStepsPreview => 'steps' in preview;

/** What a restored borrow's kept record says about its deposit. */
export type RestoredDeposit = {
  /** The token the deposit is paid in: with it, `sendDeposit()` can send it. */
  origin?: BorrowOrigin | Omit<BorrowOrigin, 'assetId'>;
  /** The wallet broadcast it before the reload. */
  depositSent?: boolean;
};

/** A restored execution: what `restore()` reads of it. */
export type RestorableExecution = Pick<Execution, 'id' | 'status' | 'details'> &
  Partial<Pick<Execution, 'quote' | 'metadata'>>;

/** An execution found by its id, and what a kept record says about it. */
export type FoundExecution = {
  execution: RestorableExecution;
  saved?: RestoredDeposit;
};

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
  /**
   * Called once the execution is over: a terminal status (`SUCCESS`,
   * `DEPOSIT_FAILED`, `OPERATION_FAILED`), or it was cancelled. What
   * `onCreated` kept for it can go.
   */
  onSettled?: (executionId: string) => void;
  /**
   * Called once the wallet broadcast the deposit (the runner's
   * `deposit-sent`), so a reload does not offer to send it again.
   */
  onDepositSent?: (executionId: string) => void;
  /**
   * Looks up an execution of the wallet by id (the in-flight list), to tell
   * whose the execution holding the lock is and where it is. Without it, or
   * when it finds nothing, the lock's owner is `unknown`.
   */
  findExecution?: (executionId: string) => Promise<FoundExecution | undefined>;
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
   * Picks up an in-flight borrow found after a reload: `resume()`s it and
   * shows it as `pending` (or `signing` while it still waits for the
   * signature). A signed `DEPOSIT_PENDING` one whose deposit is not known to
   * be sent shows `deposit` instead. It never has a form input: a retry
   * that would quote again leaves it. Ignored unless `idle`.
   */
  restore: (execution: RestorableExecution, saved?: RestoredDeposit) => void;
  /**
   * From `deposit` with `canSend`: resumes with `depositViaWallet: true`, so
   * the wallet is prompted for the deposit transfer.
   */
  sendDeposit: () => Promise<void>;
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
   * intermediary. `retry()` and `refresh()` re-size the borrow and run it
   * steps-only from them; nothing is bridged again.
   */
  fundsWaiting: boolean;
  /** The execution the funds wait for, while `fundsWaiting`: to find them. */
  fundsWaitingExecutionId: string | undefined;
  /**
   * Shows an in-flight execution found on load that waits for the user (a
   * signature or a deposit), or is another app's, as the `inFlight` error,
   * without resuming it: nothing prompts the wallet until the user picks
   * Resume or Cancel. Ignored unless `idle`.
   */
  offerResume: (
    execution: RestorableExecution,
    saved?: RestoredDeposit,
  ) => void;
  /**
   * From `inFlight`, for one of this app's borrows: follows the execution
   * holding the lock as `restore()` does (`pending`, `signing` or
   * `deposit`). A signed one whose deposit was not sent, with its token
   * known, is resumed with `depositViaWallet`, as `sendDeposit()` does.
   */
  resumeExisting: () => Promise<void>;
  /**
   * From `inFlight` or `transferFailed`: cancels the execution (a wallet
   * signature), forgets what was kept for it, then goes back to `confirm`
   * with a fresh preview when there is a form input (`inFlight`), else to
   * `idle`. A refused cancel stays on the error.
   */
  cancelExisting: () => Promise<void>;
  /** From `transferFailed`: prompts the deposit transfer again. */
  retryTransfer: () => Promise<void>;
  /** The cancel signature is being prompted (`useExecution().isCancelling`). */
  isCancelling: boolean;
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
 */
export const useBorrowFlow = ({
  onCreated,
  onSettled,
  onDepositSent,
  findExecution,
}: UseBorrowFlowOptions = {}): UseBorrowFlowResult => {
  const [state, setState] = useState<BorrowFlowState>({ kind: 'idle' });
  const [figures, setFigures] = useState<BorrowPreviewFigures>();
  const stateRef = useRef(state);

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
  /** This run's deposit was broadcast (`deposit-sent`): never send it again. */
  const depositSentRef = useRef(false);
  /**
   * In `deposit`, the runner watches for a deposit it was not asked to send:
   * its `deposit-address` and awaiting-funds events keep the dialog there.
   */
  const awaitingDepositRef = useRef(false);
  /** The token a signed, unsent deposit is sent in (`sendDeposit()`). */
  const depositOriginRef = useRef<RestoredDeposit['origin']>(undefined);
  /**
   * The collateral of this borrow waits at the intermediary: until the user
   * leaves, every retry runs steps-only from it, never a new bridge-in.
   */
  const waitingRef = useRef(false);
  /** The wallet's intermediary, where the collateral waits. */
  const intermediaryRef = useRef<string | undefined>(undefined);
  /** The execution whose collateral waits: shown so it can be found. */
  const waitingExecutionIdRef = useRef<string | undefined>(undefined);
  /** The deposit address the runner surfaced for this run. */
  const depositAddressRef = useRef<string | undefined>(undefined);
  const onCreatedRef = useRef(onCreated);
  const onSettledRef = useRef(onSettled);
  const onDepositSentRef = useRef(onDepositSent);
  const findExecutionRef = useRef(findExecution);
  /** An `inFlight` error whose lock-holding execution is being looked up. */
  const lookingUpRef = useRef<unknown>(undefined);

  onCreatedRef.current = onCreated;
  onSettledRef.current = onSettled;
  onDepositSentRef.current = onDepositSent;
  findExecutionRef.current = findExecution;

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

  const toPending = (step: BorrowPendingStep) => {
    const { current } = stateRef;

    // Waiting for a deposit nobody was asked to send: only its arrival
    // (step 1 on) moves the dialog on.
    if (awaitingDepositRef.current) {
      if (step === 0) {
        return;
      }

      awaitingDepositRef.current = false;
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
   * The collateral arrived and the borrow step failed: a new bridge-in would
   * spend the user's funds a second time.
   */
  const isFundsWaiting = () =>
    waitingRef.current ||
    (isSigned() && statusRef.current === 'OPERATION_FAILED');

  /**
   * Where an error of `kind` is drawn (`BorrowFlowState`'s error `step`).
   * Before the signature nothing is marked, except a declined prompt: that
   * is the signing step's own failure, drawn as its artboard does. After it,
   * an unexplained error is drawn on the step the borrow had reached; the
   * other kinds keep their artboard's step. While the collateral waits (a
   * steps-only retry resets the run, so its signature is not counted), the
   * deposit happened: the dialog draws it as a funds-waiting error.
   */
  const errorStepOf = (
    kind: BorrowErrorKind,
  ): Pick<Extract<BorrowFlowState, { kind: 'error' }>, 'step'> => {
    if (isFundsWaiting()) {
      return {};
    }

    if (!isSigned()) {
      return kind === 'rejected' ? {} : { step: null };
    }

    return kind === 'unknown' ? { step: stepRef.current } : {};
  };

  /** Classifies `error` into the error state; the borrow step is read afresh. */
  const fail = async (error: unknown) => {
    if (
      lastErrorRef.current === error &&
      (stateRef.current.kind === 'error' || lookingUpRef.current === error)
    ) {
      return;
    }

    // Unexpected errors land as `unknown`: logged, so they can be debugged.
    // eslint-disable-next-line no-console
    console.error('[Borrow] The borrow failed:', error);

    lastErrorRef.current = error;
    runningRef.current = false;
    clearDelayTimer();

    const generation = generationRef.current;
    const status = statusRef.current;
    let borrowStep: BorrowStepFailure | undefined;
    const input = inputRef.current;
    const borrowed = borrowRef.current;
    const recovery = executionRef.current?.recovery;
    const kind = classifyBorrowError(error, recovery, { status });

    if (kind === 'inFlight') {
      // Another execution holds the wallet's lock: looked up first, so the
      // dialog can say whose it is and where, and offer the right actions.
      const executionId = lockingExecutionId(error, recovery);

      lookingUpRef.current = error;

      const found =
        executionId === undefined
          ? undefined
          : await findExecutionRef
              .current?.(executionId)
              .catch(() => undefined);

      if (
        generation !== generationRef.current ||
        lookingUpRef.current !== error
      ) {
        return;
      }

      lookingUpRef.current = undefined;
      setFlow({
        kind: 'error',
        error: kind,
        cause: error,
        ...errorStepOf(kind),
        ...(executionId === undefined
          ? {}
          : { lock: lockOf(executionId, found) }),
      });

      return;
    }

    if (kind === 'transferFailed') {
      const executionId =
        recovery?.executionId ??
        (error instanceof DepositTransferError
          ? error.executionId
          : createdIdRef.current);

      setFlow({
        kind: 'error',
        error: kind,
        cause: error,
        ...errorStepOf(kind),
        ...(executionId === undefined
          ? {}
          : {
              lock: {
                executionId,
                owner: 'borrow',
                stage: 'deposit',
              } satisfies BorrowLock,
            }),
      });

      return;
    }

    // Shown as `error` at once, refined once the market is read.
    setFlow({ kind: 'error', error: kind, cause: error, ...errorStepOf(kind) });

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
        const refined = classifyBorrowError(
          error,
          executionRef.current?.recovery,
          { status, borrowStep },
        );

        setFlow({
          kind: 'error',
          error: refined,
          cause: error,
          ...errorStepOf(refined),
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

        if (TERMINAL_STATUSES.includes(event.status)) {
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
        onCreatedRef.current?.(event.executionId);
        break;

      case 'deposit-address': {
        signedRef.current = true;
        depositAddressRef.current = event.address;

        const { current } = stateRef;

        if (awaitingDepositRef.current && current.kind === 'deposit') {
          // The address the runner surfaced, for a deposit sent by hand.
          setFlow({ ...current, depositAddress: event.address });
        } else {
          toPending(0);
        }

        break;
      }

      case 'deposit-sent':
        signedRef.current = true;
        depositSentRef.current = true;

        if (createdIdRef.current !== undefined) {
          onDepositSentRef.current?.(createdIdRef.current);
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

    settled(executionId);
  };

  /** A fresh run's bookkeeping. */
  const resetRun = () => {
    clearDelayTimer();
    runningRef.current = false;
    createdIdRef.current = undefined;
    statusRef.current = undefined;
    stepRef.current = 0;
    lastErrorRef.current = undefined;
    lookingUpRef.current = undefined;
    delayDismissedRef.current = false;
    signedRef.current = false;
    depositSentRef.current = false;
    awaitingDepositRef.current = false;
    depositAddressRef.current = undefined;
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

  const leave = async () => {
    generationRef.current += 1;
    await releaseUnsigned();
    resetRun();
    reconnectingRef.current = false;
    reconnectResumeRef.current = undefined;
    confirmedRef.current = false;
    borrowRef.current = undefined;
    waitingRef.current = false;
    intermediaryRef.current = undefined;
    waitingExecutionIdRef.current = undefined;
    depositOriginRef.current = undefined;
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
    // An earlier run's unsigned execution would hold the wallet's lock.
    await releaseUnsigned();
    resetRun();

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
    waitingRef.current = false;
    intermediaryRef.current = undefined;
    waitingExecutionIdRef.current = undefined;
    depositOriginRef.current = undefined;
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
    setFlow({ kind: 'signing' });

    const { preview } = current;

    // The dry run's plan as it is: `run()` and `runSteps()` reuse its
    // prepared steps.
    await drive(() =>
      isStepsPreview(preview)
        ? requireExecution().runSteps(preview.steps.plan)
        : requireExecution().run(preview.preview.plan),
    );
  };

  /**
   * Signed, and the deposit not known to be sent: with its token, the user
   * is offered to send it (no runner flow until then: the runner refuses a
   * second one); without, the runner surfaces the address and watches.
   */
  const awaitDeposit = (
    executionId: string,
    depositAddress: string | undefined,
    origin: RestoredDeposit['origin'],
  ) => {
    createdIdRef.current = executionId;
    signedRef.current = true;
    depositOriginRef.current = origin;
    clearDelayTimer();

    const address = depositAddress === '' ? undefined : depositAddress;

    if (origin) {
      runningRef.current = false;
      setFlow({
        kind: 'deposit',
        executionId,
        depositAddress: address,
        canSend: true,
      });

      return;
    }

    awaitingDepositRef.current = true;
    setFlow({
      kind: 'deposit',
      executionId,
      depositAddress: address,
      canSend: false,
    });
    void drive(() => requireExecution().resume(executionId));
  };

  const sendDeposit = async () => {
    const { current } = stateRef;
    const origin = depositOriginRef.current;

    if (current.kind !== 'deposit' || !current.canSend || !origin) {
      return;
    }

    const { executionId } = current;

    generationRef.current += 1;
    awaitingDepositRef.current = false;
    lastErrorRef.current = undefined;
    createdIdRef.current = executionId;
    toPending(0);
    // The user says no deposit was sent: the runner may prompt it
    // (`ResumeDepositOptions.depositViaWallet`).
    await drive(() =>
      requireExecution().resume(executionId, {
        depositViaWallet: true,
        originChain: origin.chain,
        originToken: {
          contractAddress: origin.contractAddress,
          decimals: origin.decimals,
        },
      }),
    );
  };

  /**
   * Forgets this session's borrow for one found by id: a restored borrow has
   * no form input, so an earlier one in this session (another wallet's,
   * say) must never be quoted or run for it.
   */
  const forgetForFound = () => {
    generationRef.current += 1;
    resetRun();
    inputRef.current = undefined;
    borrowRef.current = undefined;
    // Nor are its figures known: the dialog shows the kept rows instead.
    setFigures(undefined);
    waitingRef.current = false;
    intermediaryRef.current = undefined;
    waitingExecutionIdRef.current = undefined;
    reconnectingRef.current = false;
    reconnectResumeRef.current = undefined;
  };

  /** Follows `found`, whatever the state: `restore()` and `resumeExisting()`. */
  const follow = (found: RestorableExecution, saved?: RestoredDeposit) => {
    forgetForFound();
    depositOriginRef.current = saved?.origin;
    depositSentRef.current = saved?.depositSent === true;
    createdIdRef.current = found.id;
    statusRef.current = found.status;
    // It was confirmed before the reload. Past CREATED, or with the message
    // signed, the service has the signature; else resuming prompts for it.
    confirmedRef.current = true;
    signedRef.current =
      found.status !== 'CREATED' || found.details?.messageSigned === true;

    const { id } = found;

    if (
      signedRef.current &&
      found.status === 'DEPOSIT_PENDING' &&
      !depositSentRef.current
    ) {
      // Resumed without `depositViaWallet`, the runner would only surface
      // the address, and no wallet prompt would come.
      awaitDeposit(id, found.quote?.depositAddress, saved?.origin);

      return;
    }

    if (signedRef.current) {
      // A deposit sent before the reload is on its way: past step 0.
      toPending(
        depositSentRef.current
          ? (Math.max(STATUS_STEP[found.status] ?? 0, 1) as BorrowPendingStep)
          : (STATUS_STEP[found.status] ?? 0),
      );
    } else {
      setFlow({ kind: 'signing' });
    }

    void drive(() => requireExecution().resume(id));
  };

  const restore = (found: RestorableExecution, saved?: RestoredDeposit) => {
    if (stateRef.current.kind !== 'idle') {
      return;
    }

    follow(found, saved);
  };

  const offerResume = (found: RestorableExecution, saved?: RestoredDeposit) => {
    if (stateRef.current.kind !== 'idle') {
      return;
    }

    forgetForFound();
    confirmedRef.current = false;
    depositOriginRef.current = undefined;
    setFlow({
      kind: 'error',
      error: 'inFlight',
      cause: undefined,
      step: null,
      lock: lockOf(found.id, { execution: found, saved }),
    });
  };

  /** The `inFlight` or `transferFailed` error's execution, if one is shown. */
  const shownLock = (...kinds: BorrowErrorKind[]): BorrowLock | undefined => {
    const { current } = stateRef;

    return current.kind === 'error' && kinds.includes(current.error)
      ? current.lock
      : undefined;
  };

  const resumeExisting = async () => {
    const lock = shownLock('inFlight');

    // Only one of this app's borrows is followed here.
    if (lock?.owner !== 'borrow' || !lock.execution) {
      return;
    }

    follow(lock.execution, lock.saved);

    const { current } = stateRef;

    if (current.kind === 'deposit' && current.canSend) {
      // Signed, the deposit not sent and its token known: the user asked to
      // resume it, so the wallet is prompted for it at once.
      await sendDeposit();
    }
  };

  const cancelExisting = async () => {
    const { current } = stateRef;
    const lock = shownLock('inFlight', 'transferFailed');

    if (current.kind !== 'error' || !lock) {
      return;
    }

    const generation = generationRef.current;

    try {
      await requireExecution().cancel(lock.executionId);
    } catch {
      // Refused or failed: the error stays, so it can be tried again.
      return;
    }

    settled(lock.executionId);

    if (generation !== generationRef.current) {
      return;
    }

    if (createdIdRef.current === lock.executionId) {
      createdIdRef.current = undefined;
    }

    // In flight: the user wanted a new borrow, so its quote (maybe expired
    // meanwhile) is fetched again. A failed transfer's borrow is left.
    if (current.error === 'inFlight' && inputRef.current) {
      await previewAnd('confirm');

      return;
    }

    await leave();
  };

  /** Prompts the signed borrow's deposit transfer again (`retryDeposit()`). */
  const promptTransfer = async (current: UseExecutionResult) => {
    lastErrorRef.current = undefined;
    toPending(stepRef.current);
    await drive(() => current.retryDeposit());
  };

  const retryTransfer = async () => {
    const { current } = executionRef;

    if (!current || !shownLock('transferFailed')) {
      return;
    }

    await promptTransfer(current);
  };

  /** Shown on an error while the collateral waits (`isFundsWaiting`). */
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
    // A rejected retry's unsigned execution would hold the wallet's lock.
    await releaseUnsigned();
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

  const retry = async () => {
    const { current } = executionRef;

    if (stateRef.current.kind !== 'error' || !current) {
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
      await promptTransfer(current);

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
      if (isFundsWaiting()) {
        await retryWaiting();
      } else {
        await previewAnd('confirm');
      }

      return;
    }

    lastErrorRef.current = undefined;

    const status = statusRef.current;

    if (
      !depositSentRef.current &&
      (status === undefined || AWAITING_FUNDS.has(status)) &&
      stepRef.current === 0
    ) {
      // Signed, deposit not sent: the new runner did not drive this run, so
      // a plain resume would only surface the address.
      awaitDeposit(
        executionId,
        depositAddressRef.current,
        inputRef.current?.origin ?? depositOriginRef.current,
      );

      return;
    }

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

  /**
   * The lock and a failed transfer have their own actions (Resume, Retry
   * transfer), which never bridge the funds in again: a steps-only retry
   * that meets the wallet's lock is resumed or cancelled, not run again.
   */
  const ownActions =
    state.kind === 'error' &&
    (state.error === 'inFlight' || state.error === 'transferFailed');

  if (fundsWaiting && state.kind === 'error' && !ownActions) {
    // Only the steps-only retry is offered: every other action would bridge
    // the funds in again. Restored without the form, or unexplained (such
    // as nothing waiting any more), it only closes.
    action =
      inputRef.current !== undefined && state.error !== 'unknown'
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
    sendDeposit,
    fundsWaiting,
    fundsWaitingExecutionId: fundsWaiting
      ? (waitingExecutionIdRef.current ?? createdIdRef.current)
      : undefined,
    offerResume,
    resumeExisting,
    cancelExisting,
    retryTransfer,
    isCancelling: execution.isCancelling,
  };
};
