import { Button, CheckIcon, CloseIcon, cx } from '../ui';

/**
 * Says a supply that ran in the background ended, while the modal is
 * closed: in a corner of the page, with a way back to it (`onView`).
 */
export const DoneNotice = ({
  success,
  dappName,
  destinationTitle,
  onView,
  onDismiss,
}: {
  success: boolean;
  dappName: string;
  destinationTitle: string;
  onView?: () => void;
  onDismiss: () => void;
}) => (
  <div
    role="status"
    aria-live="polite"
    className="fixed right-4 bottom-4 flex w-[340px] max-w-[calc(100vw-32px)] items-start gap-3 rounded-card bg-surface p-4 text-text-primary shadow-dialog">
    <span
      className={cx(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-medium',
        success ? 'bg-cta text-cta-text' : 'bg-danger-bg text-danger',
      )}>
      {success ? <CheckIcon size={16} /> : '!'}
    </span>
    <div className="min-w-0 flex-1">
      <p className="font-medium">
        {success ? `Supplied to ${destinationTitle}` : 'Your supply stopped'}
      </p>
      <p className="mt-0.5 text-text-secondary">
        {success
          ? `It shows up in Your supplies on ${dappName} within a minute.`
          : 'Open it to see what happened and what to do next.'}
      </p>
      {onView ? (
        <Button variant="secondary" className="mt-3" onClick={onView}>
          View
        </Button>
      ) : null}
    </div>
    <Button variant="ghost" aria-label="Dismiss" onClick={onDismiss}>
      <CloseIcon />
    </Button>
  </div>
);
