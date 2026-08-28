import { useRef, useState } from 'react';

import {
  Badge,
  Banner,
  Card,
  TinyNumber,
} from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import type { Phase } from '@aurora-is-near/intents-connect';

import { RANGE_SIDE_COPIES } from '../constants';
import { useAvailableHeight } from '../../shared/hooks/useAvailableHeight';
import { useHydrexPositions } from '../hooks/useHydrexPositions';
import type { HydrexPosition } from '../positions';

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

// The spin lives on the icon, never on the button: rotating the button would
// take its hover background around with it.
const RefreshIcon = ({ isSpinning }: { isSpinning: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={cn('h-sw-xl w-sw-xl', { 'animate-spin': isSpinning })}>
    <path
      d="M20 11.5a8 8 0 1 0-.6 3.5M20 5v6h-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Chevron = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={cn('h-sw-lg w-sw-lg transition-transform duration-200', {
      'rotate-180': isOpen,
    })}>
    <path
      d="M6 9l6 6 6-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sw-body-sm text-sw-gray-400 px-sw-md">{children}</p>
);

const Amount = ({ token }: { token: HydrexPosition['token0' | 'token1'] }) => (
  <span className="text-sw-label-md text-sw-gray-100 whitespace-nowrap">
    <TinyNumber value={token.amount.toString()} decimals={token.decimals} />{' '}
    <span className="text-sw-gray-400">{token.symbol}</span>
  </span>
);

const PositionRow = ({ position }: { position: HydrexPosition }) => {
  const { token0, token1, side, tokenId, tickLower, tickUpper, createdAt } =
    position;

  return (
    <Card as="li" padding="none" className="hover:bg-sw-gray-800">
      <div className="px-sw-lg py-sw-md flex flex-col gap-sw-xs">
        <div className="flex items-center justify-between gap-sw-md">
          <span className="text-sw-label-md text-sw-gray-200">
            {token0.symbol} / {token1.symbol}
          </span>
          <Badge>{RANGE_SIDE_COPIES[side](token0.symbol, token1.symbol)}</Badge>
        </div>

        <div className="flex items-center gap-sw-md flex-wrap">
          <Amount token={token0} />
          <span className="text-sw-gray-400">·</span>
          <Amount token={token1} />
        </div>

        <div className="flex items-center justify-between gap-sw-md text-sw-body-sm text-sw-gray-400">
          <span className="whitespace-nowrap">
            #{tokenId.toString()}
            {!!createdAt && ` · ${dateFormat.format(createdAt)}`}
          </span>
          <span className="whitespace-nowrap">
            {tickLower} → {tickUpper}
          </span>
        </div>
      </div>
    </Card>
  );
};

export const PositionsList = ({ phase }: { phase: Phase }) => {
  const { data, error, isPending, isFetching, isEvm, address, refetch } =
    useHydrexPositions(phase);

  const [isOpen, setIsOpen] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const canRefresh = isEvm && !!address;
  const rowCount = data?.positions.length ?? 0;

  // Only the populated list scrolls; the hint and error states are a line tall.
  const scrolls = isOpen && canRefresh && !error && rowCount > 0;
  const maxHeight = useAvailableHeight(listRef, scrolls, [rowCount, isPending]);

  const body = () => {
    if (!address) {
      return <Hint>Connect a wallet to see the positions you own</Hint>;
    }

    if (!isEvm) {
      return (
        <Hint>
          Hydrex positions live on Base — connect an EVM wallet to see them
        </Hint>
      );
    }

    if (error) {
      return (
        <Banner
          hasBg
          multiline
          variant="error"
          message={`Could not load positions — ${error.message}`}
        />
      );
    }

    if (isPending) {
      return (
        <div className="flex flex-col gap-sw-md">
          <div className="h-[86px] w-full animate-pulse rounded-sw-lg bg-sw-gray-900" />
          <div className="h-[86px] w-full animate-pulse rounded-sw-lg bg-sw-gray-900" />
        </div>
      );
    }

    if (rowCount === 0) {
      return <Hint>No open positions yet. Deposit above to mint one.</Hint>;
    }

    return (
      <>
        <ul className="flex flex-col gap-sw-md">
          {data.positions.map((position) => (
            <PositionRow
              key={position.tokenId.toString()}
              position={position}
            />
          ))}
        </ul>

        {/* Enumeration is capped, so say so rather than quietly showing a subset. */}
        {data.isTruncated && (
          <Hint>
            Showing the first {rowCount} of {data.ownedCount} positions
          </Hint>
        )}
      </>
    );
  };

  return (
    // Matches WidgetContainer's own width so the section lines up under the card
    // rather than spanning the page.
    <section className="flex flex-col w-full mx-auto max-w-[456px] gap-sw-lg mt-sw-4xl">
      <div className="flex items-center justify-between gap-sw-lg px-sw-md">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className="flex items-center gap-sw-sm cursor-pointer text-sw-gray-100 h-[36px]">
          <h2 className="text-sw-label-lg">Your Hydrex positions</h2>
          {rowCount > 0 && (
            <span className="text-sw-body-sm text-sw-gray-400">{rowCount}</span>
          )}
          <Chevron isOpen={isOpen} />
        </button>

        {isOpen && canRefresh && (
          <button
            type="button"
            title="Refresh"
            aria-label="Refresh positions"
            disabled={isFetching}
            onClick={() => {
              void refetch();
            }}
            className={cn(
              'p-sw-sm rounded-sw-sm text-sw-gray-400 transition-colors',
              'hover:text-sw-gray-100 hover:bg-sw-gray-800',
              { 'cursor-default': isFetching },
            )}>
            <RefreshIcon isSpinning={isFetching} />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
          // The measured height keeps the list inside the window; without it the
          // page itself would grow and scroll behind the deposit card.
          style={scrolls ? { maxHeight } : undefined}
          className={cn('flex flex-col gap-sw-md', {
            // pr leaves room for the scrollbar so rows don't sit under it.
            'overflow-y-auto pr-sw-xs': scrolls,
          })}>
          {body()}
        </div>
      )}
    </section>
  );
};
