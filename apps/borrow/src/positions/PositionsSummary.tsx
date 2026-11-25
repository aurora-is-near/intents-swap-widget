import { Tag } from '@aurora-is-near/ui-kit';
import { useId } from 'react';

import {
  DASH,
  formatHealth,
  formatUsdWhole,
  healthTone,
  pairLabel,
  statusTag,
} from './positionFormat';
import type { LoanPosition } from './types';
import { positionsTotals } from './usePositions';

/*
 * The positions summary (Web-Positions-Multi.dc.html and
 * Web-Position-Two.dc.html lines 380–391, `posMulti`; values from script
 * lines 1616–1621). The Mob-* artboards share the markup and their 640px
 * block does not touch it: the cards wrap by their 220px basis.
 */

/** `.pcard` (line 150) and `.pcard.sel` (line 152), focus ring line 153. */
const CARD =
  'flex w-full min-w-0 cursor-pointer flex-col gap-[6px] rounded-[18px] bg-sf text-left font-[inherit] text-[inherit] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid';

const CARD_IDLE =
  'border-[1.5px] border-solid border-bd px-[16px] py-[14px] hover:border-mid';

const CARD_SELECTED =
  'border-[3px] border-solid border-ink px-[14.5px] py-[12.5px]';

/** "2 POSITIONS" (line 1618); one is "1 POSITION". */
const summaryTitle = (count: number) =>
  `${count} ${count === 1 ? 'POSITION' : 'POSITIONS'}`;

/** The health figure: `mut` without one, else the card's zone colour. */
const summaryHealthTone = (health: number | null) =>
  health === null ? 'text-mut' : healthTone(health);

function SummaryCard({
  position,
  selected,
  onSelect,
}: {
  position: LoanPosition;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const tag = statusTag(position.status);

  return (
    <button
      aria-pressed={selected}
      className={`${CARD} ${selected ? CARD_SELECTED : CARD_IDLE}`}
      type="button"
      onClick={() => onSelect(position.id)}>
      <span className="flex w-full items-center justify-between gap-[8px]">
        <span className="text-[16px] font-extrabold">
          {pairLabel(position) || position.marketName}
        </span>
        <Tag tone={tag.tone}>{tag.label}</Tag>
      </span>
      <span className="text-[13px] text-mut">
        {position.marketName} · {position.chainLabel}
      </span>
      <span className="flex gap-[16px] text-[14px]">
        <span>
          Debt <b>{formatUsdWhole(position.debtUsd)}</b>
        </span>
        <span>
          Health{' '}
          <b className={summaryHealthTone(position.health)}>
            {position.health === null ? DASH : formatHealth(position.health)}
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
 * The count, the total debt and collateral, and one card per position,
 * each a toggle button (`aria-pressed`) that picks the position shown.
 */
export function PositionsSummary({
  positions,
  selectedId,
  onSelect,
  className = '',
}: PositionsSummaryProps) {
  const titleId = useId();
  const totals = positionsTotals(positions);

  return (
    <section
      aria-labelledby={titleId}
      className={`leading-[normal] ${className}`}>
      <div className="mb-[10px] flex flex-wrap items-baseline justify-between gap-x-[16px] gap-y-[8px]">
        <h2
          className="m-0 font-sans text-[12px] font-normal tracking-[0.14em] text-mut2"
          id={titleId}>
          {summaryTitle(positions.length)}
        </h2>
        <p className="m-0 text-[14px] text-mut">
          Total debt{' '}
          <b className="text-ink">{formatUsdWhole(totals.debtUsd)}</b> ·
          collateral{' '}
          <b className="text-ink">{formatUsdWhole(totals.collateralUsd)}</b>
        </p>
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-[10px] p-0">
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
