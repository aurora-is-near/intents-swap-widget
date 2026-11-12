import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type ExecutionPreview,
  type FundingRequest,
  GuardError,
} from '@aurora-is-near/intents-connect';
import {
  type UseExecutionResult,
  useQuotePreview,
  useWalletBalances,
} from '@aurora-is-near/intents-connect/react';

import {
  formatAmount,
  formatUsd,
  fromAtomic,
  toAtomic,
  usdValue,
} from '../assets/amounts';
import { AssetAmount, ChainName } from '../assets/AssetAmount';
import { TokenLogo } from '../assets/TokenLogo';
import { chainLabel } from '../assets/tokens';
import type { AssetRow } from '../assets/useWalletAssets';
import { exchangeNetwork } from '../transfer/networks';
import { transferPreviewer } from '../transfer/preview';
import { useListbox, useSettledAnnouncement } from '../a11y';
import {
  Button,
  CheckIcon,
  ChevronIcon,
  Notice,
  Skeleton,
  truncateMiddle,
  useNow,
} from '../ui';
import { Steps } from '../Steps';
import { WalletIcon } from '../wallets/WalletIcon';
import { type DeliverableOption, matchingOption } from './options';
import type { SupplyDestination } from './types';
import { useFundedPreview } from './useFundedPreview';

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
  // Bandwidth, and 1.1 TRX to activate the fresh deposit address.
  tron: '2',
  // A transfer costs well under 0.01 TON; storage fees keep accruing.
  ton: '0.1',
};

/**
 * What a token (not gas-token) deposit costs in the chain's gas token, for
 * chains where that's worth saying. `min`: below this the deposit may fail.
 */
const TOKEN_DEPOSIT_COST: Record<
  string,
  { min: number; says: (gas: string) => string }
> = {
  // About 130k energy at 100 sun to a fresh deposit address.
  tron: {
    min: 15,
    says: (gas) =>
      `burns about 13 ${gas} for energy, unless the account has staked energy`,
  },
  // A jetton transfer carries TON for its fees; the excess comes back.
  ton: {
    min: 0.1,
    says: (gas) => `attaches 0.05 ${gas} for fees, most of which comes back`,
  },
};

const maxSpend = ({ token, amount, source }: AssetRow): string => {
  // Intents balances pay no gas: the move is signed, not sent.
  if (source !== 'wallet' || token.contractAddress) {
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
/** 1Click's floor for moving a token out of NEAR Intents. */
const BELOW_MINIMUM = /amount is too low/i;
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

/** A field's visible name: a `<label>` for an input, else named by `id`. */
const Label = ({
  children,
  aside,
  id,
  htmlFor,
}: {
  children: ReactNode;
  aside?: ReactNode;
  id?: string;
  htmlFor?: string;
}) => (
  <div className="mb-2 flex items-baseline justify-between gap-2">
    {htmlFor ? (
      <label id={id} htmlFor={htmlFor} className="text-text-secondary">
        {children}
      </label>
    ) : (
      <span id={id} className="text-text-secondary">
        {children}
      </span>
    )}
    {aside}
  </div>
);

/** One row of a `<dl>`: a term and its value. */
const Line = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="shrink-0 text-text-secondary">{label}</dt>
    <dd className="flex min-w-0 items-center justify-end text-right tabular-nums">
      {children}
    </dd>
  </div>
);

const pickable = (option: DeliverableOption) => ({
  id: option.id,
  label: option.symbol,
  disabled: !!option.unavailable,
});

/**
 * The reserve to supply into: a button that opens a listbox (arrow keys,
 * letters, Escape back to the button), named by its visible label.
 */
const OptionPicker = ({
  options,
  selected,
  loading,
  labelId,
  onSelect,
}: {
  options: readonly DeliverableOption[];
  selected?: DeliverableOption;
  loading: boolean;
  /** The visible label's id: "Supply as". */
  labelId: string;
  onSelect: (option: DeliverableOption) => void;
}) => {
  const triggerId = useId();
  const picker = useListbox({
    options: options.map(pickable),
    value: selected?.id,
    onChange: (id) => {
      const next = options.find((option) => option.id === id);

      if (next) {
        onSelect(next);
      }
    },
    label: 'Reserve to supply',
  });

  const { open } = picker;

  if (loading) {
    return <Skeleton className="h-[52px]" />;
  }

  return (
    <div className="overflow-hidden rounded-card bg-field shadow-box">
      <button
        {...picker.triggerProps}
        id={triggerId}
        aria-labelledby={`${labelId} ${triggerId}`}
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
        <ul
          {...picker.listProps}
          className="max-h-[220px] overflow-y-auto shadow-[0_-1px_0_var(--ring)] [&>li+li]:shadow-[0_-1px_0_var(--ring)]">
          {options.map((option) => (
            <li
              key={option.id}
              {...picker.optionProps(pickable(option))}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-hover aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent aria-selected:bg-surface-hover">
              <TokenLogo symbol={option.symbol} size={24} />
              <span className="min-w-0 flex-1 truncate font-medium">
                {option.symbol}
              </span>
              <span className="text-text-muted">
                {option.unavailable ??
                  (option.apy === undefined ? '' : formatApy(option.apy))}
              </span>
              {/* The selection, by more than its background. */}
              <span
                className={
                  option.id === selected?.id ? 'text-text-primary' : 'invisible'
                }>
                <CheckIcon />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

/** What a quote says, whichever way the supply is paid. */
type QuoteSummary = {
  /** Smallest unit of the option's token: what gets supplied at least. */
  minAmountOut: string;
  networkFee?: string;
  /** Seconds. */
  estimatedTime?: string;
};

/** The live quote: what the user gets, the fee, the time. */
const QuoteLines = ({
  summary: preview,
  isLoading,
  error,
  option,
  destinationPrice,
  problem,
}: {
  /** A new object per quote: the refresh countdown restarts on it. */
  summary?: QuoteSummary;
  isLoading: boolean;
  error?: Error;
  option: DeliverableOption;
  destinationPrice?: number;
  /** Plain words for a refusal the form recognises. */
  problem?: string;
}) => {
  // The refresh timer starts when a quote arrives: count down from there.
  const [arrival, setArrival] = useState({ preview, at: Date.now() });

  if (arrival.preview !== preview) {
    setArrival({ preview, at: Date.now() });
  }

  const now = useNow(!!preview && !isLoading);
  const nextIn = Math.ceil((arrival.at + QUOTE_REFRESH_MS - now) / 1000);

  if (error && !preview) {
    return (
      <p className="text-danger">
        {problem ?? `Couldn't get a quote: ${errorMessage(error)}`}
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

  const { minAmountOut, networkFee, estimatedTime } = preview;
  const minUsd = usdValue(minAmountOut, option.decimals, destinationPrice);
  const feeUsd = networkFee
    ? usdValue(networkFee, option.decimals, destinationPrice)
    : undefined;

  const time = formatDuration(estimatedTime);

  return (
    <>
      <dl className="flex flex-col gap-1.5">
        <Line label="You supply at least">
          <AssetAmount
            symbol={option.symbol}
            amount={formatAmount(minAmountOut, option.decimals)}
          />
          {minUsd === undefined ? null : (
            <span className="whitespace-pre text-text-muted">
              {' · '}
              {formatUsd(minUsd)}
            </span>
          )}
        </Line>
        {networkFee ? (
          <Line label="Network fee">
            <AssetAmount
              symbol={option.symbol}
              amount={formatAmount(networkFee, option.decimals)}
            />
            {feeUsd === undefined ? null : (
              <span className="whitespace-pre text-text-muted">
                {' · '}
                {formatUsd(feeUsd)}
              </span>
            )}
          </Line>
        ) : null}
        {time ? <Line label="Estimated time">{time}</Line> : null}
      </dl>
      <p className="mt-1 text-text-muted">
        {isLoading || nextIn <= 0
          ? 'Updating the quote…'
          : `The quote will update in ${nextIn} sec.`}
      </p>
    </>
  );
};

/** What the form holds: kept by the modal while the form isn't shown. */
export type FormDraft = { amount: string; chosen?: string };

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
  draft,
  onDraft,
  funding = 'wallet',
  signer,
  buildStepsPlan,
  onSubmitFunded,
}: {
  asset: AssetRow;
  options: readonly DeliverableOption[];
  loadingOptions: boolean;
  buildPlan: SupplyDestination['buildPlan'];
  dappName: string;
  exec: UseExecutionResult;
  /** Runs exactly the previewed plan. */
  onSubmit: (preview: ExecutionPreview, option: DeliverableOption) => void;
  /** What was entered before the form was left (for History, say). */
  draft?: FormDraft;
  /** Every change to what is entered, to hand back as `draft`. */
  onDraft?: (draft: FormDraft) => void;
  /**
   * `transfer`: paid by sending to a deposit address, from an exchange or
   * any wallet. No balance applies, and every quote is a transfer's.
   * `intents` / `confidential`: paid from the wallet's intents account,
   * moved to its Aurora account first (two signatures).
   */
  funding?: 'wallet' | 'transfer' | 'intents' | 'confidential';
  /** The wallet that signs a transfer, and gets a refund. */
  signer?: { name: string; address: string; icon?: string };
  /** Prices the supply leg of an intents-paid supply. */
  buildStepsPlan?: SupplyDestination['buildStepsPlan'];
  /** Runs an intents-paid supply: exactly the priced request. */
  onSubmitFunded?: (request: FundingRequest, option: DeliverableOption) => void;
}) => {
  const { token } = asset;
  const transfer = funding === 'transfer';
  const fromIntents = funding === 'intents' || funding === 'confidential';
  const [amount, setAmount] = useState(draft?.amount ?? '');
  const amountId = useId();
  const amountLabelId = useId();
  const symbolId = useId();
  const problemId = useId();
  const reserveLabelId = useId();
  const amountRef = useRef<HTMLInputElement>(null);

  // The form opens on its amount: what there is to do first.
  useEffect(() => {
    amountRef.current?.focus({ preventScroll: true });
  }, []);
  const [chosen, setChosen] = useState<string | undefined>(draft?.chosen);
  const reportDraft = useRef(onDraft);

  reportDraft.current = onDraft;

  useEffect(() => {
    reportDraft.current?.({ amount, chosen });
  }, [amount, chosen]);
  const { tokens, balances } = useWalletBalances();

  const option =
    options.find((candidate) => candidate.id === chosen) ??
    (chosen === undefined ? matchingOption(token.symbol, options) : undefined);

  const atomic = toAtomic(amount, token.decimals);
  const max = maxSpend(asset);
  const tooMuch =
    !transfer && !!atomic && BigInt(atomic) > BigInt(asset.amount);

  // From intents, the same token still has to leave NEAR Intents: no
  // shortcut through the dApp's own button.
  const sameToken = !fromIntents && option?.destinationAsset === token.assetId;
  const fillable = !!atomic && !!option && !tooMuch && !option.unavailable;

  const plan = useMemo(
    () =>
      fillable && !fromIntents && !sameToken
        ? buildPlan({
            option,
            destinationAsset: option.destinationAsset,
            origin: token,
            amount: atomic,
          })
        : null,
    [fillable, fromIntents, atomic, option, sameToken, token, buildPlan],
  );

  // From intents: what to move to the wallet's Aurora account, for the
  // option's token on its chain.
  const request = useMemo<FundingRequest | null>(
    () =>
      fillable && fromIntents && asset.tokenId
        ? {
            source: funding,
            originAsset: asset.tokenId,
            amount: atomic,
            destination: {
              chain: option.chain,
              assetId: option.destinationAsset,
              tokenAddress: option.tokenAddress,
            },
            context: { optionId: option.id },
          }
        : null,
    [fillable, fromIntents, funding, asset.tokenId, atomic, option],
  );

  // A transfer previews the same plan with its own funding and window, so
  // the previewed plan that runs is a transfer's.
  const previewer = transfer ? transferPreviewer(exec) : exec;

  const quote = useQuotePreview<void>({
    exec: previewer,
    plan,
    refreshIntervalMs: QUOTE_REFRESH_MS,
  });

  const funded = useFundedPreview({
    request,
    option,
    exec,
    buildStepsPlan,
    refreshIntervalMs: QUOTE_REFRESH_MS,
  });

  const { preview } = quote;
  const priced = fromIntents ? funded.preview : preview;
  const pricing = fromIntents ? funded : quote;

  // What the quote box shows, the same way for every kind of payment.
  const summary = useMemo((): QuoteSummary | undefined => {
    if (funded.preview && fromIntents) {
      const { funding: moved, steps } = funded.preview;
      const supplyTime = Number(steps.execution.details.estimatedTime) || 0;

      return {
        minAmountOut: steps.spendable,
        networkFee: steps.networkFee,
        estimatedTime: String(moved.timeEstimate + supplyTime),
      };
    }

    return preview && !fromIntents
      ? {
          minAmountOut: preview.execution.quote.minAmountOut,
          networkFee: preview.execution.details.networkFee,
          estimatedTime: preview.execution.details.estimatedTime,
        }
      : undefined;
  }, [preview, funded.preview, fromIntents]);

  const destinationPrice = option
    ? tokens.find((candidate) => candidate.assetId === option.destinationAsset)
        ?.price
    : undefined;

  const amountUsd = atomic
    ? usdValue(atomic, token.decimals, token.price)
    : undefined;

  const refused = !priced && pricing.error ? pricing.error.message : '';

  // A token deposit on some chains pays its fees in the gas token.
  const depositCost =
    funding === 'wallet' && token.contractAddress
      ? TOKEN_DEPOSIT_COST[token.blockchain]
      : undefined;

  const gasToken = depositCost
    ? tokens.find(
        (candidate) =>
          candidate.blockchain === token.blockchain &&
          !candidate.contractAddress,
      )
    : undefined;

  const gasHeld = gasToken ? (balances[gasToken.assetId] ?? '0') : '0';
  const lowOnGas =
    !!depositCost &&
    !!gasToken &&
    Number(fromAtomic(gasHeld, gasToken.decimals)) < depositCost.min;

  const tooSmall =
    TOO_SMALL.test(refused) ||
    (fromIntents &&
      pricing.error instanceof GuardError &&
      pricing.error.code === 'FEE_EXCEEDS_AMOUNT');

  const belowMinimum = fromIntents && BELOW_MINIMUM.test(refused);
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
    exec: previewer,
    plan: tooSmall && !fromIntents ? probePlan : null,
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
  } else if (belowMinimum) {
    problem = `Too small to move from your intents account on this route. Enter more.`;
  } else if (noRoute && option) {
    problem = `No route from ${token.symbol} on ${chainLabel(token.blockchain)} into ${option.symbol} right now. Try another reserve or asset.`;
  }

  let cta = transfer
    ? 'Sign to get the deposit address'
    : `Supply ${option?.symbol ?? ''}`.trim();

  const loadingQuote = !priced && pricing.isLoading;

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
  } else if (loadingQuote) {
    cta = 'Getting a quote…';
  } else if (tooSmall || belowMinimum) {
    cta = 'Amount too small';
  } else if (noRoute) {
    cta = 'No route';
  } else if (!priced) {
    cta = 'No quote';
  }

  const ready = fromIntents
    ? !!request &&
      !!funded.preview &&
      funded.preview.funding.request === request
    : !!plan && !!preview;

  // A problem with the amount itself, shown under it and tied to it.
  let fieldProblem: string | undefined;

  if (amount && !atomic) {
    fieldProblem = 'Enter a valid amount.';
  } else if (tooMuch) {
    fieldProblem = `Not enough ${token.symbol}: the balance is ${formatAmount(asset.amount, token.decimals)}.`;
  }

  // The button's label is the form's state ("Not enough USDC", "Amount too
  // small", "Supply USDC"): read once it settles, not while a quote loads.
  useSettledAnnouncement(cta === 'Getting a quote…' ? undefined : cta);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label
          aside={
            transfer ? undefined : (
              <span className="text-text-muted">
                Balance {formatAmount(asset.amount, token.decimals)}
                <button
                  type="button"
                  disabled={max === '0'}
                  aria-label={`MAX: ${formatAmount(max, token.decimals)} ${token.symbol}`}
                  onClick={() => setAmount(fromAtomic(max, token.decimals))}
                  className="ml-1 inline-flex min-h-[24px] items-center px-1 font-medium text-text-primary hover:underline disabled:opacity-40">
                  MAX
                </button>
              </span>
            )
          }
          id={amountLabelId}
          htmlFor={amountId}>
          Amount
        </Label>
        <div className="rounded-card bg-field px-3 py-2.5 shadow-box focus-within:shadow-focus">
          <div className="flex items-center gap-3">
            <input
              ref={amountRef}
              id={amountId}
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value.replace(',', '.'))
              }
              placeholder="0.00"
              aria-labelledby={`${amountLabelId} ${symbolId}`}
              aria-invalid={fieldProblem ? true : undefined}
              aria-describedby={fieldProblem ? problemId : undefined}
              className="min-w-0 flex-1 bg-transparent text-amount leading-7 font-medium outline-hidden placeholder:text-text-muted"
            />
            <span className="flex flex-none items-center gap-2">
              <TokenLogo symbol={token.symbol} size={24} />
              <span id={symbolId} className="font-medium">
                {token.symbol}
              </span>
            </span>
          </div>
          <div className="mt-0.5 flex justify-between text-text-muted">
            <span>{amountUsd === undefined ? ' ' : formatUsd(amountUsd)}</span>
            <span>
              {fromIntents
                ? `${funding === 'confidential' ? 'Private' : 'Intents'} · ${chainLabel(token.blockchain)}`
                : `on ${chainLabel(token.blockchain)}`}
            </span>
          </div>
        </div>
        {fieldProblem ? (
          <p id={problemId} className="mt-1.5 text-danger">
            {fieldProblem}
          </p>
        ) : null}
      </div>

      <div>
        <Label id={reserveLabelId}>Supply as</Label>
        <OptionPicker
          options={options}
          selected={option}
          loading={loadingOptions}
          labelId={reserveLabelId}
          onSelect={(next) => setChosen(next.id)}
        />
      </div>

      {sameToken && transfer ? (
        <p className="text-text-secondary">
          This is the token {dappName} takes on {chainLabel(token.blockchain)}:
          send it to your own wallet there and supply it with {dappName}&apos;s
          own Supply button.
        </p>
      ) : null}

      {sameToken && !transfer ? (
        <p className="text-text-secondary">
          You already hold {token.symbol} on {chainLabel(token.blockchain)}:
          supply it with {dappName}&apos;s own Supply button.
        </p>
      ) : null}

      {transfer && !sameToken ? (
        <div className="rounded-card bg-surface-raised p-3 shadow-box">
          <Steps
            label="How this transfer works"
            steps={[
              {
                id: 'sign',
                title: 'Sign to get the deposit address',
                detail: signer ? (
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span>Once, with</span>
                    <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-text-primary">
                      <WalletIcon
                        name={signer.name}
                        icon={signer.icon}
                        size={16}
                      />
                      {signer.name} · {truncateMiddle(signer.address)}
                    </span>
                    <span>A refund would go back to it.</span>
                  </span>
                ) : (
                  'Once, with a wallet on that network.'
                ),
              },
              {
                id: 'send',
                title: (
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    Send it on
                    <ChainName
                      chain={token.blockchain}
                      label={exchangeNetwork(token.blockchain, chainLabel)}
                    />
                    only
                  </span>
                ),
                detail:
                  'From any wallet or exchange: add its withdrawal fee, and check its minimum.',
              },
            ]}
          />
        </div>
      ) : null}

      {fromIntents ? (
        <div className="rounded-card bg-surface-raised p-3 shadow-box">
          <Steps
            label="How this supply works"
            steps={[
              {
                id: 'move',
                title:
                  funding === 'confidential'
                    ? 'Sign to move it out of your private balance'
                    : 'Sign to move it from your intents account',
                detail: option
                  ? `To your Aurora account on ${chainLabel(option.chain)}, as ${option.symbol}.${funding === 'confidential' ? ' This move is public.' : ''}`
                  : 'To your Aurora account on the market’s chain.',
              },
              {
                id: 'supply',
                title: 'Sign to supply it',
                detail: `Into ${dappName}, once it arrives. Nothing to send.`,
              },
            ]}
          />
        </div>
      ) : null}

      {depositCost && gasToken ? (
        <Notice tone={lowOnGas ? 'warning' : 'info'}>
          <p className="text-text-secondary">
            Sending {token.symbol} on {chainLabel(token.blockchain)}{' '}
            {depositCost.says(gasToken.symbol)}.
            {lowOnGas
              ? ` This wallet holds ${formatAmount(gasHeld, gasToken.decimals)} ${gasToken.symbol}, so the transfer may fail.`
              : null}
          </p>
        </Notice>
      ) : null}

      {(plan ?? request) && option ? (
        <div className="flex flex-col gap-1.5 rounded-card bg-surface-raised p-3 shadow-box">
          <QuoteLines
            summary={summary}
            isLoading={pricing.isLoading}
            error={pricing.error}
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
          if (fromIntents) {
            if (request && option) {
              onSubmitFunded?.(request, option);
            }
          } else if (preview && option) {
            onSubmit(preview, option);
          }
        }}>
        {cta}
      </Button>
    </div>
  );
};
