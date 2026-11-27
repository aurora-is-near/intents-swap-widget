import { Banner, Button, Card, Skeleton } from '@aurora-is-near/ui-kit';

import { selectPosition } from '../../model/selection';
import { PositionCard } from '../PositionCard/PositionCard';
import { PositionsEmptyState } from '../PositionsEmptyState/PositionsEmptyState';
import { PositionsMessageCard } from '../PositionsMessageCard/PositionsMessageCard';
import { PositionsSummary } from '../PositionsSummary/PositionsSummary';
import type { Positions } from '../../hooks/usePositions';

/**
 * Where Repay and Add collateral will go (Web-Position.dc.html line 436:
 * flex 1 1 400px, max-width 520), empty until those features ship and as
 * tall as the loan's card. Hidden once the row is too narrow for both
 * columns (480 + 24 + 400px), where it would wrap into an empty strip.
 */
function RepayPlaceholder() {
  return (
    <Card
      aria-hidden="true"
      className="max-w-130 min-w-0 flex-[1_1_400px] self-stretch @max-[904px]:hidden"
    />
  );
}

/**
 * While nothing has loaded: a card of placeholders in the position card's
 * shape, beside the Repay placeholder, so the layout does not jump when the
 * loan arrives. No artboard has a loading state; built from the kit's
 * `Skeleton`. Screen readers hear "Loading your positions" from the status
 * line instead.
 */
function PositionsLoading() {
  return (
    <div
      aria-busy="true"
      aria-hidden="true"
      className="@container flex flex-wrap items-start gap-6">
      <Card className="min-w-0 flex-[1.2_1_480px]">
        <div className="flex items-center justify-between gap-3">
          <Skeleton height={14} width={96} />
          <Skeleton height={28} radius={14} width={140} />
        </div>
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          <Skeleton height={100} radius={18} />
          <Skeleton height={100} radius={18} />
        </div>
        <Skeleton className="mt-5.5" height={36} />
        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
          {['health', 'liquidation', 'price', 'apr', 'interest'].map((key) => (
            <Skeleton key={key} height={70} radius={14} />
          ))}
        </div>
      </Card>
      <RepayPlaceholder />
    </div>
  );
}

/**
 * What the status line says: loading, then the result, which only changes
 * when the number of loans does, so a refresh is not read out every minute.
 * Nothing without a wallet or on an error (the error card is an alert).
 */
const statusText = (
  status: Positions['status'],
  count: number,
  partial: boolean,
) => {
  if (status === 'pending') {
    return count > 0 ? '' : 'Loading your positions';
  }

  if (status !== 'success' || (count === 0 && partial)) {
    return '';
  }

  if (count === 0) {
    return 'No positions right now';
  }

  return count === 1 ? '1 position' : `${count} positions`;
};

type PositionsViewProps = Pick<
  Positions,
  'status' | 'positions' | 'partial' | 'refetch'
> & {
  /** The `position` search param; the default loan when unset. */
  selectedId?: string;
  onSelect: (id: string) => void;
};

function PositionsContent({
  status,
  positions,
  partial,
  refetch,
  selectedId,
  onSelect,
}: PositionsViewProps) {
  const selected = selectPosition(positions, selectedId);

  if (!selected) {
    if (status === 'pending') {
      return <PositionsLoading />;
    }

    // Nothing to show and some reads failed: there may be loans not read,
    // so it is not shown as empty.
    if (status === 'error' || partial) {
      // Nothing could be read: the empty state's card with Retry, announced
      // at once. No artboard has this state.
      return (
        <PositionsMessageCard
          action="Retry"
          role="alert"
          text="Your loans could not be read just now. Check your connection and try again."
          title="Couldn’t load your positions"
          onAction={refetch}
        />
      );
    }

    return <PositionsEmptyState />;
  }

  return (
    <div className="flex flex-col gap-6">
      {partial ? (
        <Banner
          title="Some positions may be missing or out of date"
          tone="warning">
          Some of your loans could not be read just now.
          <div className="mt-3">
            <Button variant="secondary" onClick={refetch}>
              Retry
            </Button>
          </div>
        </Banner>
      ) : null}
      <div>
        {positions.length > 1 ? (
          <PositionsSummary
            className="mb-4.5"
            positions={positions}
            selectedId={selected.id}
            onSelect={onSelect}
          />
        ) : null}
        <div className="@container flex flex-wrap items-start gap-6">
          <PositionCard key={selected.id} position={selected} />
          {/* A read-only loan will never get Borrow's actions. */}
          {selected.manageable ? <RepayPlaceholder /> : null}
        </div>
      </div>
    </div>
  );
}

/**
 * The My positions tab's content, from what was read:
 * - no wallet, or nothing found: the empty state, which asks to connect
 *   while disconnected and points to New loan once connected;
 * - on the first read: placeholders;
 * - nothing loaded and the reads failed: an error card with Retry;
 * - otherwise the selected loan's card, under the summary when there are two
 *   or more (Web-Position-Two.dc.html lines 380–391, 18px above the card),
 *   with a warning and Retry above while some reads fail (what loaded
 *   stays).
 */
export function PositionsView(props: PositionsViewProps) {
  const { status, positions, partial } = props;

  return (
    <>
      {/* Mounted in every state, so its text change is announced: a live
          region inserted with its text can be missed. */}
      <p className="sr-only" role="status">
        {statusText(status, positions.length, partial)}
      </p>
      <PositionsContent {...props} />
    </>
  );
}
