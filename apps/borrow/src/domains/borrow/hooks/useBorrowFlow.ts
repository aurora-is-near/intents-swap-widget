import { IN_FLIGHT_STATUSES } from '@aurora-is-near/intents-connect';
import {
  useExecution,
  useIntentsConnect,
} from '@aurora-is-near/intents-connect/react';
import { useIntentsConnectWallet } from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import { useEffect, useRef, useState } from 'react';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';
import type { Execution, RunnerEvent } from '@aurora-is-near/intents-connect';

import { isStepsPreview } from '../flow/guards';
import { initialState } from '../flow/state';
import { transition } from '../flow/transition';
import { viewOf } from '../flow/view';
import {
  forgetProgress,
  markCreated,
  markDepositSent,
  progressOf,
} from '../stores/executionProgress';
import {
  BORROW_DELAYED_AFTER_MS,
  BorrowPreCheckError,
  checkLiquidity,
  checkOriginGas,
  diagnoseBorrowStep,
} from '../utils/classifyBorrowError';
import { previewBorrow } from '../utils/preview';
import {
  borrowPreviewFigures,
  stepsPreviewFigures,
} from '../utils/previewFigures';
import { previewBorrowSteps } from '../utils/stepsRetry';
import type { BorrowEffect, BorrowEvent, FlowEnv } from '../flow/events';
import type { BorrowState, DriveHow } from '../flow/state';
import type {
  BorrowFlowInput,
  BorrowFlowState,
  RestorableExecution,
} from '../flow/types';
import type { BorrowRecoveryAction } from '../utils/classifyBorrowError';
import type { BorrowPreview } from '../utils/preview';
import type { BorrowPreviewFigures } from '../utils/previewFigures';
import type { BorrowStepsPreview } from '../utils/stepsRetry';

export type {
  BorrowCancelReason,
  BorrowFlowInput,
  BorrowFlowState,
  BorrowPendingStep,
} from '../flow/types';

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
   * transfer after a `DepositTransferError`, retries only the steps when the
   * collateral is waiting, previews afresh when nothing was signed (running
   * it if the user had confirmed, else back to `confirm`), else keeps
   * watching the signed execution.
   */
  retry: () => Promise<void>;
  /** Re-quotes and goes back to `confirm`. */
  refresh: () => Promise<void>;
  /**
   * Opens the wallet's connect modal. Once connected, resumes a signed
   * execution, retries only the steps when the collateral is waiting, else
   * re-quotes.
   */
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

type Quoted = {
  preview: BorrowPreview | BorrowStepsPreview;
  figures: BorrowPreviewFigures;
};

type EffectHandler<E extends BorrowEffect = BorrowEffect> = (
  effect: E,
) => Promise<void> | undefined;

/** A runner for each effect `type`, given the effect of that `type`. */
type EffectHandlers = {
  [T in BorrowEffect['type']]: EffectHandler<
    Extract<BorrowEffect, { type: T }>
  >;
};

/** Which `executionProgress` write each `progress` effect's `op` is. */
const PROGRESS_RECORDERS = {
  created: markCreated,
  depositSent: markDepositSent,
  forget: forgetProgress,
} satisfies Record<
  Extract<BorrowEffect, { type: 'progress' }>['op'],
  (wallet: string | undefined, executionId: string) => void
>;

/**
 * A borrow from the confirm dialog to done or an error, over the SDK's
 * `useExecution({ onEvent })`.
 *
 * The decisions are a pure state machine (`flow/transition.ts`: states in
 * `flow/state.ts`, events and effects in `flow/events.ts`, guards in
 * `flow/guards.ts`); this hook only feeds it events and runs the effects it
 * returns: the dry runs, the runner, the wallet's open executions, the
 * cancellation, the "taking longer" timer and the page's callbacks.
 *
 * Each method's promise settles once the work it started has (a run held
 * open keeps `confirm()` pending), except following an execution this run
 * did not start (`restore()`, the previous borrow), which is never awaited.
 */
export const useBorrowFlow = ({
  onCreated,
  onPrevious,
  onSettled,
}: UseBorrowFlowOptions = {}): UseBorrowFlowResult => {
  const [state, setState] = useState<BorrowState>(initialState);
  const stateRef = useRef(state);
  const {
    address: walletAddress,
    connect,
    isConnected,
  } = useIntentsConnectWallet();

  const { api } = useIntentsConnect();
  const apiRef = useRef(api);

  apiRef.current = api;

  /** The connected wallet, read when an effect runs rather than rendered. */
  const addressRef = useRef(walletAddress);

  addressRef.current = walletAddress;

  const callbacksRef = useRef({ onCreated, onPrevious, onSettled });

  callbacksRef.current = { onCreated, onPrevious, onSettled };

  const executionRef = useRef<UseExecutionResult | undefined>(undefined);
  // This render's effect handlers, which call `dispatch` in turn.
  const handlersRef = useRef<EffectHandlers | undefined>(undefined);
  /**
   * The runner's current drive, and the attempt its events and its result
   * are tagged with: the one that started it, or a later one following it.
   */
  const drivingRef = useRef<{ attempt: number } | undefined>(undefined);
  /** Whether the wallet is connected, read when an effect runs. */
  const connectedRef = useRef(isConnected);

  connectedRef.current = isConnected;
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  /** The hook's latest result: set on every render, before any effect runs. */
  const requireExecution = (): UseExecutionResult => {
    if (!executionRef.current) {
      throw new Error('useExecution has not rendered yet');
    }

    return executionRef.current;
  };

  const envNow = (): FlowEnv => {
    const { current } = executionRef;

    return {
      wallet: addressRef.current,
      runnerSigned: current?.hasSubmittedSignature === true,
      runnerExecutionId: current?.executionId,
      runnerIntermediary: current?.execution?.details.intermediaryAddress,
      hasOnPrevious: callbacksRef.current.onPrevious !== undefined,
    };
  };

  /**
   * Runs the transition, then its effects. Resolves once every effect it
   * awaits, and every event those dispatch in turn, has settled.
   */
  const dispatch = (event: BorrowEvent): Promise<void> => {
    const { state: next, effects } = transition(
      stateRef.current,
      event,
      envNow(),
    );

    if (next !== stateRef.current) {
      stateRef.current = next;
      setState(next);
    }

    const handlers = handlersRef.current;

    if (!handlers) {
      throw new Error('useBorrowFlow dispatched before its first render');
    }

    const awaited = effects.flatMap((effect) => {
      // The handler is picked by the effect's own `type`, so it takes this effect.
      const running = (handlers[effect.type] as EffectHandler)(effect);

      return running ? [running] : [];
    });

    return Promise.all(awaited).then(() => undefined);
  };

  /** The wallet's first open execution; unread (an error) counts as none. */
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

  /** Gas pre-check, the two-pass dry run and the liquidity pre-check. */
  const quote = async (input: BorrowFlowInput): Promise<Quoted> => {
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

    return {
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

  /** The steps-only dry runs over the collateral waiting at `intermediary`. */
  const quoteSteps = async (
    input: BorrowFlowInput,
    intermediary: string,
  ): Promise<Quoted> => {
    const previewed = await previewBorrowSteps({
      adapter: input.adapter,
      market: input.market,
      collateral: input.collateral,
      borrow: input.borrow,
      ltv: input.ltv,
      recipient: input.recipient,
      intermediary,
      previewSteps: (plan) => requireExecution().previewSteps(plan),
    });

    return {
      preview: previewed,
      figures: stepsPreviewFigures({
        spendable: BigInt(previewed.steps.spendable),
        networkFee:
          previewed.steps.networkFee === undefined
            ? undefined
            : BigInt(previewed.steps.networkFee),
        borrowAmount: previewed.borrowAmount,
        collateral: previewed.collateral,
        borrow: previewed.borrow,
      }),
    };
  };

  const startDrive = (how: DriveHow): Promise<{ id: string }> => {
    const runner = requireExecution();

    switch (how.kind) {
      case 'run':
        return runner.run(how.plan);
      case 'runSteps':
        return runner.runSteps(how.plan);
      case 'resume':
        return runner.resume(how.executionId);
      default:
        return runner.retryDeposit();
    }
  };

  /**
   * Drives the runner for `attempt`: its events, then its result, go to the
   * machine, under the attempt following the drive by then (`follow` may
   * hand it to a later one).
   */
  const drive = async (attempt: number, how: DriveHow) => {
    const driving = { attempt };

    drivingRef.current = driving;

    let outcome: BorrowEvent;

    try {
      const { id } = await startDrive(how);

      outcome = { type: 'RUN_DONE', attempt: driving.attempt, id };
    } catch (error) {
      outcome = { type: 'RUN_FAILED', attempt: driving.attempt, error };
    }

    if (drivingRef.current === driving) {
      drivingRef.current = undefined;
    }

    await dispatch(outcome);
  };

  const clearDelayTimer = () => {
    clearTimeout(delayTimerRef.current);
    delayTimerRef.current = undefined;
  };

  /** `QUOTED` or `QUOTE_FAILED`, once a dry run for `attempt` settles. */
  const settleQuote = (attempt: number, quoting: Promise<Quoted>) =>
    quoting.then(
      (quoted) => dispatch({ type: 'QUOTED', attempt, ...quoted }),
      (error: unknown) => dispatch({ type: 'QUOTE_FAILED', attempt, error }),
    );

  /** How each effect `transition` returns is run, by its `type`. */
  const handlers: EffectHandlers = {
    listOpen: (effect) =>
      openExecution().then((open) =>
        dispatch({
          type: 'OPEN_LISTED',
          attempt: effect.attempt,
          open,
          known: open ? progressOf(addressRef.current, open.id) : undefined,
        }),
      ),

    quote: (effect) => settleQuote(effect.attempt, quote(effect.input)),

    quoteSteps: (effect) =>
      settleQuote(
        effect.attempt,
        quoteSteps(effect.input, effect.intermediary),
      ),

    drive: (effect) => drive(effect.attempt, effect.how),

    follow: (effect) => {
      const { current } = executionRef;

      // This runner still drives it (the dialog was closed while it ran):
      // its events, and the result of the drive under way, now go to this
      // attempt; a second resume would be refused.
      if (
        current?.isBusy === true &&
        current.executionId === effect.executionId
      ) {
        if (drivingRef.current) {
          drivingRef.current.attempt = effect.attempt;
        } else {
          drivingRef.current = { attempt: effect.attempt };
        }
      } else {
        void drive(effect.attempt, {
          kind: 'resume',
          executionId: effect.executionId,
        });
      }

      return undefined;
    },

    cancel: (effect) =>
      requireExecution()
        .cancel(effect.executionId)
        .then(
          () =>
            dispatch({
              type: 'CANCELLED',
              attempt: effect.attempt,
              executionId: effect.executionId,
            }),
          (error: unknown) =>
            dispatch({
              type: 'CANCEL_FAILED',
              attempt: effect.attempt,
              executionId: effect.executionId,
              error,
            }),
        ),

    diagnose: (effect) => {
      const { input, borrowed } = effect;

      return input.adapter
        .getMarketSnapshot(input.market)
        .then((snapshot) =>
          diagnoseBorrowStep({
            snapshot,
            collateral: input.collateral,
            borrow: input.borrow,
            // What was supplied: the steps-only `spendable`, else the
            // bridge's minimum received.
            collateralAmount: BigInt(
              isStepsPreview(borrowed)
                ? borrowed.steps.spendable
                : borrowed.preview.execution.quote.minAmountOut,
            ),
            borrowAmount: borrowed.borrowAmount,
          }),
        )
        .then(
          (borrowStep) =>
            borrowStep
              ? dispatch({
                  type: 'DIAGNOSED',
                  attempt: effect.attempt,
                  cause: effect.cause,
                  borrowStep,
                })
              : undefined,
          // Unread: the failure stays unexplained.
          () => undefined,
        );
    },

    armDelay: (effect) => {
      if (!delayTimerRef.current) {
        delayTimerRef.current = setTimeout(() => {
          void dispatch({ type: 'DELAY_ELAPSED', attempt: effect.attempt });
        }, BORROW_DELAYED_AFTER_MS);
      }

      return undefined;
    },

    clearDelay: () => {
      clearDelayTimer();

      return undefined;
    },

    connect: () => {
      // Still connected (the account switched): the new account's runner is
      // in place and nothing the effect below watches will change, so the
      // wallet is back once `connect()` resolves, which it does at once.
      // Otherwise the effect waits for the runner rebuilt for the wallet.
      const stillConnected = connectedRef.current;

      Promise.resolve(connect()).then(
        () => {
          if (stillConnected) {
            void dispatch({ type: 'WALLET_BACK' });
          }
        },
        () => {
          void dispatch({ type: 'RECONNECT_FAILED' });
        },
      );

      return undefined;
    },

    progress: (effect) => {
      PROGRESS_RECORDERS[effect.op](effect.wallet, effect.executionId);

      return undefined;
    },

    notifyCreated: (effect) => {
      callbacksRef.current.onCreated?.(effect.executionId);

      return undefined;
    },

    notifyPrevious: (effect) => {
      callbacksRef.current.onPrevious?.(effect.execution);

      return undefined;
    },

    notifySettled: (effect) => {
      callbacksRef.current.onSettled?.(effect.executionId);

      return undefined;
    },
  };

  handlersRef.current = handlers;

  const onEvent = (event: RunnerEvent) => {
    void dispatch({
      type: 'RUNNER',
      attempt: drivingRef.current?.attempt,
      event,
    });
  };

  const execution = useExecution({ onEvent });

  executionRef.current = execution;

  // Once the wallet is back from the connect modal (`execution.preview`
  // changes with the runner, which is rebuilt for the new wallet).
  useEffect(() => {
    const { current } = stateRef;

    if (isConnected && current.kind !== 'idle' && current.run.reconnect) {
      void dispatch({ type: 'WALLET_BACK' });
    }
  }, [isConnected, execution.preview]);

  useEffect(() => () => clearTimeout(delayTimerRef.current), []);

  const view = viewOf(state, envNow());

  return {
    ...view,
    start: (input) => dispatch({ type: 'START', input }),
    confirm: () => dispatch({ type: 'CONFIRM' }),
    restore: (found) => {
      void dispatch({
        type: 'RESTORE',
        execution: found,
        known: progressOf(addressRef.current, found.id),
      });
    },
    retry: () => dispatch({ type: 'RETRY' }),
    refresh: () => dispatch({ type: 'REFRESH' }),
    reconnect: () => {
      void dispatch({ type: 'RECONNECT' });
    },
    close: () => dispatch({ type: 'CLOSE' }),
    leave: () => dispatch({ type: 'LEAVE' }),
  };
};
