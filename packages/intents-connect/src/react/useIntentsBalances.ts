import { useMemo } from 'react';
import type { IntentsAccountBalance } from '@/intentsApi/types';
import type { ResourceStatus } from '@/resource';
import { useIntentsAccountContext } from '@/react/accountContext';
import { useIntentsAccount } from '@/react/useIntentsAccount';
import { useResourceKey } from '@/react/useResourceKey';

export type UseIntentsBalancesResult = {
  /** Smallest-unit balances by token id (e.g. `nep141:wrap.near`). */
  balances: Readonly<Record<string, string>>;
  /** Non-zero balances with symbol and decimals where known. */
  entries: readonly IntentsAccountBalance[];
  /** NEAR block height the balances were read at. */
  blockHeight?: number;
  status: ResourceStatus;
  error?: Error;
  refresh: () => Promise<unknown>;
};

const EMPTY_ENTRIES: readonly IntentsAccountBalance[] = Object.freeze([]);

/**
 * Public balances of the wallet's intents account on `intents.near` — every
 * non-zero token, read by the intents API.
 */
export const useIntentsBalances = ({
  refreshIntervalMs = 60_000,
}: { refreshIntervalMs?: number } = {}): UseIntentsBalancesResult => {
  const { intentsBalances } = useIntentsAccountContext();
  const { intentsAccountId } = useIntentsAccount();
  const { snapshot, refresh } = useResourceKey(
    intentsBalances,
    intentsAccountId,
    refreshIntervalMs,
  );

  const entries = snapshot.data?.balances ?? EMPTY_ENTRIES;
  // Stable while the data is: callers put it in effect dependencies.
  const balances = useMemo(
    () =>
      Object.fromEntries(entries.map((entry) => [entry.tokenId, entry.amount])),
    [entries],
  );

  return {
    balances,
    entries,
    blockHeight: snapshot.data?.blockHeight,
    status: snapshot.status,
    error: snapshot.error,
    refresh,
  };
};
