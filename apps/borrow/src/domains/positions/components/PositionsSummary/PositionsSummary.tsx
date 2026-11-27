import { cn } from '@aurora-is-near/ui-kit';
import { useId } from 'react';

import { pricedTotal } from '../../model/reserves';
import { positionsTotals } from '../../model/totals';
import {
  formatHealth,
  formatUsdWhole,
  healthTone,
  pairLabel,
  STATUS_TAGS,
} from '../../utils/positionFormat';
import type { LoanPosition } from '../../types';

/*
 * The positions summary (Web-Positions-Multi.dc.html and
 * Web-Position-Two.dc.html lines 380–391, `posMulti`; values from script
 * lines 1616–1621). The Mob-* artboards share the markup: the cards wrap by
 * their 220px basis.
 */

/** "2 POSITIONS" (line 1618); one is "1 POSITION". */
const summaryTitle = (count: number) =>
  `${count} ${count === 1 ? 'POSITION' : 'POSITIONS'}`;

function SummaryCard({
  position,
  selected,
  onSelect,
}: {
  position: LoanPosition;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const tag = STATUS_TAGS[position.status];

  return (
    <button
      aria-pressed={selected}
      className={cn(
        // `.pcard` (line 150), its hover and focus ring (lines 151, 153); a
        // press shrinks it at once, as the kit's main button does.
        'box-border flex w-full min-w-0 cursor-pointer flex-col gap-1.5 rounded-18 bg-sf text-left font-sans leading-font text-ink transition-transform duration-160 ease-out focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid active:scale-97 motion-reduce:active:scale-100',
        // `.pcard.sel` (line 152): a 3px ink border, the padding taken in.
        selected
          ? 'border-3 border-solid border-ink px-[14.5px] py-[12.5px]'
          : 'border-1.5 border-solid border-bd px-4 py-3.5 hover:border-mid',
      )}
      type="button"
      onClick={() => onSelect(position.id)}>
      <span className="flex w-full items-center justify-between gap-2">
        <span className="text-16 font-extrabold">
          {pairLabel(position) || position.marketName}
        </span>
        <span
          className={cn(
            // `.stag` (line 154).
            'inline-flex items-center rounded-full px-2.5 py-0.75 text-12 font-bold whitespace-nowrap',
            tag.className,
          )}>
          {tag.label}
        </span>
      </span>
      <span className="text-13 text-mut">
        {position.manageable ? position.marketName : position.providerName} ·{' '}
        {position.chainLabel}
      </span>
      <span className="flex gap-4 text-14">
        <span>
          Debt{' '}
          <b>{formatUsdWhole(pricedTotal(position.debt, position.debtUsd))}</b>
        </span>
        <span>
          Health{' '}
          <b className={healthTone(position.health, 'text-mut')}>
            {formatHealth(position.health)}
          </b>
        </span>
      </span>
    </button>
  );
}

type PositionsSummaryProps = {
  positions: readonly LoanPosition[];
  /** The card drawn pressed; none on New loan. */
  selectedId?: string;
  onSelect: (id: string) => void;
  className?: string;
};

/**
 * The count, the total debt and collateral, and one card per loan, each a
 * toggle button (`aria-pressed`) that picks the loan shown.
 */
export function PositionsSummary({
  positions,
  selectedId,
  onSelect,
  className,
}: PositionsSummaryProps) {
  const titleId = useId();
  const totals = positionsTotals(positions);

  return (
    <section
      aria-labelledby={titleId}
      className={cn('leading-font', className)}>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2
          className="m-0 font-sans text-12 font-normal tracking-label text-mut2"
          id={titleId}>
          {summaryTitle(totals.count)}
        </h2>
        <p className="m-0 text-14 text-mut">
          Total debt{' '}
          <b className="text-ink">{formatUsdWhole(totals.debtUsd)}</b> ·
          collateral{' '}
          <b className="text-ink">{formatUsdWhole(totals.collateralUsd)}</b>
        </p>
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
        {positions.map((position) => (
          <li key={position.id} className="flex min-w-0 flex-[1_1_220px]">
            <SummaryCard
              position={position}
              selected={position.id === selectedId}
              onSelect={onSelect}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
