import {
  AmountInput,
  Banner,
  Button,
  Card,
  Chip,
  Skeleton,
  Text,
  type TokenOption,
  TokenSelect,
} from '@aurora-is-near/ui-kit';
import { useIntentsConnectWallet } from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import { useId, useRef, useState } from 'react';

import { BORROW_FEE_BPS } from '../config';
import type { FundingAsset } from '../balances/toFundingAssets';
import { formatApr } from '../markets/format';
import { useConnectWallet } from '../wallet/useConnectWallet';
import { LtvField } from './LtvField';
import { MarketList } from './MarketList';
import { RecipientField } from './RecipientField';
import { sameSymbol } from './model/symbols';
import {
  type LoanForm,
  type ReserveAsset,
  toDisplayNumber,
  useLoanForm,
} from './useLoanForm';

/**
 * Chain names and dots by 1Click slug: the artboard's `CH` (Web-Borrow.dc.html
 * line 1099) for the four it draws; other chains get their slug's name and
 * the "All chains" grey.
 */
const CHAINS: Record<string, { name: string; color: string }> = {
  eth: { name: 'Ethereum', color: '#5B74D6' },
  base: { name: 'Base', color: '#2E6BFF' },
  arb: { name: 'Arbitrum', color: '#1F8FD6' },
  op: { name: 'Optimism', color: '#D9341F' },
  pol: { name: 'Polygon', color: '#8A928C' },
  avax: { name: 'Avalanche', color: '#8A928C' },
  bsc: { name: 'BNB Chain', color: '#8A928C' },
  gnosis: { name: 'Gnosis', color: '#8A928C' },
  sol: { name: 'Solana', color: '#8A928C' },
  near: { name: 'NEAR', color: '#8A928C' },
};

/** "All chains" (line 1165). */
const ALL_CHAINS_COLOR = '#8A928C';

const chainOf = (slug: string) =>
  CHAINS[slug] ?? {
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    color: ALL_CHAINS_COLOR,
  };

/**
 * Token marks by symbol: the artboard's letters and colours (lines
 * 1103–1124); WETH takes ETH's colours. Others: two letters on `sf2`.
 */
const MARKS: Record<string, { label: string; bg: string; fg: string }> = {
  wsteth: { label: 'ws', bg: '#BFE3FF', fg: '#0B3350' },
  eth: { label: 'ET', bg: '#DAD9F7', fg: '#25235C' },
  weth: { label: 'WE', bg: '#DAD9F7', fg: '#25235C' },
  weeth: { label: 'we', bg: '#E3D4F7', fg: '#3B1F63' },
  reth: { label: 'rE', bg: '#FFD9B8', fg: '#5B2A05' },
  wbtc: { label: 'WB', bg: '#FFE2A8', fg: '#4A3000' },
  cbbtc: { label: 'cb', bg: '#C9D7FF', fg: '#14275E' },
  susds: { label: 'sU', bg: '#FFD0E4', fg: '#5E0B33' },
  usds: { label: 'US', bg: '#D3F2DF', fg: '#0C4325' },
  usdc: { label: 'UC', bg: '#C7E0FF', fg: '#0B2E5C' },
  dai: { label: 'DA', bg: '#FFE9A8', fg: '#4A3800' },
  usdt: { label: 'UT', bg: '#C6EBDD', fg: '#0B4033' },
  gho: { label: 'GH', bg: '#E5D3FF', fg: '#3A1B66' },
};

const markOf = (symbol: string): TokenOption['mark'] =>
  MARKS[symbol.toLowerCase()] ?? {
    label: symbol.slice(0, 2),
    bg: 'var(--sf2)',
    fg: 'var(--ink)',
  };

/** The group chips (line 1162), "Stocks" left out: Borrow lists none. */
const GROUPS = [
  { id: 'all', label: 'All' },
  { id: 'eth', label: 'ETH' },
  { id: 'btc', label: 'BTC' },
  { id: 'stable', label: 'Stables' },
] as const;

type Group = (typeof GROUPS)[number]['id'];

/** A token's group by its symbol: wstETH is ETH, cbBTC is BTC, USDC a stable. */
const groupOf = (symbol: string): Group | undefined => {
  if (/btc/i.test(symbol)) {
    return 'btc';
  }

  if (/eth/i.test(symbol)) {
    return 'eth';
  }

  return /usd|dai|gho|eur|frax/i.test(symbol) ? 'stable' : undefined;
};

const ALL = 'all';

const USD_ROUND = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const USD_CENTS = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "≈ $7,200" as on line 1573 (whole dollars), cents below $100. */
const formatUsd = (usd: number) =>
  `$${(usd >= 100 ? USD_ROUND : USD_CENTS).format(usd)}`;

/**
 * A token amount: whole units from 1,000 (as the artboard's "You receive",
 * line 1573), two decimals from 1, up to six below.
 */
const amountDigits = (value: number) => {
  if (value >= 1000) {
    return 0;
  }

  return value >= 1 ? 2 : 6;
};

const formatAmount = (value: number) =>
  value.toLocaleString('en-US', {
    maximumFractionDigits: amountDigits(value),
  });

/** The fee to two decimals (line 1573), more below one unit. */
const formatFee = (value: number) =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: value === 0 || value >= 1 ? 2 : 6,
  });

/** One wallet balance as a picker row: its chain, balance and USD value. */
const fundingOption = (asset: FundingAsset): TokenOption => ({
  id: asset.assetId,
  symbol: asset.symbol,
  mark: markOf(asset.symbol),
  chainsLabel: chainOf(asset.chain).name,
  priceLabel: '',
  balanceLabel: `${formatAmount(toDisplayNumber(asset.amount, asset.decimals))} ${asset.symbol}`,
  balanceUsdLabel:
    asset.usdValue === undefined
      ? undefined
      : `$${USD_CENTS.format(asset.usdValue)}`,
  unavailableReason: asset.unavailableReason,
});

/** A reserve as a picker row: the chains of its markets and its price. */
const reserveOption = (asset: ReserveAsset): TokenOption => ({
  id: asset.symbol,
  symbol: asset.symbol,
  mark: markOf(asset.symbol),
  chainsLabel: asset.markets.map(({ chainLabel }) => chainLabel).join(' · '),
  priceLabel: `$${(asset.priceUsd > 10 ? USD_ROUND : USD_CENTS).format(asset.priceUsd)}`,
});

type FilterValue = { group: Group; chain: string };

type TokenFiltersProps = {
  /** Shown when set; the Supply picker always has them. */
  groups: boolean;
  /** Chain slugs, in order. */
  chains: readonly string[];
  value: FilterValue;
  onChange: (value: FilterValue) => void;
};

/**
 * The picker's two chip rows (lines 232–241): groups, 8px above the chains,
 * each wrapping with a 6px gap; the chain chips carry the chain's dot.
 */
function TokenFilters({ groups, chains, value, onChange }: TokenFiltersProps) {
  return (
    <>
      {groups ? (
        <div
          aria-label="Token group"
          className="mb-[8px] flex flex-wrap gap-[6px]"
          role="group">
          {GROUPS.map(({ id, label }) => (
            <Chip
              key={id}
              pressed={value.group === id}
              onClick={() => onChange({ ...value, group: id })}>
              {label}
            </Chip>
          ))}
        </div>
      ) : null}
      <div aria-label="Chain" className="flex flex-wrap gap-[6px]" role="group">
        {[ALL, ...chains].map((slug) => (
          <Chip
            key={slug}
            dotColor={slug === ALL ? ALL_CHAINS_COLOR : chainOf(slug).color}
            pressed={value.chain === slug}
            onClick={() => onChange({ ...value, chain: slug })}>
            {slug === ALL ? 'All chains' : chainOf(slug).name}
          </Chip>
        ))}
      </div>
    </>
  );
}

const ALL_FILTERS: FilterValue = { group: ALL, chain: ALL };

const passes = (filter: FilterValue, symbol: string, chains: string[]) =>
  (filter.group === ALL || groupOf(symbol) === filter.group) &&
  (filter.chain === ALL || chains.includes(filter.chain));

const unique = (values: readonly string[]) => [...new Set(values)];

/** The row holding a picker and its amount box (lines 218, 260): gap 8. */
const PICK_ROW = 'flex items-stretch gap-[8px]';

/** The picker's width where it is placed (line 219). */
const PICK_WIDTH = 'w-[188px] shrink-0';

/** The section labels (lines 216, 256): 12px, 0.14em, `mut2`. */
function SectionLabel({ id, children }: { id: string; children: string }) {
  return (
    <Text className="mb-[8px] leading-[normal]" id={id} variant="label">
      {children}
    </Text>
  );
}

/**
 * A picker trigger's name: its section, then what it shows ("SUPPLY WETH
 * Base"), so the two triggers are told apart.
 */
const triggerLabel = (sectionId: string, triggerId: string) =>
  `${sectionId} ${triggerId}`;

/** The Supply card (lines 216–253). */
function SupplySection({ form }: { form: LoanForm }) {
  const anchor = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState(ALL_FILTERS);
  const labelId = useId();
  const triggerId = useId();
  const { connected, fundingAssets, funding, collateral } = form;
  const loading =
    connected &&
    fundingAssets.status === 'loading' &&
    fundingAssets.rows.length === 0;

  const failed = connected && fundingAssets.status === 'error';

  const options = connected
    ? fundingAssets.rows
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

  const chains = connected
    ? unique(fundingAssets.rows.map(({ chain }) => chain))
    : unique(
        form.collateralAssets.flatMap(({ markets }) =>
          markets.map(({ chain }) => chain),
        ),
      );

  // The held balance's chain; not connected, the selected market's.
  // The selection, or the figures' stand-in when the LTV fits no market.
  const triggerSlug =
    funding.asset?.chain ?? (form.market ?? form.figuresMarket)?.chain;

  const triggerChain = triggerSlug ? chainOf(triggerSlug) : undefined;

  return (
    <>
      <SectionLabel id={labelId}>SUPPLY</SectionLabel>
      <div ref={anchor} className={PICK_ROW}>
        {loading ? (
          // The trigger's place, as tall as the row.
          <div aria-busy="true" className={`flex ${PICK_WIDTH}`}>
            <span className="sr-only">Loading balances</span>
            <Skeleton height="auto" radius={14} width="100%" />
          </div>
        ) : (
          <TokenSelect
            anchor={anchor}
            aria-label="Choose collateral token"
            aria-labelledby={triggerLabel(labelId, triggerId)}
            className={PICK_WIDTH}
            filters={
              <TokenFilters
                chains={chains}
                groups
                value={filter}
                onChange={setFilter}
              />
            }
            id={triggerId}
            options={options}
            selected={{
              symbol: funding.symbol,
              mark: markOf(funding.symbol),
              chainName: triggerChain?.name ?? '',
              chainColor: triggerChain?.color,
            }}
            value={
              funding.asset
                ? funding.asset.assetId
                : form.collateralAssets.find(({ symbol }) =>
                    sameSymbol(symbol, funding.symbol),
                  )?.symbol
            }
            onValueChange={form.pickFunding}
          />
        )}
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
        <p className="m-0 mt-[8px] text-[12px] text-mut2">
          Supplied as {collateral.symbol}
        </p>
      ) : null}
      {/* A failed read as a whole (no balances at all), or some chains
          not read: either way a warning with a retry. */}
      {connected && (failed || fundingAssets.unreadChains.length > 0) ? (
        <Banner
          className="mt-[12px]"
          title={
            failed ? 'Balances did not load' : 'Some balances did not load'
          }
          tone="warning">
          <p className="m-0">
            {failed
              ? 'Your wallet’s balances could not be read.'
              : `Balances on ${fundingAssets.unreadChains
                  .map((slug) => chainOf(slug).name)
                  .join(', ')} could not be read.`}
          </p>
          <Button
            className="mt-[10px] px-[14px] py-[6px] text-[14px]"
            variant="secondary"
            onClick={fundingAssets.refresh}>
            Try again
          </Button>
        </Banner>
      ) : null}
    </>
  );
}

/** The Borrow card (lines 256–293) and the fee row (line 295). */
function BorrowSection({ form }: { form: LoanForm }) {
  const anchor = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState(ALL_FILTERS);
  const labelId = useId();
  const triggerId = useId();
  const receiveId = useId();
  const { borrow, figures } = form;
  // The selection, or the figures' stand-in when the LTV fits no market.
  const market = form.market ?? form.figuresMarket;

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
    ? toDisplayNumber(figures.received, borrow.decimals)
    : 0;

  const fee = figures ? toDisplayNumber(figures.fee, borrow.decimals) : 0;

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
        <div className="box-border flex min-w-0 flex-1 flex-col justify-center rounded-[14px] border-[1.5px] border-solid border-bd bg-sf px-[16px] py-[8px]">
          <output
            aria-labelledby={receiveId}
            className="block truncate text-[30px] font-extrabold leading-[1.15] tracking-[-0.02em]">
            {formatAmount(received)}
          </output>
          <span className="text-[12px] text-mut2" id={receiveId}>
            You receive · after fee
          </span>
        </div>
      </div>
      {/* The fee as drawn (line 295): BORROW_FEE_BPS of the borrow amount.
          An estimate: the real fee is the API key's Intents Connect fee,
          taken on each swap's input (docs: "API Keys & Fees"), so Borrow
          execution reconciles this row with the quote (decided). */}
      <div className="mt-[12px] flex justify-between text-[14px] text-mut">
        <span>Borrow fee · {formatApr(BORROW_FEE_BPS / 10_000)}</span>
        <span className="font-semibold">
          −{formatFee(fee)} {borrow.symbol}
        </span>
      </div>
    </>
  );
}

/** The three summary tiles (line 368): `sf2`, radius 14, padding 12px 16px. */
const STATS = ['LTV', 'Liquidation', 'Health'] as const;

/**
 * The New loan tab: the artboard's two columns (lines 213–375). The form
 * card holds the Supply and Borrow cards, the fee row, the loan-to-value
 * slider and the recipient option; the markets beside
 * it are read for the form's pair and follow its selection. The summary
 * tiles stay "—" and the CTA shows only while disconnected until the
 * summary and call to action are built.
 *
 * Columns: the form card `flex:1 1 460px; max-width:560px`, the markets
 * `flex:1.3 1 520px`, gap 24, wrapping to one column on narrow screens.
 */
export function NewLoanForm() {
  const { isConnected } = useIntentsConnectWallet();
  const connectWallet = useConnectWallet();
  const form = useLoanForm({ connected: isConnected });

  return (
    <div className="flex flex-wrap items-start gap-[24px]">
      {/* The form card keeps its 22px padding at every width (inline on the
          artboard, so the 640px `.card` rule does not reach it). */}
      <Card
        aria-label="Loan details"
        className="min-w-0 flex-[1_1_460px] p-[22px] max-w-[560px]"
        role="region">
        <SupplySection form={form} />
        <div aria-hidden="true" className="my-[18px] h-px bg-bd" />
        <BorrowSection form={form} />
        <LtvField
          liquidationLtvBps={form.liquidationLtvBps}
          ltv={form.ltv}
          onLtvChange={form.setLtv}
        />
        <RecipientField
          enabled={form.recipientEnabled}
          value={form.recipient}
          onEnabledChange={form.setRecipientEnabled}
          onValueChange={form.setRecipient}
        />
      </Card>

      <section aria-label="Markets" className="min-w-0 flex-[1.3_1_520px]">
        {/* The live markets as `.mkc` cards (lines 344–363), for the
            form's pair. */}
        <MarketList
          layout="cards"
          pair={form.pair}
          selectedId={form.marketsSettled ? form.market?.id : undefined}
          onSelect={form.pickMarket}
        />
        <dl className="m-0 mt-[16px] grid grid-cols-3 gap-[10px]">
          {STATS.map((label) => (
            <div
              key={label}
              className="rounded-[14px] bg-sf2 px-[16px] py-[12px] leading-[normal]">
              <dt className="text-[12px] text-mut2">{label}</dt>
              <dd className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">
                —
              </dd>
            </div>
          ))}
        </dl>
        {isConnected ? null : (
          // `.cta` (line 371): `.go` with radius 16, gap 10, margin-top 14.
          <Button
            className="mt-[14px] gap-[10px] rounded-[16px]"
            onClick={connectWallet}>
            <span>Connect wallet to borrow on</span>
            {/* The lime market chip (line 372): `accent`, `onlime` text,
                padding 1px 10px, radius 7. A span, not the kit's `Chip`,
                which is a button and cannot sit inside one. */}
            <span className="rounded-[7px] bg-accent px-[10px] py-px text-onlime">
              Aave
            </span>
          </Button>
        )}
      </section>
    </div>
  );
}
