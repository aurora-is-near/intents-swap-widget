import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  useIntentsAccount,
  useIntentsAuth,
} from '@aurora-is-near/intents-connect/react';

import { useAnnounce, useSettledAnnouncement, useTabs } from '../a11y';
import { Segmented } from '../Segmented';
import {
  Button,
  ChevronIcon,
  EmptyState,
  IntentsGlyph,
  LockIcon,
  SearchField,
  SearchIcon,
  Skeleton,
  WalletGlyph,
} from '../ui';
import { formatAmount, formatUsd } from './amounts';
import { balanceSources } from './intentsAccess';
import {
  AuthorizeGate,
  ConfidentialSource,
  IntentsSource,
  type ListState,
} from './IntentsSources';
import { TokenLogo } from './TokenLogo';
import { chainLabel } from './tokens';
import {
  type AssetRow,
  type BalanceSource,
  useWalletAssets,
} from './useWalletAssets';

const matches = ({ token }: AssetRow, query: string) => {
  const needle = query.trim().toLowerCase();

  return (
    !needle ||
    token.symbol.toLowerCase().includes(needle) ||
    token.blockchain.toLowerCase().includes(needle) ||
    chainLabel(token.blockchain).toLowerCase().includes(needle)
  );
};

const RefreshIcon = ({ spinning }: { spinning: boolean }) => (
  <svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={spinning ? 'shrink-0 animate-spin' : 'shrink-0'}
    aria-hidden>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </svg>
);

// An unavailable row stays focusable (`aria-disabled`), so its reason can be
// found by keyboard and read.
const Row = ({ row, onPick }: { row: AssetRow; onPick: () => void }) => (
  <li>
    <button
      type="button"
      aria-disabled={row.unavailable ? true : undefined}
      onClick={() => {
        if (!row.unavailable) {
          onPick();
        }
      }}
      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent">
      <TokenLogo symbol={row.token.symbol} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{row.token.symbol}</span>
        <span className="block truncate text-text-muted">
          {chainLabel(row.token.blockchain)}
          {row.unavailable ? ` · ${row.unavailable}` : null}
        </span>
      </span>
      <span className="text-right tabular-nums">
        <span className="block font-medium">
          {formatAmount(row.amount, row.token.decimals)}
        </span>
        <span className="block text-text-muted">
          {row.usd === undefined ? '—' : formatUsd(row.usd)}
        </span>
      </span>
      <span className="text-text-muted">
        <ChevronIcon />
      </span>
    </button>
  </li>
);

const TAB_ITEMS: Record<
  BalanceSource,
  { id: BalanceSource; label: string; icon: ReactNode }
> = {
  wallet: { id: 'wallet', label: 'Wallet', icon: <WalletGlyph size={14} /> },
  intents: { id: 'intents', label: 'Intents', icon: <IntentsGlyph /> },
  confidential: {
    id: 'confidential',
    label: 'Confidential',
    icon: <LockIcon />,
  },
};

const plural = (count: number) => (count === 1 ? 'asset' : 'assets');

/** A list's rows, or its loading, error and empty states. */
const AssetList = ({
  state,
  shown,
  query,
  empty,
  onPick,
}: {
  /** Undefined until the source first reports. */
  state?: ListState;
  shown: readonly AssetRow[];
  query: string;
  empty: { icon: ReactNode; text: ReactNode; action?: ReactNode };
  onPick: (row: AssetRow) => void;
}) => {
  const rows = state?.rows ?? [];
  // Rows stay while the same source re-loads, so a poll never flashes the
  // skeleton; only the first load over an empty list shows it.
  const [settled, setSettled] = useState(false);

  if (!settled && (state?.status === 'success' || state?.status === 'error')) {
    setSettled(true);
  }

  if (!settled && rows.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[52px]" />
        ))}
      </div>
    );
  }

  if (state?.status === 'error' && rows.length === 0) {
    return (
      <p className="py-6 text-center text-danger" role="alert">
        Couldn&apos;t load balances: {state.error?.message ?? 'unknown error'}
      </p>
    );
  }

  if (shown.length === 0) {
    return rows.length ? (
      <EmptyState icon={<SearchIcon size={18} />}>
        No assets match “{query.trim()}”
      </EmptyState>
    ) : (
      <EmptyState icon={empty.icon} action={empty.action}>
        {empty.text}
      </EmptyState>
    );
  }

  return (
    <ul className="max-h-[min(50vh,380px)] overflow-y-auto rounded-card bg-surface-raised shadow-box [&>li+li]:shadow-[0_-1px_0_var(--ring)]">
      {shown.map((row) => (
        <Row key={row.id} row={row} onPick={() => onPick(row)} />
      ))}
    </ul>
  );
};

/**
 * What the user can pay with, most valuable first: the wallet's balances on
 * every chain it can hold and, for a wallet with an intents account, its
 * public and confidential balances there, each under its own tab. Picking
 * one opens the supply form.
 */
export const AssetsScreen = ({
  tab,
  onTabChange,
  intents = true,
  onPick,
}: {
  /** The list shown: kept by the modal, so coming back lands on it. */
  tab: BalanceSource;
  onTabChange: (tab: BalanceSource) => void;
  /** False: the dApp can't take a supply paid from intents balances. */
  intents?: boolean;
  onPick: (row: AssetRow) => void;
}) => {
  const wallet = useWalletAssets();
  const account = useIntentsAccount();
  const auth = useIntentsAuth();
  const sources: BalanceSource[] = intents
    ? balanceSources(account)
    : ['wallet'];

  const current = sources.includes(tab) ? tab : 'wallet';
  // A list switched to says what it holds, once it settles.
  const [switched, setSwitched] = useState(false);
  const tabs = useTabs({
    items: sources,
    value: current,
    onChange: (next) => {
      setSwitched(true);
      onTabChange(next);
    },
  });

  const [query, setQuery] = useState('');
  // The intents lists, as their reporters last said: kept across switches.
  const [reported, setReported] = useState<
    Partial<Record<BalanceSource, ListState>>
  >({});

  const authorized =
    auth.status === 'authorized' &&
    auth.intentsAccountId === account.intentsAccountId;

  const report = (source: BalanceSource) => (state: ListState) =>
    setReported((previous) => ({ ...previous, [source]: state }));

  const state: ListState | undefined =
    current === 'wallet'
      ? {
          rows: wallet.rows,
          status: wallet.status,
          error: wallet.error,
          refresh: wallet.refresh,
        }
      : reported[current];

  const rows = state?.rows ?? [];
  const shown = rows.filter((row) => matches(row, query));
  const announce = useAnnounce();
  const loading = state?.status === 'loading';
  const locked = current === 'confidential' && !authorized;
  // A refresh asked for (not a background poll) says when it's done.
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current && !loading) {
      asked.current = false;
      announce(
        state?.status === 'error'
          ? "Couldn't refresh the balances"
          : 'Balances updated',
      );
    }
  }, [loading, state?.status, announce]);

  // What a search finds, or a list switched to holds, once it settles.
  let found: string | undefined;

  if (query.trim()) {
    found = shown.length
      ? `${shown.length} ${plural(shown.length)} found`
      : 'No assets match';
  } else if (switched && !locked && state && state.status !== 'loading') {
    found = rows.length
      ? `${rows.length} ${plural(rows.length)}`
      : 'No assets here';
  }

  useSettledAnnouncement(found);

  const empty = {
    wallet: {
      icon: <WalletGlyph />,
      text: 'Nothing to supply from this wallet yet',
    },
    intents: {
      icon: <IntentsGlyph size={18} />,
      text: (
        <>
          <span className="block font-medium text-text-primary">
            Nothing in your intents account
          </span>
          <span className="mt-1 block">
            Balances this wallet holds on NEAR Intents show up here.
          </span>
        </>
      ),
    },
    confidential: {
      icon: <LockIcon size={18} />,
      text: (
        <span className="block font-medium text-text-primary">
          No private balances
        </span>
      ),
      action: (
        <Button
          variant="ghost"
          className="px-2 py-1"
          onClick={() => {
            void auth.logout();
          }}>
          Forget this session
        </Button>
      ),
    },
  }[current];

  const list = locked ? (
    <AuthorizeGate expired={auth.status === 'expired'} />
  ) : (
    <AssetList
      // A fresh list per source: its first load shows the skeleton.
      key={current}
      state={state}
      shown={shown}
      query={query}
      empty={empty}
      onPick={onPick}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SearchField
          value={query}
          onChange={setQuery}
          label="Search assets"
          placeholder="Search token or chain"
        />
        {/* Never disabled (a background poll would take focus off it): busy
            instead, and a press while busy does nothing. */}
        <Button
          variant="secondary"
          className="w-9 px-0!"
          aria-label="Refresh balances"
          aria-busy={loading}
          title="Refresh balances"
          onClick={() => {
            if (!loading && state && !locked) {
              asked.current = true;
              void state.refresh();
            }
          }}>
          <RefreshIcon spinning={loading} />
        </Button>
      </div>

      {current === 'intents' ? (
        <IntentsSource onState={report('intents')} />
      ) : null}
      {current === 'confidential' && authorized ? (
        <ConfidentialSource onState={report('confidential')} />
      ) : null}

      {sources.length > 1 ? (
        <>
          <Segmented
            items={sources.map((source) => TAB_ITEMS[source])}
            value={current}
            name="Balances"
            tabs={tabs}
          />
          <div {...tabs.panelProps(current)}>{list}</div>
        </>
      ) : (
        list
      )}

      {current === 'wallet' && wallet.unreadChains.length > 0 ? (
        <p className="text-text-muted">
          Couldn&apos;t read {wallet.unreadChains.join(', ')}. Refresh to try
          again.
        </p>
      ) : null}

      {current === 'confidential' && authorized && rows.length > 0 ? (
        <Button
          variant="ghost"
          className="self-center px-2 py-1"
          onClick={() => {
            void auth.logout();
          }}>
          Forget this session
        </Button>
      ) : null}
    </div>
  );
};
