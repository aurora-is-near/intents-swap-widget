import { Banner, Button, Card, Skeleton } from '@aurora-is-near/ui-kit';
import { useId } from 'react';

import { PositionCard } from './PositionCard';
import { PositionsEmptyState } from './PositionsEmptyState';
import { type PositionsReadError, usePositions } from './usePositions';

/** "0x7a3f…9c21". */
const shortAddress = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;

/**
 * What a failed read leaves out, in words. Market ids are internal keys
 * (`aave-v3:base`, or a contract address), so market reads are not named.
 */
const describeRead = ({ read, owner }: PositionsReadError) =>
  ({
    intermediary: 'your Borrow account',
    markets: 'Borrow’s market list',
    'owner-positions': owner
      ? `the loans of ${shortAddress(owner)}`
      : 'your loans',
    'market-position': 'repaid loans',
    'market-risk': 'some risk figures',
  })[read];

/** Each failed read once, in the order they failed. */
const describeErrors = (errors: readonly PositionsReadError[]) =>
  [...new Set(errors.map(describeRead))].join(', ');

/**
 * While nothing has loaded: a card of placeholders in the position card's
 * shape. No artboard has a loading state; built from the kit's `Skeleton`.
 */
function PositionsLoading() {
  return (
    <Card
      aria-busy="true"
      aria-label="Loading your positions"
      className="max-w-[640px]"
      role="status">
      <div className="flex items-center justify-between gap-[12px]">
        <Skeleton height={14} width={96} />
        <Skeleton height={28} radius="full" width={140} />
      </div>
      <div className="mt-[16px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[12px]">
        <Skeleton height={100} radius={18} />
        <Skeleton height={100} radius={18} />
      </div>
      <Skeleton className="mt-[22px]" height={36} />
      <div className="mt-[20px] grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-[10px]">
        {['health', 'liquidation', 'price', 'apr', 'interest'].map((key) => (
          <Skeleton key={key} height={70} radius={14} />
        ))}
      </div>
    </Card>
  );
}

/**
 * Nothing could be read: the empty state's card (Web-Positions-Empty.dc.html
 * lines 393–398) with the error and Retry, announced at once. No artboard
 * has this state.
 */
function PositionsError({
  errors,
  onRetry,
}: {
  errors: readonly PositionsReadError[];
  onRetry: () => void;
}) {
  const titleId = useId();

  return (
    <Card
      aria-labelledby={titleId}
      className="max-w-[560px] px-[28px] py-[48px] text-center"
      role="alert">
      <h2
        className="m-0 text-[26px] leading-[normal] font-extrabold tracking-[-0.02em]"
        id={titleId}>
        Couldn’t load your positions
      </h2>
      <p className="mt-[8px] mb-[22px] text-[16px] leading-[normal] text-mut">
        We could not read {describeErrors(errors)}. Check your connection and
        try again.
      </p>
      <Button onClick={onRetry} size="md">
        Retry
      </Button>
    </Card>
  );
}

/**
 * Some reads failed, or a refetch did, while positions are shown: they stay,
 * under the kit's warning banner naming what is missing, with Retry.
 */
function PositionsNotice({
  errors,
  onRetry,
}: {
  errors: readonly PositionsReadError[];
  onRetry: () => void;
}) {
  return (
    <Banner title="Some positions may be missing or out of date" tone="warning">
      We could not read {describeErrors(errors)}.
      <div className="mt-[12px]">
        <Button onClick={onRetry} variant="secondary">
          Retry
        </Button>
      </div>
    </Banner>
  );
}

/**
 * The My positions tab:
 * - no accounts to read, or nothing found: the empty state, which asks to
 *   connect while disconnected and points to New loan once connected;
 * - on the first read: placeholders;
 * - nothing loaded and a read failed: an error card with Retry;
 * - otherwise one card per loan, with a notice and Retry above them while a
 *   read fails (what loaded, or loaded before, stays).
 */
export function PositionsPage() {
  const { positions, isLoading, errors, refetch } = usePositions();

  if (positions.length === 0) {
    if (isLoading) {
      return <PositionsLoading />;
    }

    if (errors.length > 0) {
      return <PositionsError errors={errors} onRetry={refetch} />;
    }

    return <PositionsEmptyState />;
  }

  return (
    <div className="flex flex-col gap-[24px]">
      {errors.length > 0 ? (
        <PositionsNotice errors={errors} onRetry={refetch} />
      ) : null}
      {positions.map((position) => (
        <div
          key={position.id}
          className="flex flex-wrap items-start gap-[24px]">
          <PositionCard position={position} />
        </div>
      ))}
    </div>
  );
}
