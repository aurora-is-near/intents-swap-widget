import { useState } from 'react';

import { Button, ChevronIcon, SearchIcon, Skeleton, WalletGlyph } from '../ui';
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

const Row = ({ row, onPick }: { row: AssetRow; onPick: () => void }) => (
  <li>
    <button
      type="button"
      disabled={!!row.unavailable}
      onClick={onPick}
      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent">
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
      <p className="py-6 text-center text-danger">
        Couldn&apos;t load balances: {error?.message ?? 'unknown error'}
      </p>
    );
  } else if (shown.length === 0) {
    list = (
      <div className="flex flex-col items-center gap-2 py-6 text-center text-text-muted">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-text-secondary">
          {rows.length ? <SearchIcon size={18} /> : <WalletGlyph />}
        </span>
        <p>
          {rows.length
            ? `No assets match “${query.trim()}”`
            : 'Nothing to supply from this wallet yet'}
        </p>
      </div>
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
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-control bg-field px-3 text-text-muted shadow-box focus-within:shadow-focus">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search token or chain"
            aria-label="Search assets"
            className="min-w-0 flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-muted"
          />
        </label>
        <Button
          variant="secondary"
          className="w-9 px-0!"
          aria-label="Refresh balances"
          title="Refresh balances"
          disabled={status === 'loading'}
          onClick={() => {
            void refresh();
          }}>
          <RefreshIcon spinning={status === 'loading'} />
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
