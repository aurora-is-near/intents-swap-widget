import {
  useExecution,
  useIntentsConnect,
} from '@aurora-is-near/intents-connect/react';
import { useEffect, useRef, useState } from 'react';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';
import type { RunnerEvent } from '@aurora-is-near/intents-connect';

import { useWallet } from '@/domains/wallet/hooks/useWallet';

import { initialState } from '../flow/state';
import { transition } from '../flow/transition';
import { viewOf } from '../flow/view';
import { progressOf } from '../stores/executionProgress';
import { pageEffects } from './effects/pageEffects';
import { quoteEffects } from './effects/quoteEffects';
import { runnerEffects } from './effects/runnerEffects';
import type { BorrowEvent, FlowEnv } from '../flow/events';
import type { BorrowState } from '../flow/state';
import type {
  BorrowFlowInput,
  BorrowFlowState,
  RestorableExecution,
  UseBorrowFlowOptions,
} from '../flow/types';
import type { BorrowRecoveryAction } from '../utils/borrowRecoveryAction';
import type { BorrowPreviewFigures } from '../utils/previewFigures';
import type {
  EffectContext,
  EffectHandler,
  EffectHandlers,
  Latest,
} from './effects/context';

export type { BorrowFlowInput, BorrowFlowState } from '../flow/types';

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

/** How each effect `transition` returns is run, by its `type`. */
const createEffectHandlers = (context: EffectContext): EffectHandlers => ({
  ...quoteEffects(context),
  ...runnerEffects(context),
  ...pageEffects(context),
});

/**
 * A borrow from the confirm dialog to done or an error, over the SDK's
 * `useExecution({ onEvent })`.
 *
 * The decisions are a pure state machine (`flow/transition.ts`: states in
 * `flow/state.ts`, events and effects in `flow/events.ts`, guards in
 * `flow/guards.ts`); this hook only feeds it events and runs the effects it
 * returns (`effects/`): the dry runs, the runner, the wallet's open
 * executions, the cancellation, the "taking longer" timer and the page's
 * callbacks.
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
  const { address: wallet, connect, isConnected } = useWallet();
  const { api } = useIntentsConnect();

  /** What this render read, for effects that run later. */
  const latestValue: Latest = {
    api,
    wallet,
    isConnected,
    connect,
    callbacks: { onCreated, onPrevious, onSettled },
  };

  const latest = useRef(latestValue);

  latest.current = latestValue;

  const executionRef = useRef<UseExecutionResult | undefined>(undefined);
  // This render's effect handlers, which call `dispatch` in turn.
  const handlersRef = useRef<EffectHandlers | undefined>(undefined);
  const drivingRef = useRef<{ attempt: number } | undefined>(undefined);
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
      wallet: latest.current.wallet,
      runnerSigned: current?.hasSubmittedSignature === true,
      runnerExecutionId: current?.executionId,
      runnerIntermediary: current?.execution?.details.intermediaryAddress,
      hasOnPrevious: latest.current.callbacks.onPrevious !== undefined,
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

  handlersRef.current = createEffectHandlers({
    dispatch,
    runner: requireExecution,
    latest,
    driving: drivingRef,
    delayTimer: delayTimerRef,
  });

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
        known: progressOf(latest.current.wallet, found.id),
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
