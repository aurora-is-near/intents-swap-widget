import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

import {
  Badge,
  Banner,
  Card,
  TinyNumber,
} from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';
import type { Phase } from '@aurora-is-near/intents-connect';

import { useAvailableHeight } from '../../shared/hooks/useAvailableHeight';
import { useAavePositions } from '../hooks/useAavePositions';
import type { AavePosition } from '../positions';

const percentFormat = new Intl.NumberFormat(undefined, {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const Hint = ({ children }: { children: ReactNode }) => (
  <p className="text-sw-body-sm text-sw-gray-400 px-sw-md">{children}</p>
);

const PositionRow = ({ position }: { position: AavePosition }) => (
  <Card as="li" padding="none" className="hover:bg-sw-gray-800">
    <div className="px-sw-lg py-sw-md flex flex-col gap-sw-sm">
      <div className="flex items-center justify-between gap-sw-md">
        <span className="text-sw-label-md text-sw-gray-100">
          {position.symbol}
        </span>
        {position.supplied > 0n && (
          <Badge>
            {position.isCollateral ? 'Collateral enabled' : 'Collateral off'}
          </Badge>
        )}
      </div>

      <dl className="flex flex-col gap-sw-xs text-sw-body-sm">
        <div className="flex items-center justify-between gap-sw-md">
          <dt className="text-sw-gray-400">Supplied</dt>
          <dd className="text-sw-label-md text-sw-gray-100">
            <TinyNumber
              value={position.supplied.toString()}
              decimals={position.decimals}
            />{' '}
            {position.symbol}
          </dd>
        </div>
        {position.borrowed > 0n && (
          <div className="flex items-center justify-between gap-sw-md">
            <dt className="text-sw-gray-400">Borrowed</dt>
            <dd className="text-sw-label-md text-sw-gray-100">
              <TinyNumber
                value={position.borrowed.toString()}
                decimals={position.decimals}
              />{' '}
              {position.symbol}
            </dd>
          </div>
        )}
        {position.supplied > 0n && (
          <div className="flex items-center justify-between gap-sw-md">
            <dt className="text-sw-gray-400">Supply APY</dt>
            <dd className="text-sw-gray-200">
              {percentFormat.format(position.supplyApy)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  </Card>
);

export const PositionsList = ({ phase }: { phase: Phase }) => {
  const { data, error, isPending, isFetching, isEvm, address, refetch } =
    useAavePositions(phase);

  const [isOpen, setIsOpen] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const canRefresh = isEvm && !!address;
  const rowCount = data?.length ?? 0;
  const scrolls = isOpen && canRefresh && !error && rowCount > 0;
  const maxHeight = useAvailableHeight(listRef, scrolls, [rowCount, isPending]);

  const body = () => {
    if (!address) {
      return <Hint>Connect a wallet to see your Aave positions on Monad.</Hint>;
    }

    if (!isEvm) {
      return (
        <Hint>Connect an EVM wallet to see your Aave positions on Monad.</Hint>
      );
    }

    if (error) {
      return (
        <Banner
          hasBg
          multiline
          variant="error"
          message={`Could not load Aave positions — ${error.message}`}
        />
      );
    }

    if (isPending) {
      return (
        <div role="status" aria-label="Loading Aave positions">
          <div className="h-[110px] w-full animate-pulse rounded-sw-lg bg-sw-gray-900" />
        </div>
      );
    }

    if (!data?.length) {
      return (
        <Hint>No Aave positions on Monad yet. Supply USDC above to start.</Hint>
      );
    }

    return (
      <>
        <ul className="flex flex-col gap-sw-md">
          {data.map((position) => (
            <PositionRow key={position.asset} position={position} />
          ))}
        </ul>
        <Hint>
          Balances include accrued interest. Supply APY excludes rewards.
        </Hint>
      </>
    );
  };

  return (
    <section className="flex flex-col w-full mx-auto max-w-[456px] gap-sw-lg mt-sw-4xl">
      <div className="flex items-center justify-between gap-sw-md px-sw-md">
        <h2 className="text-sw-label-lg">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls="aave-positions"
            onClick={() => setIsOpen((open) => !open)}
            className="flex items-center gap-sw-sm cursor-pointer text-sw-gray-100 min-h-[36px]">
            Your Aave positions
            {rowCount > 0 && (
              <span className="text-sw-body-sm text-sw-gray-400">
                {rowCount}
              </span>
            )}
            <span aria-hidden="true">{isOpen ? '⌃' : '⌄'}</span>
          </button>
        </h2>

        {isOpen && canRefresh && (
          <button
            type="button"
            aria-label="Refresh Aave positions"
            disabled={isFetching}
            onClick={() => {
              void refetch();
            }}
            className="p-sw-sm rounded-sw-sm text-sw-body-sm text-sw-gray-400 hover:text-sw-gray-100 hover:bg-sw-gray-800 disabled:cursor-default">
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </div>

      <div
        id="aave-positions"
        ref={listRef}
        hidden={!isOpen}
        style={scrolls ? { maxHeight } : undefined}
        className={cn('flex-col gap-sw-md', {
          flex: isOpen,
          'overflow-y-auto pr-sw-xs': scrolls,
        })}>
        {isOpen && body()}
      </div>
    </section>
  );
};
