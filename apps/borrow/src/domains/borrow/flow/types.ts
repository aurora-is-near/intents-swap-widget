import type { Execution } from '@aurora-is-near/intents-connect';

import type { LendingMarketAdapter } from '@/domains/markets/types';

import type { GasPreCheckInput } from '../utils/borrowPreChecks';
import type { BorrowErrorKind } from '../utils/classifyBorrowError';
import type { BorrowPreview, PreviewBorrowInput } from '../utils/preview';
import type { BorrowPreviewFigures } from '../utils/previewFigures';
import type { BorrowStepsPreview } from '../utils/stepsRetry';

/*
 * The borrow flow's public types: what `useBorrowFlow` takes and what its
 * dialogs read. The machine's own state is `flow/state.ts`; `flow/view.ts`
 * maps it onto these.
 */

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

/** The page's callbacks, which `useBorrowFlow` calls as the borrow moves. */
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

/** A restored execution: what `restore()` reads of it. */
export type RestorableExecution = Pick<Execution, 'id' | 'status'>;

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
