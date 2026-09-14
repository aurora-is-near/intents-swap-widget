import { useRef, useState } from 'react';
import {
  Banner,
  Card,
  CopyButton,
  TinyNumber,
} from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';
import type { Phase } from '@aurora-is-near/intents-connect';

import { useAvailableHeight } from '../../shared/hooks/useAvailableHeight';
import { useSolanaBalances } from '../hooks/useSolanaBalances';
import { SOLANA_USDC } from '../constants';

export const BalancesList = ({ phase }: { phase: Phase }) => {
  const { data, error, isPending, isFetching, address, refetch } =
    useSolanaBalances(phase);

  const [isOpen, setIsOpen] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const balances =
    data?.balances.filter(({ amount }) => BigInt(amount) > 0n) ?? [];

  const maxHeight = useAvailableHeight(listRef, isOpen && balances.length > 0, [
    balances.length,
    isPending,
  ]);

  const body = () => {
    if (!address) {
      return <p>Connect a wallet to see its Solana assets</p>;
    }

    if (error) {
      return (
        <Banner
          hasBg
          multiline
          variant="error"
          message={`Could not load balances — ${error.message}`}
        />
      );
    }

    if (isPending) {
      return (
        <div
          className="h-[86px] animate-pulse rounded-sw-lg bg-sw-gray-900"
          aria-label="Loading balances"
        />
      );
    }

    return (
      <>
        {data && (
          <div className="flex items-center justify-between px-sw-md gap-sw-md">
            <a
              href={`https://explorer.solana.com/address/${data.intermediary}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
              title={data.intermediary}>
              Connect account {data.intermediary.slice(0, 6)}…
              {data.intermediary.slice(-4)}
            </a>
            <CopyButton value={data.intermediary} />
          </div>
        )}
        {balances.length === 0 ? (
          <p>No assets yet. Buy a token above to add it here.</p>
        ) : (
          <ul className="flex flex-col gap-sw-md">
            {balances.map((token) => (
              <Card key={token.mint} as="li" padding="none">
                <div className="flex items-center justify-between px-sw-lg py-sw-md gap-sw-lg">
                  <div>
                    <p className="text-sw-label-md text-sw-gray-100">
                      {token.symbol}
                    </p>
                    <p>
                      {token.mint === SOLANA_USDC.mint
                        ? 'Remaining bridge funds'
                        : token.name}
                    </p>
                  </div>
                  <span className="text-sw-label-md text-sw-gray-100">
                    <TinyNumber
                      value={token.amount}
                      decimals={token.decimals}
                    />
                  </span>
                </div>
              </Card>
            ))}
          </ul>
        )}
        <p className="px-sw-md">
          Assets stay in your Connect account. This demo supports buying only.
        </p>
      </>
    );
  };

  return (
    <section className="flex flex-col w-full mx-auto max-w-[456px] gap-sw-lg mt-sw-4xl">
      <div className="flex items-center justify-between gap-sw-lg px-sw-md">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className="flex items-center gap-sw-sm cursor-pointer text-sw-gray-100 h-[36px]">
          <h2 className="text-sw-label-lg">Your Solana assets</h2>
          <span aria-hidden="true">{isOpen ? '⌃' : '⌄'}</span>
        </button>
        {isOpen && !!address && (
          <button
            type="button"
            aria-label="Refresh balances"
            title="Refresh"
            disabled={isFetching}
            onClick={() => {
              void refetch();
            }}
            className="p-sw-sm rounded-sw-sm text-sw-gray-400 hover:text-sw-gray-100 hover:bg-sw-gray-800">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={cn('h-sw-xl w-sw-xl', { 'animate-spin': isFetching })}>
              <path
                d="M20 11.5a8 8 0 1 0-.6 3.5M20 5v6h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
      {isOpen && (
        <div
          ref={listRef}
          style={{ maxHeight }}
          className="flex flex-col gap-sw-md text-sw-body-sm text-sw-gray-400 overflow-y-auto pr-sw-xs">
          {body()}
        </div>
      )}
    </section>
  );
};
