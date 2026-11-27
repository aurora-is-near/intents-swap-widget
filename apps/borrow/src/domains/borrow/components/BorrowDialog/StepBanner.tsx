import { Banner } from '@aurora-is-near/ui-kit';

import { getErrorCopy } from './utils/getErrorCopy';
import type { BorrowCancelReason } from '../../flow/types';
import type { BorrowErrorKind } from '../../utils/classifyBorrowError';
import type { ProgressStep } from './utils/getBorrowDialogStep';
import type { Summary } from './utils/getSummary';

/*
 * The wallet prompt to cancel an open execution (`useBorrowFlow`'s
 * `cancelling`). No artboard draws it: the warning banner of the error
 * dialogs (lines 984–995), with this copy.
 */
const CANCEL_COPY: Record<BorrowCancelReason, { title: string; text: string }> =
  {
    declined: {
      title: 'Cancel the unsigned request',
      text: 'You didn’t approve the request, but it was already created and blocks new borrows from this wallet until it’s cancelled. Confirm the cancellation in your wallet. Nothing was sent.',
    },
    previous: {
      title: 'Cancel your earlier request first',
      text: 'An earlier borrow request from this wallet was never completed and blocks this one. Confirm its cancellation in your wallet, then sign the new request. Nothing was sent for it.',
    },
  };

/** Lines 984–995: the error or warning block, 16px above the rows. */
function ErrorBanner({
  error,
  fundsWaiting,
  errorContext,
  detail,
}: {
  error: BorrowErrorKind;
  fundsWaiting: boolean;
  errorContext: Summary['errorContext'];
  /** The API's own reason, shown instead of the kind's text. */
  detail?: string;
}) {
  const copy = getErrorCopy(error);
  const context = { ...errorContext, fundsWaiting };

  return (
    <Banner
      className="mt-4"
      title={copy.title(context)}
      tone={copy.tone === 'warn' ? 'warning' : 'danger'}>
      {detail ?? copy.text(context)}
    </Banner>
  );
}

/**
 * The banner above the rows: the error or warning, why a cancellation is
 * asked for, or that the borrow is an earlier one.
 */
export function StepBanner({
  step,
  errorContext,
  earlierPending,
}: {
  step: ProgressStep;
  errorContext: Summary['errorContext'];
  earlierPending: boolean;
}) {
  if (step.kind === 'error') {
    return (
      <ErrorBanner
        detail={step.detail}
        error={step.error}
        errorContext={errorContext}
        fundsWaiting={step.fundsWaiting}
      />
    );
  }

  if (step.kind === 'cancelling') {
    return (
      <Banner
        className="mt-4"
        title={CANCEL_COPY[step.reason].title}
        tone="warning">
        {CANCEL_COPY[step.reason].text}
      </Banner>
    );
  }

  if (earlierPending) {
    // A borrow the user did not just confirm (`Summary.earlier`), still on
    // its way. No artboard draws it: the warning banner of the error dialogs.
    return (
      <Banner
        className="mt-4"
        title="Your previous borrow is still in progress"
        tone="warning">
        This is the borrow you started earlier, not a new one. You can start a
        new borrow once it finishes.
      </Banner>
    );
  }

  return null;
}
