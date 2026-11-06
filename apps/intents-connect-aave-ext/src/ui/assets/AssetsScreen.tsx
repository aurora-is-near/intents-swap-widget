import { useEffect, useRef, useState } from 'react';

import { useAnnounce, useSettledAnnouncement } from '../a11y';
import {
  Button,
  ChevronIcon,
  EmptyState,
  SearchField,
  SearchIcon,
  Skeleton,
  WalletGlyph,
} from '../ui';
import { formatAmount, formatUsd } from './amounts';
import { TokenLogo } from './TokenLogo';
import { chainLabel } from './tokens';
import { type AssetRow, useWalletAssets } from './useWalletAssets';

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

/**
 * The paying wallet's balances on every chain it can hold, most valuable
 * first. Picking one opens the supply form.
 */
export const AssetsScreen = ({
  onPick,
}: {
  onPick: (row: AssetRow) => void;
}) => {
  const { rows, unreadChains, status, error, refresh } = useWalletAssets();
  const [query, setQuery] = useState('');
  // Rows stay while the same wallet re-loads, so a poll never flashes the
  // skeleton; only the first load over an empty list shows it.
  const [settled, setSettled] = useState(false);

  if (!settled && (status === 'success' || status === 'error')) {
    setSettled(true);
  }

  const shown = rows.filter((row) => matches(row, query));
  const announce = useAnnounce();
  const loading = status === 'loading';
  // A refresh asked for (not a background poll) says when it's done.
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current && !loading) {
      asked.current = false;
      announce(
        status === 'error'
          ? "Couldn't refresh the balances"
          : 'Balances updated',
      );
    }
  }, [loading, status, announce]);

  // What a search finds, once typing stops.
  let found: string | undefined;

  if (query.trim()) {
    found = shown.length
      ? `${shown.length} ${shown.length === 1 ? 'asset' : 'assets'} found`
      : 'No assets match';
  }

  useSettledAnnouncement(found);

  let list;

  if (!settled && rows.length === 0) {
    list = (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[52px]" />
        ))}
      </div>
    );
  } else if (status === 'error' && rows.length === 0) {
    list = (
      <p className="py-6 text-center text-danger" role="alert">
        Couldn&apos;t load balances: {error?.message ?? 'unknown error'}
      </p>
    );
  } else if (shown.length === 0) {
    list = (
      <EmptyState
        icon={rows.length ? <SearchIcon size={18} /> : <WalletGlyph />}>
        {rows.length
          ? `No assets match “${query.trim()}”`
          : 'Nothing to supply from this wallet yet'}
      </EmptyState>
    );
  } else {
    list = (
      <ul className="max-h-[min(50vh,380px)] overflow-y-auto rounded-card bg-surface-raised shadow-box [&>li+li]:shadow-[0_-1px_0_var(--ring)]">
        {shown.map((row) => (
          <Row key={row.id} row={row} onPick={() => onPick(row)} />
        ))}
      </ul>
    );
  }

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
            if (!loading) {
              asked.current = true;
              void refresh();
            }
          }}>
          <RefreshIcon spinning={loading} />
        </Button>
      </div>

      {list}

      {unreadChains.length > 0 ? (
        <p className="text-text-muted">
          Couldn&apos;t read {unreadChains.join(', ')}. Refresh to try again.
        </p>
      ) : null}
    </div>
  );
};
