import {
  forgetProgress,
  markCreated,
  markDepositSent,
} from '../../stores/executionProgress';
import { BORROW_DELAYED_AFTER_MS } from '../../utils/classifyBorrowError';
import type { BorrowEffect } from '../../flow/events';
import type { EffectContext, EffectHandlers } from './context';

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
 * The page around the run: the "taking longer" timer, the wallet's connect
 * modal, the progress records and the page's callbacks.
 */
export const pageEffects = ({
  dispatch,
  latest,
  delayTimer,
}: EffectContext): Pick<
  EffectHandlers,
  | 'armDelay'
  | 'clearDelay'
  | 'connect'
  | 'progress'
  | 'notifyCreated'
  | 'notifyPrevious'
  | 'notifySettled'
> => ({
  armDelay: (effect) => {
    if (!delayTimer.current) {
      delayTimer.current = setTimeout(() => {
        void dispatch({ type: 'DELAY_ELAPSED', attempt: effect.attempt });
      }, BORROW_DELAYED_AFTER_MS);
    }
  },

  clearDelay: () => {
    clearTimeout(delayTimer.current);
    delayTimer.current = undefined;
  },

  connect: () => {
    // Still connected (the account switched): the new account's runner is
    // in place and nothing the hook's reconnect effect watches will change,
    // so the wallet is back once `connect()` resolves, which it does at
    // once. Otherwise that effect waits for the runner rebuilt for the
    // wallet.
    const { connect, isConnected: stillConnected } = latest.current;

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
  },

  progress: (effect) => {
    PROGRESS_RECORDERS[effect.op](effect.wallet, effect.executionId);
  },

  notifyCreated: (effect) => {
    latest.current.callbacks.onCreated?.(effect.executionId);
  },

  notifyPrevious: (effect) => {
    latest.current.callbacks.onPrevious?.(effect.execution);
  },

  notifySettled: (effect) => {
    latest.current.callbacks.onSettled?.(effect.executionId);
  },
});
