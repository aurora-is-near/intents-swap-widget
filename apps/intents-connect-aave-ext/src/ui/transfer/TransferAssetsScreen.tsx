import { useState } from 'react';

import { TokenLogo } from '../assets/TokenLogo';
import { chainLabel } from '../assets/tokens';
import { Button, ChevronIcon, SearchIcon, Skeleton } from '../ui';
import { exchangeNetwork } from './networks';
import { filterOrigins, type TransferOrigin } from './origins';
import { FAMILY_NAME, type TransferSigner } from './signer';
import { useTransferOrigins } from './useTransferOrigins';

const Row = ({
  origin,
  signer,
  onPick,
}: {
  origin: TransferOrigin;
  signer: TransferSigner;
  onPick: () => void;
}) => {
  const missing =
    signer.kind === 'none'
      ? `Needs a ${FAMILY_NAME[origin.family]} wallet in this browser`
      : undefined;

  return (
    <li>
      <button
        type="button"
        disabled={!!missing}
        onClick={onPick}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent">
        <TokenLogo symbol={origin.token.symbol} />
        <span className="min-w-0">
          <span className="block truncate font-medium">
            {origin.token.symbol}
          </span>
          <span className="block truncate text-text-muted">
            {missing ?? exchangeNetwork(origin.token.blockchain, chainLabel)}
          </span>
        </span>
        <span className="text-text-muted">
          <ChevronIcon />
        </span>
      </button>
    </li>
  );
};

/**
 * Every token the user can send to a deposit address: from an exchange or
 * any wallet, on the networks a transfer supports. A network whose family
 * has no wallet here to sign is listed, but can't be picked.
 */
export const TransferAssetsScreen = ({
  signerOf,
  onPick,
}: {
  signerOf: (family: TransferOrigin['family']) => TransferSigner;
  onPick: (origin: TransferOrigin) => void;
}) => {
  const { origins, status, error, refresh } = useTransferOrigins();
  const [query, setQuery] = useState('');
  const shown = filterOrigins(origins, query, chainLabel);

  let list;

  if (origins.length === 0 && status !== 'error') {
    list = (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[52px]" />
        ))}
      </div>
    );
  } else if (origins.length === 0) {
    list = (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-danger">
          Couldn&apos;t load what can be sent:{' '}
          {error?.message ?? 'unknown error'}
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            void refresh();
          }}>
          Try again
        </Button>
      </div>
    );
  } else if (shown.length === 0) {
    list = (
      <p className="py-6 text-center text-text-muted">
        Nothing matches “{query.trim()}”
      </p>
    );
  } else {
    list = (
      <ul className="max-h-[min(50vh,380px)] overflow-y-auto rounded-card bg-surface-raised shadow-box [&>li+li]:shadow-[0_-1px_0_var(--ring)]">
        {shown.map((origin) => (
          <Row
            key={origin.id}
            origin={origin}
            signer={signerOf(origin.family)}
            onPick={() => onPick(origin)}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex h-9 min-w-0 items-center gap-2 rounded-control bg-field px-3 text-text-muted shadow-box focus-within:shadow-focus">
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search token or network"
          aria-label="Search what to send"
          className="min-w-0 flex-1 bg-transparent text-text-primary outline-hidden placeholder:text-text-muted"
        />
      </label>
      {list}
    </div>
  );
};
