import { borrowRecoveryAction } from '../utils/classifyBorrowError';
import { isFundsWaiting } from './guards';
import type {
  BorrowErrorKind,
  BorrowRecoveryAction,
} from '../utils/classifyBorrowError';
import type { BorrowPreviewFigures } from '../utils/previewFigures';
import type { FlowEnv } from './events';
import type { BorrowState } from './state';
import type { BorrowFlowState } from './types';

/** What `useBorrowFlow` returns about the machine's state. */
type BorrowFlowView = {
  state: BorrowFlowState;
  figures: BorrowPreviewFigures | undefined;
  action: BorrowRecoveryAction | undefined;
  fundsWaiting: boolean;
  fundsWaitingExecutionId: string | undefined;
};

type FlowStateView<K extends BorrowState['kind']> = (
  state: Extract<BorrowState, { kind: K }>,
) => BorrowFlowState;

/** How each of the machine's states shows in the dialogs. */
const FLOW_STATES: { [K in BorrowState['kind']]: FlowStateView<K> } = {
  idle: () => ({ kind: 'idle' }),
  // Checking the lock before a run is the start of signing.
  checking: (state) =>
    state.then.kind === 'run' ? { kind: 'signing' } : { kind: 'previewing' },
  quoting: () => ({ kind: 'previewing' }),
  confirm: (state) => ({
    kind: 'confirm',
    preview: state.run.borrowed,
    figures: state.run.figures,
  }),
  cancelling: (state) => ({ kind: 'cancelling', reason: state.reason }),
  signing: () => ({ kind: 'signing' }),
  tracking: (state) =>
    state.warning
      ? {
          kind: 'error',
          error: 'delayed',
          cause: undefined,
          step: state.run.step,
        }
      : {
          kind: 'pending',
          step: state.run.step,
          executionId: state.run.executionId,
          waitingForDeposit: state.run.waitingForDeposit,
        },
  done: (state) => ({ kind: 'done', executionId: state.executionId }),
  error: (state) => ({
    kind: 'error',
    error: state.error,
    cause: state.cause,
    step: state.step,
  }),
};

/** An error's action while the collateral waits at the intermediary. */
const fundsWaitingAction = (
  error: BorrowErrorKind,
  hasForm: boolean,
): BorrowRecoveryAction => {
  if (error === 'walletDisconnected') {
    return 'reconnect';
  }

  return hasForm && error !== 'unknown' && error !== 'pairUnsupported'
    ? 'retry'
    : 'close';
};

/** The machine's state as the dialogs know it (`BorrowFlowState`). */
const flowStateOf = (state: BorrowState): BorrowFlowState =>
  (FLOW_STATES[state.kind] as FlowStateView<BorrowState['kind']>)(state);

export const viewOf = (state: BorrowState, env: FlowEnv): BorrowFlowView => {
  const flow = flowStateOf(state);
  const run = state.kind === 'idle' ? undefined : state.run;
  const fundsWaiting =
    flow.kind === 'error' && run !== undefined && isFundsWaiting(run, env);

  let action: BorrowRecoveryAction | undefined;

  if (fundsWaiting && flow.kind === 'error') {
    // Only the steps-only retry is offered, or a reconnect that leads back
    // to it: every other action would bridge the funds in again. Restored
    // without the form, unexplained (such as nothing waiting any more), or
    // on a pair the borrow action no longer covers (its steps can't be
    // built), it only closes.
    action = fundsWaitingAction(flow.error, run?.input !== undefined);
  } else if (flow.kind === 'error') {
    action = borrowRecoveryAction(flow.error);
  }

  return {
    state: flow,
    figures: run?.figures,
    action,
    fundsWaiting,
    fundsWaitingExecutionId: fundsWaiting
      ? (run?.fundsWaiting?.executionId ?? run?.executionId)
      : undefined,
  };
};
