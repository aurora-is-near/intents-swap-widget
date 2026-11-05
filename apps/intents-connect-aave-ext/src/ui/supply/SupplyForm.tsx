import { type ReactNode, useMemo, useState } from 'react';
import type { ExecutionPreview } from '@aurora-is-near/intents-connect';
import {
  type UseExecutionResult,
  useQuotePreview,
  type UseQuotePreviewResult,
  useWalletBalances,
} from '@aurora-is-near/intents-connect/react';

import {
  formatAmount,
  formatUsd,
  fromAtomic,
  toAtomic,
  usdValue,
} from '../assets/amounts';
import { TokenLogo } from '../assets/TokenLogo';
import { chainLabel } from '../assets/tokens';
import type { AssetRow } from '../assets/useWalletAssets';
import { Button, ChevronIcon, Skeleton, useNow } from '../ui';
import { type DeliverableOption, matchingOption } from './options';
import type { SupplyDestination } from './types';

/**
 * Gas a native-token deposit leaves behind on MAX: the deposit transfer
 * itself must be paid for.
 */
const GAS_RESERVE: Record<string, string> = {
  eth: '0.002',
  base: '0.0002',
  arb: '0.0002',
  op: '0.0002',
  scroll: '0.0002',
  pol: '0.2',
  bsc: '0.001',
  avax: '0.01',
  gnosis: '0.01',
  sol: '0.01',
  // Storage, the wNEAR registrations and gas for wrapping on the way.
  near: '0.05',
  // The fee is 0.00001 XLM: the balance read is already spendable, less the
  // account's minimum reserve.
  stellar: '0.01',
};

const maxSpend = ({ token, amount }: AssetRow): string => {
  if (token.contractAddress) {
    return amount;
  }

  const reserve = toAtomic(
    GAS_RESERVE[token.blockchain] ?? '0',
    token.decimals,
  );

  const left = BigInt(amount) - BigInt(reserve ?? '0');

  return left > 0n ? left.toString() : '0';
};

/** The service refuses an amount the destination's gas would eat. */
const TOO_SMALL = /gas fee exceeds/i;
/** 1Click has no route between the two tokens. */
const NO_ROUTE = /no liquidity/i;
/** Worth of the dry quote that measures a too-small amount's fee. */
const PROBE_USD = 50;
/** How often the live quote is refreshed. */
const QUOTE_REFRESH_MS = 30_000;

const formatApy = (apy: number) =>
  `${(apy * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;

/** `estimatedTime` is in seconds. */
const formatDuration = (seconds: string | undefined) => {
  const value = Number(seconds);

  if (!seconds || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return value < 90
    ? `~${Math.round(value)} s`
    : `~${Math.round(value / 60)} min`;
};

const errorMessage = (error: Error) =>
  error.message.length > 160
    ? `${error.message.slice(0, 160)}…`
    : error.message;

const Label = ({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) => (
  <div className="mb-2 flex items-baseline justify-between gap-2">
    <span className="text-text-secondary">{children}</span>
    {aside}
  </div>
);

const Line = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="text-text-secondary">{label}</span>
    <span className="text-right tabular-nums">{children}</span>
  </div>
);

const OptionPicker = ({
  options,
  selected,
  loading,
  onSelect,
}: {
  options: readonly DeliverableOption[];
  selected?: DeliverableOption;
  loading: boolean;
  onSelect: (option: DeliverableOption) => void;
}) => {
  const [open, setOpen] = useState(false);

  if (loading) {
    return <Skeleton className="h-[52px]" />;
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-box">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-hover">
        {selected ? (
          <>
            <TokenLogo symbol={selected.symbol} />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{selected.symbol}</span>
              <span className="block text-text-muted">
                {selected.apy === undefined
                  ? 'Supply'
                  : `Supply APY ${formatApy(selected.apy)}`}
              </span>
            </span>
          </>
        ) : (
          <span className="flex-1 text-text-muted">Choose a reserve</span>
        )}
        <span
          className={
            open ? '-rotate-90 text-text-muted' : 'rotate-90 text-text-muted'
          }>
          <ChevronIcon />
        </span>
      </button>

      {open ? (
        <ul className="max-h-[220px] overflow-y-auto shadow-[0_-1px_0_var(--ring)] [&>li+li]:shadow-[0_-1px_0_var(--ring)]">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                disabled={!!option.unavailable}
                aria-pressed={option.id === selected?.id}
                onClick={() => {
                  onSelect(option);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent aria-pressed:bg-surface-hover">
                <TokenLogo symbol={option.symbol} size={24} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {option.symbol}
                </span>
                <span className="text-text-muted">
                  {option.unavailable ??
                    (option.apy === undefined ? '' : formatApy(option.apy))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

/** The live quote: what the user gets, the fee, the time. */
const QuoteLines = ({
  quote,
  option,
  destinationPrice,
  problem,
}: {
  quote: UseQuotePreviewResult<void>;
  option: DeliverableOption;
  destinationPrice?: number;
  /** Plain words for a refusal the form recognises. */
  problem?: string;
}) => {
  const { preview } = quote;
  // The refresh timer starts when a quote arrives: count down from there.
  const [arrival, setArrival] = useState({ preview, at: Date.now() });

  if (arrival.preview !== preview) {
    setArrival({ preview, at: Date.now() });
  }

  const now = useNow(!!preview && !quote.isLoading);
  const nextIn = Math.ceil((arrival.at + QUOTE_REFRESH_MS - now) / 1000);

  if (quote.error && !preview) {
    return (
      <p className="text-danger">
        {problem ?? `Couldn't get a quote: ${errorMessage(quote.error)}`}
      </p>
    );
  }

  if (!preview) {
    return (
      <>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </>
    );
  }

  const { minAmountOut } = preview.execution.quote;
  const { networkFee, estimatedTime } = preview.execution.details;
  const minUsd = usdValue(minAmountOut, option.decimals, destinationPrice);
  const feeUsd = networkFee
    ? usdValue(networkFee, option.decimals, destinationPrice)
    : undefined;

  const time = formatDuration(estimatedTime);

  return (
    <>
      <Line label="You supply at least">
        {formatAmount(minAmountOut, option.decimals)} {option.symbol}
        {minUsd === undefined ? null : (
          <span className="text-text-muted"> · {formatUsd(minUsd)}</span>
        )}
      </Line>
      {networkFee ? (
        <Line label="Network fee">
          {formatAmount(networkFee, option.decimals)} {option.symbol}
          {feeUsd === undefined ? null : (
            <span className="text-text-muted"> · {formatUsd(feeUsd)}</span>
          )}
        </Line>
      ) : null}
      {time ? <Line label="Estimated time">{time}</Line> : null}
      <p className="mt-1 text-text-muted">
        {quote.isLoading || nextIn <= 0
          ? 'Updating the quote…'
          : `The quote will update in ${nextIn} sec.`}
      </p>
    </>
  );
};

/**
 * How much of the chosen asset, into which of the dApp's options, at what
 * quote. The quote is live: a dry preview, refreshed as the input changes
 * and every 30 s.
 */
export const SupplyForm = ({
  asset,
  options,
  loadingOptions,
  buildPlan,
  dappName,
  exec,
  onSubmit,
}: {
  asset: AssetRow;
  options: readonly DeliverableOption[];
  loadingOptions: boolean;
  buildPlan: SupplyDestination['buildPlan'];
  dappName: string;
  exec: UseExecutionResult;
  /** Runs exactly the previewed plan. */
  onSubmit: (preview: ExecutionPreview, option: DeliverableOption) => void;
}) => {
  const { token } = asset;
  const [amount, setAmount] = useState('');
  const [chosen, setChosen] = useState<string>();
  const { tokens } = useWalletBalances();

  const option =
    options.find((candidate) => candidate.id === chosen) ??
    (chosen === undefined ? matchingOption(token.symbol, options) : undefined);

  const atomic = toAtomic(amount, token.decimals);
  const max = maxSpend(asset);
  const tooMuch = !!atomic && BigInt(atomic) > BigInt(asset.amount);
  const sameToken = option?.destinationAsset === token.assetId;

  const plan = useMemo(
    () =>
      atomic && option && !tooMuch && !sameToken && !option.unavailable
        ? buildPlan({
            option,
            destinationAsset: option.destinationAsset,
            origin: token,
            amount: atomic,
          })
        : null,
    [atomic, option, tooMuch, sameToken, token, buildPlan],
  );

  const quote = useQuotePreview<void>({
    exec,
    plan,
    refreshIntervalMs: QUOTE_REFRESH_MS,
  });

  const { preview } = quote;
  const destinationPrice = option
    ? tokens.find((candidate) => candidate.assetId === option.destinationAsset)
        ?.price
    : undefined;

  const amountUsd = atomic
    ? usdValue(atomic, token.decimals, token.price)
    : undefined;

  const refused = !preview && quote.error ? quote.error.message : '';
  const tooSmall = TOO_SMALL.test(refused);
  const noRoute = NO_ROUTE.test(refused);

  // The refusal names no fee, so a dry quote of a bigger amount measures it.
  // Stable per option and token: asking again shows the last answer at once.
  const probePlan = useMemo(() => {
    const probeAmount =
      option && token.price
        ? toAtomic(
            (PROBE_USD / token.price).toFixed(Math.min(token.decimals, 8)),
            token.decimals,
          )
        : undefined;

    return option && probeAmount
      ? buildPlan({
          option,
          destinationAsset: option.destinationAsset,
          origin: token,
          amount: probeAmount,
        })
      : null;
  }, [option, token, buildPlan]);

  const probe = useQuotePreview<void>({
    exec,
    plan: tooSmall ? probePlan : null,
    debounceMs: 0,
    refreshIntervalMs: 0,
  });

  const probeFee = probe.preview?.execution.details.networkFee;
  const feeUsd =
    probeFee && option
      ? usdValue(probeFee, option.decimals, destinationPrice)
      : undefined;

  let problem: string | undefined;

  if (tooSmall && option) {
    const chain = chainLabel(option.chain);

    problem =
      feeUsd !== undefined && amountUsd !== undefined && feeUsd > amountUsd
        ? `Too small to supply on ${chain}: its network fee is about ${formatUsd(feeUsd)}, more than the ${formatUsd(amountUsd)} you'd send. Enter more, or pick a market on a cheaper chain.`
        : `Too small to supply on ${chain}: its network fee costs more than this amount. Enter more, or pick a market on a cheaper chain.`;
  } else if (noRoute && option) {
    problem = `No route from ${token.symbol} on ${chainLabel(token.blockchain)} into ${option.symbol} right now. Try another reserve or asset.`;
  }

  let cta = `Supply ${option?.symbol ?? ''}`.trim();

  if (!amount) {
    cta = 'Enter an amount';
  } else if (!atomic) {
    cta = 'Enter a valid amount';
  } else if (tooMuch) {
    cta = `Not enough ${token.symbol}`;
  } else if (!option) {
    cta = 'Choose a reserve';
  } else if (sameToken) {
    cta = `Supply it on ${dappName} directly`;
  } else if (!preview && quote.isLoading) {
    cta = 'Getting a quote…';
  } else if (tooSmall) {
    cta = 'Amount too small';
  } else if (noRoute) {
    cta = 'No route';
  } else if (!preview) {
    cta = 'No quote';
  }

  const ready = !!plan && !!preview;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label
          aside={
            <span className="text-text-muted">
              Balance {formatAmount(asset.amount, token.decimals)}
              <button
                type="button"
                disabled={max === '0'}
                onClick={() => setAmount(fromAtomic(max, token.decimals))}
                className="ml-2 font-medium text-text-primary hover:underline disabled:opacity-40">
                MAX
              </button>
            </span>
          }>
          Amount
        </Label>
        <div className="rounded-xl bg-white px-3 py-2.5 shadow-box focus-within:shadow-[0_0_0_1px_var(--text-primary)]">
          <div className="flex items-center gap-3">
            <input
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value.replace(',', '.'))
              }
              placeholder="0.00"
              aria-label={`Amount of ${token.symbol}`}
              className="min-w-0 flex-1 bg-transparent text-[21px] leading-7 font-medium outline-none placeholder:text-text-muted"
            />
            <span className="flex flex-none items-center gap-2">
              <TokenLogo symbol={token.symbol} size={24} />
              <span className="font-medium">{token.symbol}</span>
            </span>
          </div>
          <div className="mt-0.5 flex justify-between text-text-muted">
            <span>{amountUsd === undefined ? ' ' : formatUsd(amountUsd)}</span>
            <span>on {chainLabel(token.blockchain)}</span>
          </div>
        </div>
      </div>

      <div>
        <Label>Supply as</Label>
        <OptionPicker
          options={options}
          selected={option}
          loading={loadingOptions}
          onSelect={(next) => setChosen(next.id)}
        />
      </div>

      {sameToken ? (
        <p className="text-text-secondary">
          You already hold {token.symbol} on {chainLabel(token.blockchain)}:
          supply it with {dappName}&apos;s own Supply button.
        </p>
      ) : null}

      {plan && option ? (
        <div className="flex flex-col gap-1.5 rounded-xl bg-surface-raised p-3 shadow-box">
          <QuoteLines
            quote={quote}
            option={option}
            destinationPrice={destinationPrice}
            problem={problem}
          />
        </div>
      ) : null}

      <Button
        variant="primary"
        className="w-full"
        disabled={!ready}
        onClick={() => {
          if (preview && option) {
            onSubmit(preview, option);
          }
        }}>
        {cta}
      </Button>
    </div>
  );
};
