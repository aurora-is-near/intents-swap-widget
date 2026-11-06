import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  Execution,
  ExecutionStatus,
  SupportedToken,
} from '@aurora-is-near/intents-connect';
import {
  useSupportedTokens,
  useWalletExecutions,
  type UseWalletExecutionsResult,
} from '@aurora-is-near/intents-connect/react';

import { formatAmount, formatUsd, formatWhen } from '../assets/amounts';
import { TokenLogo } from '../assets/TokenLogo';
import { chainLabel } from '../assets/tokens';
import { Detail, TxLink } from '../progress/ProgressScreen';
import { needsOf } from '../progress/runOf';
import {
  Button,
  ChevronIcon,
  CopyButton,
  cx,
  Notice,
  Skeleton,
  truncateMiddle,
} from '../ui';
import {
  historyEntries,
  type HistoryEntry,
  type HistoryLabel,
  labelOf,
} from './entries';
import type { FollowableWallet } from './historyWallets';

/** How often an open History re-reads every wallet. */
const REFRESH_MS = 30_000;

/** A clock turning back: opens History. */
export const HistoryIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);

type Entry = HistoryEntry<FollowableWallet>;

type Answer = Pick<
  UseWalletExecutionsResult,
  'executions' | 'status' | 'error' | 'refresh'
>;

/** One wallet's runs, read while History is open. Renders nothing. */
const Source = ({
  address,
  onAnswer,
}: {
  address: string;
  onAnswer: (address: string, answer: Answer) => void;
}) => {
  const { executions, status, error, refresh } = useWalletExecutions({
    address,
    refreshIntervalMs: REFRESH_MS,
  });

  const report = useRef(onAnswer);
  const reload = useRef(refresh);

  report.current = onAnswer;
  reload.current = refresh;

  useEffect(() => {
    report.current(address, {
      executions,
      status,
      error,
      refresh: () => reload.current(),
    });
  }, [address, executions, status, error]);

  return null;
};

/** Answered at least once: data, or an error. */
const answered = (answer: Answer | undefined) =>
  !!answer &&
  (answer.status === 'success' ||
    answer.status === 'error' ||
    answer.executions.length > 0);

const LABELS: Record<HistoryLabel, { text: string; className: string }> = {
  supplied: { text: 'Supplied', className: 'bg-track text-text-secondary' },
  'supplied-waiting': {
    text: 'Supplied',
    className: 'bg-track text-text-secondary',
  },
  'needs-you': { text: 'Needs you', className: 'bg-cta text-cta-text' },
  'in-progress': {
    text: 'In progress',
    className: 'bg-track text-text-primary',
  },
  failed: { text: 'Failed', className: 'bg-danger-bg text-danger' },
  expired: { text: 'Expired', className: 'bg-track text-text-muted' },
};

const StatusTag = ({ label }: { label: HistoryLabel }) => (
  <span
    className={cx(
      'shrink-0 rounded-chip px-2 py-0.5 text-xs font-medium',
      LABELS[label].className,
    )}>
    {LABELS[label].text}
  </span>
);

type Tokens = ReadonlyMap<string, SupportedToken>;

const titleOf = (execution: Execution) =>
  typeof execution.metadata?.title === 'string'
    ? execution.metadata.title
    : undefined;

/** What a run paid and supplied, as far as the token list can name it. */
const describe = ({ execution, stepsOnly }: Entry, tokens: Tokens) => {
  const quote = execution.quote as Execution['quote'] | undefined;
  const origin = tokens.get(quote?.originAsset ?? '');
  const destination = tokens.get(quote?.destinationAsset ?? '');
  const title = titleOf(execution);

  const paid =
    !stepsOnly &&
    quote?.amountIn &&
    origin?.symbol &&
    origin.decimals !== undefined
      ? `${formatAmount(quote.amountIn, origin.decimals)} ${origin.symbol}`
      : undefined;

  const supplies =
    !stepsOnly &&
    quote?.minAmountOut &&
    destination?.symbol &&
    destination.decimals !== undefined
      ? `at least ${formatAmount(quote.minAmountOut, destination.decimals)} ${destination.symbol}`
      : undefined;

  let what = title ?? 'Supply';

  if (stepsOnly) {
    // It names no amount: only the token it supplied, when the service says.
    what =
      title ??
      (destination?.symbol
        ? `Supplied ${destination.symbol} that was waiting`
        : 'Supplied what was waiting');
  } else if (paid && destination?.symbol) {
    what = `${paid} → ${destination.symbol}`;
  }

  return {
    what,
    title,
    paid,
    paidUsd: quote?.amountInUsd ? Number(quote.amountInUsd) : undefined,
    supplies,
    // A run naming no token (an older steps-only one): a glyph stands in.
    logo: stepsOnly
      ? destination?.symbol
      : (origin?.symbol ?? destination?.symbol),
    originChain: stepsOnly ? undefined : origin?.blockchain,
    destinationChain: destination?.blockchain,
  };
};

/** In place of a token logo for a run that names no token. */
const SuppliedGlyph = () => (
  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-track text-text-secondary">
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden>
      <path d="M12 3v12" />
      <path d="m6 9 6 6 6-6" />
      <path d="M5 21h14" />
    </svg>
  </span>
);

const Row = ({
  entry,
  tokens,
  onSelect,
}: {
  entry: Entry;
  tokens: Tokens;
  onSelect: () => void;
}) => {
  const { what, logo, originChain } = describe(entry, tokens);
  const where = [originChain && chainLabel(originChain), entry.wallet.name]
    .filter(Boolean)
    .join(' · ');

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover">
        {logo ? <TokenLogo symbol={logo} /> : <SuppliedGlyph />}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-medium">{what}</span>
            <StatusTag label={entry.label} />
          </span>
          <span className="flex items-center gap-2 text-text-muted">
            <span className="min-w-0 flex-1 truncate">{where}</span>
            <span className="shrink-0 tabular-nums">
              {formatWhen(entry.execution.createdAt)}
            </span>
          </span>
        </span>
        <span className="text-text-muted">
          <ChevronIcon />
        </span>
      </button>
    </li>
  );
};

/** One line on where the run is, or how it ended. */
const statusLine = ({ execution, stepsOnly }: Entry, dappName: string) => {
  switch (execution.status) {
    case 'SUCCESS':
      return stepsOnly
        ? `Supplied what was waiting to ${dappName}.`
        : `Supplied to ${dappName}.`;
    case 'DEPOSIT_FAILED':
      return "The deposit didn't go through.";
    case 'OPERATION_FAILED':
      return 'The supply stopped after the deposit arrived.';
    case 'EXPIRED':
      return 'It expired before the deposit arrived.';
    case 'DEPOSIT_PROCESSING':
      return 'The deposit is being confirmed.';
    case 'OPERATION_PENDING':
    case 'OPERATION_PROCESSING':
      return 'The deposit arrived; the supply is running.';
    default:
      return needsOf(execution) === 'signature'
        ? 'Waiting for your signature.'
        : 'Waiting for your deposit.';
  }
};

const fullDate = (iso: string | undefined) => {
  const date = new Date(iso ?? '');

  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
};

/** How to carry on with a run, when it can be. */
export type Follow = { label: string; onClick: () => void };

const EntryDetail = ({
  entry,
  tokens,
  dappName,
  follow,
  extra,
}: {
  entry: Entry;
  tokens: Tokens;
  dappName: string;
  follow?: Follow;
  extra?: ReactNode;
}) => {
  const { execution, wallet } = entry;
  const { title, paid, paidUsd, supplies, destinationChain } = describe(
    entry,
    tokens,
  );

  const when = fullDate(execution.createdAt);
  const txHash = execution.transaction?.evmTxHash;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <StatusTag label={entry.label} />
        <p className="min-w-0 text-text-secondary">
          {statusLine(entry, dappName)}
        </p>
      </div>
      <dl className="flex flex-col gap-1.5 rounded-card bg-surface-raised p-3 shadow-box">
        {paid ? (
          <Detail label="Paid">
            {paid}
            {paidUsd === undefined ? null : (
              <span className="text-text-muted"> · {formatUsd(paidUsd)}</span>
            )}
          </Detail>
        ) : null}
        {supplies ? (
          <Detail label={entry.label === 'supplied' ? 'Supplied' : 'To supply'}>
            {supplies}
          </Detail>
        ) : null}
        {title ? (
          <Detail label="Where">
            <span className="truncate" title={title}>
              {title}
            </span>
          </Detail>
        ) : null}
        {when ? <Detail label="When">{when}</Detail> : null}
        <Detail label="Wallet">
          <span className="truncate" title={wallet.address}>
            {wallet.name} · {truncateMiddle(wallet.address)}
          </span>
        </Detail>
        {txHash ? (
          <Detail label="Supply transaction">
            <TxLink
              chain={destinationChain ?? ''}
              hash={txHash}
              label="supply transaction"
            />
          </Detail>
        ) : null}
        <Detail label="Execution">
          <span title={execution.id}>{truncateMiddle(execution.id, 6, 4)}</span>
          <CopyButton value={execution.id} label="execution id" />
        </Detail>
      </dl>
      {extra}
      {follow ? (
        <Button variant="primary" className="w-full" onClick={follow.onClick}>
          {follow.label}
        </Button>
      ) : null}
    </div>
  );
};

/**
 * Past supplies from every wallet the page shows an account for, merged
 * newest first, and one of them in detail (`selectedId`). Each wallet is
 * read while this is mounted, every 30 s.
 */
export const HistoryView = ({
  wallets,
  intent,
  dappName,
  selectedId,
  onSelect,
  onChooseWallet,
  live,
  followOf,
  extraOf,
}: {
  wallets: readonly FollowableWallet[];
  /** The recipe's intent: only the dApp's own runs are listed. */
  intent: string;
  dappName: string;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  onChooseWallet: () => void;
  /** The run the runner drives: its status is fresher than the server's. */
  live?: { id: string; status?: ExecutionStatus };
  /** How to carry on with an entry; `undefined` hides the button. */
  followOf: (entry: Entry) => Follow | undefined;
  /** More under an entry's details, e.g. funds a failed supply left. */
  extraOf?: (entry: Entry) => ReactNode;
}) => {
  const supported = useSupportedTokens();
  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  const onAnswer = useCallback(
    (address: string, answer: Answer) =>
      setAnswers((current) => ({ ...current, [address]: answer })),
    [],
  );

  const tokens = useMemo(() => {
    const byAsset = new Map<string, SupportedToken>();

    [...supported.origins, ...supported.destinations].forEach((token) => {
      if (token.assetId && !byAsset.has(token.assetId)) {
        byAsset.set(token.assetId, token);
      }
    });

    return byAsset;
  }, [supported.origins, supported.destinations]);

  const entries = useMemo(
    () =>
      historyEntries(
        wallets.flatMap((wallet) => {
          const answer = answers[wallet.address];

          return answer ? [{ wallet, executions: answer.executions }] : [];
        }),
        intent,
      ).map((entry): Entry => {
        if (entry.execution.id !== live?.id || !live.status) {
          return entry;
        }

        const execution = { ...entry.execution, status: live.status };

        return { ...entry, execution, label: labelOf(execution) };
      }),
    [wallets, answers, intent, live?.id, live?.status],
  );

  const pending = wallets.some((wallet) => !answered(answers[wallet.address]));
  const failed = wallets.filter(
    (wallet) => answers[wallet.address]?.status === 'error',
  );

  const selected = selectedId
    ? entries.find((entry) => entry.execution.id === selectedId)
    : undefined;

  // A run that dropped out of the list (another wallet now): back to it.
  useEffect(() => {
    if (selectedId && !selected && !pending) {
      onSelect(undefined);
    }
  }, [selectedId, selected, pending, onSelect]);

  const sources = wallets.map((wallet) => (
    <Source key={wallet.address} address={wallet.address} onAnswer={onAnswer} />
  ));

  if (selectedId) {
    return (
      <>
        {sources}
        {selected ? (
          <EntryDetail
            entry={selected}
            tokens={tokens}
            dappName={dappName}
            follow={followOf(selected)}
            extra={extraOf?.(selected)}
          />
        ) : (
          <Skeleton className="h-[220px]" />
        )}
      </>
    );
  }

  if (!wallets.length) {
    return (
      <Notice tone="info">
        <p className="font-medium">
          No wallet shares an account with this page yet
        </p>
        <p className="mt-1 text-text-secondary">
          Choose a wallet to see its supplies.
        </p>
        <Button variant="secondary" className="mt-3" onClick={onChooseWallet}>
          Choose a wallet
        </Button>
      </Notice>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sources}
      {failed.length ? (
        <Notice tone="warning">
          <p className="font-medium">
            {failed.length === wallets.length
              ? "History didn't load"
              : "Some wallets' history didn't load"}
          </p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() =>
              failed.forEach((wallet) => {
                void answers[wallet.address]?.refresh();
              })
            }>
            Retry
          </Button>
        </Notice>
      ) : null}
      {entries.length ? (
        <ul className="max-h-[min(50vh,380px)] overflow-y-auto rounded-card bg-surface-raised shadow-box [&>li+li]:shadow-[0_-1px_0_var(--ring)]">
          {entries.map((entry) => (
            <Row
              key={entry.execution.id}
              entry={entry}
              tokens={tokens}
              onSelect={() => onSelect(entry.execution.id)}
            />
          ))}
        </ul>
      ) : null}
      {!entries.length && pending ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-[52px]" />
          ))}
        </div>
      ) : null}
      {!entries.length && !pending && !failed.length ? (
        <p className="py-6 text-center text-text-secondary">
          No supplies to {dappName} yet.
        </p>
      ) : null}
    </div>
  );
};
