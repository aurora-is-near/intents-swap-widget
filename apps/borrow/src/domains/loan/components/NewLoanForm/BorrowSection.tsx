import { TokenSelect } from '@aurora-is-near/ui-kit';
import { useId, useRef, useState } from 'react';

import { BORROW_FEE_BPS } from '@/config';
import { formatApr } from '@/domains/markets/utils/format';

import { chainOf } from '../../utils/chains';
import { formatAmount, toDisplayNumber } from '../../utils/loanFormat';
import {
  ALL_FILTERS,
  groupOf,
  markOf,
  passes,
  reserveOption,
  unique,
} from './tokenOptions';
import {
  PICK_ROW,
  PICK_WIDTH,
  SectionLabel,
  TokenFilters,
  triggerLabel,
} from './TokenPicker';
import type { LoanForm } from '../../model/loanForm';
import type { ReserveAsset } from '../../model/reserveAssets';

/** The fee to two decimals (line 1573), more below one unit. */
const formatFee = (value: number) =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: value === 0 || value >= 1 ? 2 : 6,
  });

/**
 * The Borrow card (lines 256–293) and the fee row (line 295). The fee is
 * taken from the bridged collateral, as the dry run reports it, so the row
 * shows it in the collateral and "You receive" is the whole borrow amount
 * (decided in the Borrow execution plan review).
 */
export function BorrowSection({ form }: { form: LoanForm }) {
  const anchor = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState(ALL_FILTERS);
  const labelId = useId();
  const triggerId = useId();
  const receiveId = useId();
  const { borrow, collateral, figures } = form;
  // The selection, or the figures' stand-in when the LTV fits no market.
  const market = form.figuresMarket;

  const chainsOf = (asset: ReserveAsset) =>
    asset.markets.map(({ chain }) => chain);

  const options = form.borrowAssets
    .filter((asset) => passes(filter, asset.symbol, chainsOf(asset)))
    .map(reserveOption);

  const chains = unique(form.borrowAssets.flatMap(chainsOf));
  // Group chips only when the reserves span more than one group (line 1163).
  const groups =
    unique(form.borrowAssets.flatMap(({ symbol }) => groupOf(symbol) ?? []))
      .length > 1;

  const triggerChain = market ? chainOf(market.chain) : undefined;

  const received = figures
    ? toDisplayNumber(figures.borrowAmount, borrow.decimals)
    : 0;

  const fee = figures ? toDisplayNumber(figures.fee, collateral.decimals) : 0;

  return (
    <>
      <SectionLabel id={labelId}>BORROW</SectionLabel>
      <div ref={anchor} className={PICK_ROW}>
        <TokenSelect
          anchor={anchor}
          aria-label="Choose token to borrow"
          aria-labelledby={triggerLabel(labelId, triggerId)}
          className={PICK_WIDTH}
          filters={
            <TokenFilters
              chains={chains}
              groups={groups}
              value={filter}
              onChange={setFilter}
            />
          }
          id={triggerId}
          options={options}
          selected={{
            symbol: borrow.symbol,
            mark: markOf(borrow.symbol),
            chainName: triggerChain?.name ?? '',
            chainColor: triggerChain?.color,
          }}
          value={borrow.symbol}
          onValueChange={form.setBorrowSymbol}
        />
        {/* Read-only (decided): the amount and LTV drive it. Line 264:
            1.5px `bd`, radius 14, padding 8px 16px, `sf`; the amount
            30px / 800 / -0.02em / 1.15 on one line, the caption 12px `mut2`. */}
        <div className="box-border flex min-w-0 flex-1 flex-col justify-center rounded-14 border-1.5 border-solid border-bd bg-sf px-4 py-2">
          <output
            aria-labelledby={receiveId}
            className="block truncate text-30 font-extrabold leading-1.15 tracking-title">
            {formatAmount(received)}
          </output>
          <span className="text-12 text-mut2" id={receiveId}>
            You receive · after fee
          </span>
        </div>
      </div>
      {/* The fee row (line 295): BORROW_FEE_BPS of the collateral, an
          estimate. The real fee is the API key's Intents Connect fee, which
          the confirm dialog shows as the dry run reports it. */}
      <div className="mt-3 flex justify-between text-14 text-mut">
        <span>Borrow fee · {formatApr(BORROW_FEE_BPS / 10_000)}</span>
        <span className="font-semibold">
          −{formatFee(fee)} {collateral.symbol}
        </span>
      </div>
    </>
  );
}
