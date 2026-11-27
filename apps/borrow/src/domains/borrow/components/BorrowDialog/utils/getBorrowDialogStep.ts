import { assertNever } from '@/utils/assertNever';

import { borrowRecoveryAction } from '../../../utils/borrowRecoveryAction';
import { apiErrorMessage } from '../../../utils/errorCauses';
import type {
  BorrowCancelReason,
  BorrowFlowState,
  BorrowPendingStep,
} from '../../../flow/types';
import type { BorrowRecoveryAction } from '../../../utils/borrowRecoveryAction';
import type { BorrowErrorKind } from '../../../utils/classifyBorrowError';

/**
 * What a pending borrow waits for, and so what the user is told to do:
 * - `sign`: the wallet prompt for the intent's signature;
 * - `deposit`: the wallet prompt for the deposit transaction;
 * - `awaitingDeposit`: nothing to do; a deposit that may have been sent
 *   before a reload is waited for;
 * - `bridging`: nothing to do; the deposit left the wallet;
 * - `opening`: nothing to do; the loan is opening on the market.
 */
export type BorrowPendingNote =
  | 'sign'
  | 'deposit'
  | 'awaitingDeposit'
  | 'bridging'
  | 'opening';

/** Which of the borrow dialogs is shown. */
export type BorrowDialogStep =
  | { kind: 'confirm' }
  | { kind: 'pending'; step: BorrowPendingStep; note: BorrowPendingNote }
  | {
      /** The wallet prompt to cancel an open execution is up. */
      kind: 'cancelling';
      reason: BorrowCancelReason;
    }
  | { kind: 'done' }
  | {
      kind: 'error';
      error: BorrowErrorKind;
      /**
       * The step the borrow had reached, drawn as failed (or active, for a
       * warning); the kind's own step when not known.
       */
      step?: BorrowPendingStep;
      action: BorrowRecoveryAction;
      /** The collateral arrived and waits; the borrow step failed. */
      fundsWaiting: boolean;
      /** While `fundsWaiting`: the execution, so the collateral can be found. */
      executionId?: string;
      /**
       * An `unknown` error's reason from the Intents Connect API (such as
       * "No liquidity available"), shown instead of the generic text.
       */
      detail?: string;
    };

/** Every dialog but done, which draws no steps. */
export type ProgressStep = Exclude<BorrowDialogStep, { kind: 'done' }>;

/** A pending step's note: step 0 is the deposit prompt, or waiting for it. */
const PENDING_NOTE_AT: Record<
  BorrowPendingStep,
  (waitingForDeposit: boolean) => BorrowPendingNote
> = {
  0: (waitingForDeposit) => (waitingForDeposit ? 'awaitingDeposit' : 'deposit'),
  1: () => 'bridging',
  2: () => 'opening',
};

/**
 * The dialog for a flow state. Signing is the artboard's first pending
 * step ("Sign and deposit"); `idle` and `previewing` show no dialog here.
 * An error offers the hook's `action` (`useBorrowFlow().action`), else the
 * kind's own (`borrowRecoveryAction`).
 */
export const getBorrowDialogStep = (
  state: BorrowFlowState,
  action?: BorrowRecoveryAction,
  fundsWaiting = false,
  fundsWaitingExecutionId?: string,
): BorrowDialogStep | undefined => {
  switch (state.kind) {
    case 'idle':
    case 'previewing':
      return undefined;
    case 'confirm':
      return { kind: 'confirm' };
    case 'signing':
      return { kind: 'pending', step: 0, note: 'sign' };
    case 'cancelling':
      return { kind: 'cancelling', reason: state.reason };
    case 'pending':
      return {
        kind: 'pending',
        step: state.step,
        note: PENDING_NOTE_AT[state.step](state.waitingForDeposit),
      };
    case 'done':
      return { kind: 'done' };

    case 'error': {
      const detail =
        state.error === 'unknown' ? apiErrorMessage(state.cause) : undefined;

      return {
        kind: 'error',
        error: state.error,
        step: state.step,
        fundsWaiting,
        ...(detail ? { detail } : {}),
        ...(fundsWaiting && fundsWaitingExecutionId
          ? { executionId: fundsWaitingExecutionId }
          : {}),
        action: action ?? borrowRecoveryAction(state.error),
      };
    }
    default:
      return assertNever(state, 'flow state');
  }
};
