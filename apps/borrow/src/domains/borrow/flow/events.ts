import type { Execution, RunnerEvent } from '@aurora-is-near/intents-connect';

import type { ExecutionProgress } from '../stores/executionProgress';
import type { BorrowStepFailure } from '../utils/classifyBorrowError';
import type { BorrowPreview } from '../utils/preview';
import type { BorrowPreviewFigures } from '../utils/previewFigures';
import type { BorrowStepsPreview } from '../utils/stepsRetry';
import type { DriveHow } from './state';
import type { BorrowFlowInput, RestorableExecution } from './types';

/**
 * What moves the machine. User events come from the hook's methods; the
 * rest are the results of effects (`BorrowEffect`, below), tagged with the
 * `attempt` that started them.
 */
export type BorrowEvent =
  // The user.
  | { type: 'START'; input: BorrowFlowInput }
  | { type: 'CONFIRM' }
  | { type: 'RETRY' }
  | { type: 'REFRESH' }
  | { type: 'CLOSE' }
  | { type: 'LEAVE' }
  | { type: 'RECONNECT' }
  /** A borrow on its way, found after a reload (`useRestoreBorrow`). */
  | {
      type: 'RESTORE';
      execution: RestorableExecution;
      known: ExecutionProgress | undefined;
    }
  // The wallet.
  | { type: 'WALLET_BACK' }
  | { type: 'RECONNECT_FAILED' }
  // The wallet's open executions (`listOpen`).
  | {
      type: 'OPEN_LISTED';
      attempt: number;
      open: Execution | undefined;
      known: ExecutionProgress | undefined;
    }
  // The dry runs (`quote`, `quoteSteps`).
  | {
      type: 'QUOTED';
      attempt: number;
      preview: BorrowPreview | BorrowStepsPreview;
      figures: BorrowPreviewFigures;
    }
  | { type: 'QUOTE_FAILED'; attempt: number; error: unknown }
  // The runner (`drive`, `follow`). Its own `error` event is ignored: the
  // rejected promise (`RUN_FAILED`) is the one source of a failure.
  | { type: 'RUNNER'; attempt: number | undefined; event: RunnerEvent }
  | { type: 'RUN_DONE'; attempt: number; id: string }
  | { type: 'RUN_FAILED'; attempt: number; error: unknown }
  // The cancellation (`cancel`).
  | { type: 'CANCELLED'; attempt: number; executionId: string }
  | {
      type: 'CANCEL_FAILED';
      attempt: number;
      executionId: string;
      error: unknown;
    }
  // The failed borrow step, read afresh (`diagnose`).
  | {
      type: 'DIAGNOSED';
      attempt: number;
      cause: unknown;
      borrowStep: BorrowStepFailure;
    }
  // The "taking longer" timer (`armDelay`).
  | { type: 'DELAY_ELAPSED'; attempt: number };

/**
 * What the transition reads from outside, at the moment of the event: the
 * connected wallet and the runner's own view of its execution (which
 * survives events the hook did not see, such as a signature submitted
 * before a wallet switch).
 */
export type FlowEnv = {
  wallet: string | undefined;
  /** The runner submitted the signature (`hasSubmittedSignature`). */
  runnerSigned: boolean;
  runnerExecutionId: string | undefined;
  /** The runner's execution's intermediary, where waiting collateral sits. */
  runnerIntermediary: string | undefined;
  /** `onPrevious` is given: a previous borrow on its way is shown, not refused as `busy`. */
  hasOnPrevious: boolean;
};

/** What the machine asks the hook to do: data only, run by `useBorrowFlow`. */
export type BorrowEffect =
  /** List the wallet's open executions → `OPEN_LISTED`. */
  | { type: 'listOpen'; attempt: number }
  /** Gas pre-check, the two dry runs, the liquidity pre-check → `QUOTED` / `QUOTE_FAILED`. */
  | { type: 'quote'; attempt: number; input: BorrowFlowInput }
  /** The steps-only dry runs over the waiting collateral → `QUOTED` / `QUOTE_FAILED`. */
  | {
      type: 'quoteSteps';
      attempt: number;
      input: BorrowFlowInput;
      intermediary: string;
    }
  /** Drive the runner; its events → `RUNNER`, its result → `RUN_DONE` / `RUN_FAILED`. */
  | { type: 'drive'; attempt: number; how: DriveHow }
  /**
   * Follow an execution this run did not start: attach to the runner when
   * it still drives it, else resume it. Not awaited by the user's call.
   */
  | { type: 'follow'; attempt: number; executionId: string }
  /** Delete an execution with the wallet's signature → `CANCELLED` / `CANCEL_FAILED`. */
  | { type: 'cancel'; attempt: number; executionId: string }
  /** Read the market afresh to explain a failed borrow step → `DIAGNOSED`. */
  | {
      type: 'diagnose';
      attempt: number;
      cause: unknown;
      input: BorrowFlowInput;
      borrowed: BorrowPreview | BorrowStepsPreview;
    }
  | { type: 'armDelay'; attempt: number }
  | { type: 'clearDelay' }
  /** Open the wallet's connect modal; a failure → `RECONNECT_FAILED`. */
  | { type: 'connect' }
  | {
      type: 'progress';
      op: 'created' | 'depositSent' | 'forget';
      wallet: string | undefined;
      executionId: string;
    }
  | { type: 'notifyCreated'; executionId: string }
  | { type: 'notifyPrevious'; execution: Execution }
  | { type: 'notifySettled'; executionId: string };
