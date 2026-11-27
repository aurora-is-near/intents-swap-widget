import {
  AmountInput,
  Banner,
  Button,
  Skeleton,
  TokenSelect,
} from '@aurora-is-near/ui-kit';
import { useId, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { sameSymbol } from '../../model/reserveAssets';
import { chainOf } from '../../utils/chains';
import { formatUsd } from '../../utils/loanFormat';
import {
  ALL_FILTERS,
  fundingOption,
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
import type { FilterValue } from './tokenOptions';

/** The Supply picker's options: the wallet's balances, or the collateral. */
const supplyOptions = (form: LoanForm, filter: FilterValue) =>
  form.connected
    ? form.fundingAssets.rows
        .filter((asset) => passes(filter, asset.symbol, [asset.chain]))
        .map(fundingOption)
    : form.collateralAssets
        .filter((asset) =>
          passes(
            filter,
            asset.symbol,
            asset.markets.map(({ chain }) => chain),
          ),
        )
        .map(reserveOption);

/** The chains the Supply picker filters by. */
const supplyChains = (form: LoanForm) =>
  form.connected
    ? unique(form.fundingAssets.rows.map(({ chain }) => chain))
    : unique(
        form.collateralAssets.flatMap(({ markets }) =>
          markets.map(({ chain }) => chain),
        ),
      );

/**
 * The held balance's chain; not connected, the selected market's.
 * The selection, or the figures' stand-in when the LTV fits no market.
 */
const triggerChainOf = ({ funding, figuresMarket }: LoanForm) => {
  const slug = funding.asset?.chain ?? figuresMarket?.chain;

  return slug ? chainOf(slug) : undefined;
};

/** The picked balance's asset id; not connected, the collateral's symbol. */
const pickedValue = ({ funding, collateralAssets }: LoanForm) =>
  funding.asset
    ? funding.asset.assetId
    : collateralAssets.find(({ symbol }) => sameSymbol(symbol, funding.symbol))
        ?.symbol;

/** The Supply token picker, or its placeholder while the balances load. */
function SupplyPicker({
  form,
  anchor,
  labelId,
}: {
  form: LoanForm;
  anchor: RefObject<HTMLDivElement | null>;
  labelId: string;
}) {
  const [filter, setFilter] = useState(ALL_FILTERS);
  const triggerId = useId();
  const { connected, fundingAssets, funding } = form;
  const loading =
    connected &&
    fundingAssets.status === 'loading' &&
    fundingAssets.rows.length === 0;

  if (loading) {
    return (
      // The trigger's place, as tall as the row.
      <div aria-busy="true" className={`flex ${PICK_WIDTH}`}>
        <span className="sr-only">Loading balances</span>
        <Skeleton height="auto" radius={14} width="100%" />
      </div>
    );
  }

  const triggerChain = triggerChainOf(form);

  return (
    <TokenSelect
      anchor={anchor}
      aria-label="Choose collateral token"
      aria-labelledby={triggerLabel(labelId, triggerId)}
      className={PICK_WIDTH}
      filters={
        <TokenFilters
          chains={supplyChains(form)}
          groups
          value={filter}
          onChange={setFilter}
        />
      }
      id={triggerId}
      options={supplyOptions(form, filter)}
      selected={{
        symbol: funding.symbol,
        mark: markOf(funding.symbol),
        chainName: triggerChain?.name ?? '',
        chainColor: triggerChain?.color,
      }}
      value={pickedValue(form)}
      onValueChange={form.pickFunding}
    />
  );
}

/**
 * A failed read as a whole (no balances at all), or some chains not read:
 * either way a warning with a retry.
 */
function BalancesWarning({
  fundingAssets,
}: {
  fundingAssets: LoanForm['fundingAssets'];
}) {
  const failed = fundingAssets.status === 'error';

  if (!failed && fundingAssets.unreadChains.length === 0) {
    return null;
  }

  return (
    <Banner
      className="mt-3"
      title={failed ? 'Balances did not load' : 'Some balances did not load'}
      tone="warning">
      <p className="m-0">
        {failed
          ? 'Your wallet’s balances could not be read.'
          : `Balances on ${fundingAssets.unreadChains
              .map((slug) => chainOf(slug).name)
              .join(', ')} could not be read.`}
      </p>
      <Button
        className="mt-2.5 px-3.5 py-1.5 text-14"
        variant="secondary"
        onClick={fundingAssets.refresh}>
        Try again
      </Button>
    </Banner>
  );
}

/** The Supply card (lines 216–253). */
export function SupplySection({ form }: { form: LoanForm }) {
  const anchor = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const { connected, fundingAssets, funding, collateral } = form;

  return (
    <>
      <SectionLabel id={labelId}>SUPPLY</SectionLabel>
      <div ref={anchor} className={PICK_ROW}>
        <SupplyPicker anchor={anchor} form={form} labelId={labelId} />
        <AmountInput
          className="min-w-0 flex-1"
          decimals={funding.decimals}
          hideLabel
          label="Collateral amount"
          secondary={
            <>
              ≈{' '}
              {form.amountUsd === undefined ? '$—' : formatUsd(form.amountUsd)}
            </>
          }
          value={form.amount}
          onValueChange={form.setAmount}
        />
      </div>
      {collateral.convertedFrom ? (
        <p className="m-0 mt-2 text-12 text-mut2">
          Supplied as {collateral.symbol}
        </p>
      ) : null}
      {connected ? <BalancesWarning fundingAssets={fundingAssets} /> : null}
    </>
  );
}
