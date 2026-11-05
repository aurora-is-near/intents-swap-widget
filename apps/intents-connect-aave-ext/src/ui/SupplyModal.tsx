import { useEffect, useRef } from 'react';

import { Button, Notice, truncateMiddle } from './ui';

export type SupplyDestination = {
  /** Where the supply lands, e.g. "Aave Core V3 · Ethereum". */
  title: string;
  /** False: the dApp is on a market Intents Connect can't supply to. */
  supported: boolean;
  /** Shown when unsupported: what the user can do instead. */
  hint?: string;
};

type SupplyModalProps = {
  open: boolean;
  onClose: () => void;
  /** The account the supply is made for: the one connected on the dApp. */
  positionOwner: string | null;
  destination: SupplyDestination;
};

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M6 6l12 12M18 6 6 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const Body = ({
  positionOwner,
  destination,
}: Pick<SupplyModalProps, 'positionOwner' | 'destination'>) => {
  if (!positionOwner) {
    return (
      <Notice tone="warning">
        <p className="font-medium">Connect your wallet on Aave first</p>
        <p className="mt-1 text-text-secondary">
          Aurora supplies to the account Aave is connected with, so it shows up
          in Your supplies.
        </p>
      </Notice>
    );
  }

  if (!destination.supported) {
    return (
      <Notice tone="warning">
        <p className="font-medium">This market isn&apos;t supported yet</p>
        {destination.hint ? (
          <p className="mt-1 text-text-secondary">{destination.hint}</p>
        ) : null}
      </Notice>
    );
  }

  return (
    <Notice tone="info">
      <p className="font-medium">Pay from any wallet, on any chain</p>
      <p className="mt-1 text-text-secondary">Choosing a wallet comes next.</p>
    </Notice>
  );
};

/**
 * "Supply with Aurora": pay from any wallet, on any chain, into the
 * position of the account connected on the dApp. Everything page- and
 * protocol-specific comes in through props.
 */
export const SupplyModal = ({
  open,
  onClose,
  positionOwner,
  destination,
}: SupplyModalProps) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const latestClose = useRef(onClose);

  latestClose.current = onClose;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        latestClose.current();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/32 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aurora-supply-title"
        className="w-full max-w-[420px] rounded-xl bg-surface p-6 text-text-primary shadow-dialog">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="aurora-supply-title"
              className="text-base font-medium leading-6">
              Supply with Aurora
            </h2>
            <p className="mt-0.5 truncate text-text-secondary">
              {positionOwner
                ? `To ${truncateMiddle(positionOwner)} on ${destination.title}`
                : destination.title}
            </p>
          </div>
          <Button
            ref={closeRef}
            variant="ghost"
            aria-label="Close"
            className="-mr-1"
            onClick={onClose}>
            <CloseIcon />
          </Button>
        </div>

        <Body positionOwner={positionOwner} destination={destination} />
      </div>
    </div>
  );
};
