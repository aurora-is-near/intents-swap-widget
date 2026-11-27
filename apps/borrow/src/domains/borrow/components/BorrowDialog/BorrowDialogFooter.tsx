import { Button } from '@aurora-is-near/ui-kit';
import type { ReactNode } from 'react';

import { assertNever } from '@/utils/assertNever';

import { borrowRecoveryAction } from '../../utils/borrowRecoveryAction';
import { ACTION_LABEL, getErrorCopy } from './utils/getErrorCopy';
import type { BorrowRecoveryAction } from '../../utils/borrowRecoveryAction';
import type { BorrowErrorKind } from '../../utils/classifyBorrowError';
import type {
  BorrowPendingNote,
  ProgressStep,
} from './utils/getBorrowDialogStep';

/** What the dialog's buttons call. */
export type BorrowDialogHandlers = {
  /** "Confirm in wallet". */
  onConfirm: () => void;
  /** Cancel, the close button, Escape or an outside press (confirm, done). */
  onCancel: () => void;
  /** "View position" on the done dialog; "Go to my positions" on a warning. */
  onViewPosition: () => void;
  /** The error dialog's button: the step's `action` (`retry`, …). */
  onAction: (action: BorrowRecoveryAction) => void;
};

/**
 * Line 1020's note, per pending stage: what the borrow waits for and what,
 * if anything, the user has to do.
 */
const pendingNote = (
  note: BorrowPendingNote,
  borrowSymbol: string | undefined,
): string => {
  switch (note) {
    case 'sign':
      return 'Sign the request in your wallet. Nothing is sent until you also confirm the deposit.';
    case 'deposit':
      return 'Request signed. Now confirm the deposit transaction in your wallet. Don’t close this window.';
    case 'awaitingDeposit':
      return 'Waiting for your deposit to arrive. If you already sent it, it’s picked up here; if you didn’t, the request expires on its own.';
    case 'bridging':
      return 'Your deposit left your wallet. The collateral is bridging, which usually takes about a minute. Nothing to do but wait.';
    case 'opening':
      return `Opening the loan and sending ${borrowSymbol ?? 'the funds'} to your wallet. Nothing to do but wait.`;
    default:
      return assertNever(note, 'pending note');
  }
};

/**
 * Lines 1013–1014: `.go` 20px above, then `.linkb` Cancel centred 12px
 * below.
 */
function ConfirmActions({
  onConfirm,
  onCancel,
}: Pick<BorrowDialogHandlers, 'onConfirm' | 'onCancel'>) {
  return (
    <>
      <Button className="mt-5" onClick={onConfirm}>
        Confirm in wallet
      </Button>
      <div className="mt-3 text-center">
        <Button variant="link" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </>
  );
}

/**
 * Lines 1016–1019: `.go` 20px above, then the secondary link 12px below it:
 * "Cancel", or "Go to my positions" on a warning (line 1513).
 */
function ErrorActions({
  error,
  fundsWaiting,
  action,
  onAction,
  onCancel,
  onViewPosition,
}: {
  error: BorrowErrorKind;
  fundsWaiting: boolean;
  action: BorrowRecoveryAction;
} & Pick<BorrowDialogHandlers, 'onAction' | 'onCancel' | 'onViewPosition'>) {
  const copy = getErrorCopy(error);
  const warn = copy.tone === 'warn';

  return (
    <>
      <Button className="mt-5" onClick={() => onAction(action)}>
        {action === borrowRecoveryAction(error) && !fundsWaiting
          ? copy.button
          : ACTION_LABEL[action]}
      </Button>
      <div className="mt-3 text-center">
        <Button variant="link" onClick={warn ? onViewPosition : onCancel}>
          {/* Line 1513. */}
          {warn ? 'Go to my positions' : 'Cancel'}
        </Button>
      </div>
    </>
  );
}

/**
 * Line 1020: 14px `mut2`, centred, 20px above; Close below it when the wait
 * is closable.
 */
function WaitNote({
  children,
  closable,
  onClose,
}: {
  children: ReactNode;
  closable: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <p
        className="m-0 mt-5 text-center text-14 leading-font text-mut2"
        role="status">
        {children}
      </p>
      {closable ? (
        <Button className="mt-5" onClick={onClose}>
          Close
        </Button>
      ) : null}
    </>
  );
}

/** The buttons, or the note, under the steps. */
export function BorrowDialogFooter({
  step,
  borrowSymbol,
  closableWait,
  onConfirm,
  onCancel,
  onViewPosition,
  onAction,
}: {
  step: ProgressStep;
  borrowSymbol: string | undefined;
  closableWait: boolean;
} & BorrowDialogHandlers) {
  switch (step.kind) {
    case 'confirm':
      return <ConfirmActions onCancel={onCancel} onConfirm={onConfirm} />;
    case 'error':
      return (
        <ErrorActions
          action={step.action}
          error={step.error}
          fundsWaiting={step.fundsWaiting}
          onAction={onAction}
          onCancel={onCancel}
          onViewPosition={onViewPosition}
        />
      );
    case 'pending':
      return (
        <WaitNote closable={closableWait} onClose={onCancel}>
          {pendingNote(step.note, borrowSymbol)}
        </WaitNote>
      );
    case 'cancelling':
      return (
        <WaitNote closable={closableWait} onClose={onCancel}>
          Confirm the cancellation in your wallet.
        </WaitNote>
      );
    default:
      return assertNever(step, 'dialog step');
  }
}
