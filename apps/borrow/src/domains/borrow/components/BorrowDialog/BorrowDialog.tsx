import { Dialog, DialogContent } from '@aurora-is-near/ui-kit';

import { BorrowDialogFooter } from './BorrowDialogFooter';
import { DoneContent } from './DoneContent';
import {
  canShow,
  closesOf,
  isWarning,
  useShownContent,
  waitOf,
} from './hooks/useShownContent';
import { ProgressContent } from './ProgressContent';
import type { BorrowPreviewFigures } from '../../utils/previewFigures';
import type { BorrowDialogHandlers } from './BorrowDialogFooter';
import type { BorrowDialogStep } from './utils/getBorrowDialogStep';
import type {
  BorrowDialogLoan,
  RestoredBorrowSummary,
} from './utils/getSummary';

/*
 * The borrow modal (Web-Borrow-Confirm.dc.html lines 965–1025; the borrow
 * entry of the modal config, lines 1448–1454). One kit `Dialog` through
 * confirm, pending and done; the mobile artboards (Mob-Borrow-*.dc.html)
 * have the same markup, and the kit's dialog turns into a bottom sheet at
 * 640px. The artboards' Morpho / wstETH / Ethereum figures are sample data:
 * the rows here are the dry run's.
 *
 * Its parts, in this folder:
 * - `ProgressContent.tsx` (with `StepBanner.tsx`) and
 *   `BorrowDialogFooter.tsx`: confirm, pending, cancelling and error;
 * - `DoneContent.tsx`: done.
 * In `hooks/`:
 * - `useShownContent.ts`: what stays shown while it closes, and how it closes.
 * In `utils/`:
 * - `getBorrowDialogStep.ts`: which dialog a flow state shows;
 * - `getSummary.ts`: the rows and the words, from the loan or a restored borrow;
 * - `getProgressSteps.ts`: the three steps and their statuses;
 * - `getErrorCopy.ts`: the error dialogs' copy.
 */

type BorrowDialogProps = {
  /** Which dialog to show; `undefined` closes it. */
  step: BorrowDialogStep | undefined;
  loan: BorrowDialogLoan | undefined;
  /** The confirmed dry run's figures; kept through pending and done. */
  figures: BorrowPreviewFigures | undefined;
  /**
   * A borrow restored after a reload, shown when there is no `loan`: its
   * kept (or generic) rows instead of the figures.
   */
  restored?: RestoredBorrowSummary;
} & BorrowDialogHandlers;

/**
 * The confirm, pending and done dialogs of a borrow:
 * - Confirm: the dry run's rows, the three steps waiting, "Confirm in
 *   wallet" and Cancel; it closes like any dialog.
 * - Pending: the rows and the steps as the runner moves them, and a note
 *   saying what the borrow waits for and what the user has to do. It
 *   cannot be closed (line 1625), except while it only waits for a deposit
 *   sent before a reload, or follows a borrow the user did not just confirm
 *   (restored, or the previous one), which a banner names: then nothing is
 *   asked of the user.
 * - Cancelling: why a wallet prompt to cancel an open request is up, the
 *   steps, and the note to confirm it. It cannot be closed either.
 * - Done: "Loan opened" and "View position". No close button (the artboard
 *   draws none), but Escape and an outside press close it (line 1625).
 */
export function BorrowDialog({
  step,
  loan,
  figures,
  restored,
  onConfirm,
  onCancel,
  onViewPosition,
  onAction,
}: BorrowDialogProps) {
  const shown = step ? { step, loan, figures, restored } : undefined;
  const open = shown !== undefined && canShow(shown);
  const content = useShownContent(open ? shown : undefined);

  const { earlierPending, closableWait } = waitOf(content);
  const closes = closesOf(content);

  return (
    <Dialog
      closeButton={closes.closeButton || closableWait}
      dismissible={closableWait || closes.dismissible}
      open={open}
      onOpenChange={(next) => {
        if (next) {
          return;
        }

        if (isWarning(content?.step)) {
          onAction('close');
        } else {
          onCancel();
        }
      }}>
      {content ? (
        <DialogContent>
          {content.step.kind === 'done' ? (
            <DoneContent
              doneText={content.summary.doneText}
              onViewPosition={onViewPosition}
            />
          ) : (
            <ProgressContent
              earlierPending={earlierPending}
              footer={
                <BorrowDialogFooter
                  borrowSymbol={content.summary.borrowSymbol}
                  closableWait={closableWait}
                  step={content.step}
                  onAction={onAction}
                  onCancel={onCancel}
                  onConfirm={onConfirm}
                  onViewPosition={onViewPosition}
                />
              }
              step={content.step}
              summary={content.summary}
            />
          )}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
