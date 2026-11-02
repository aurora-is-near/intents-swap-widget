import { useMemo } from 'react';
import { useSnapshot } from 'valtio';

import type { ConfidentialBalance } from '@/intentsApi/types';
import type { ResourceStatus } from '@/resource';
import { useIntentsAccountContext } from '@/react/accountContext';
import { useIntentsAccount } from '@/react/useIntentsAccount';
import { useResourceKey } from '@/react/useResourceKey';

export type UseConfidentialBalancesResult = {
  /** Available smallest-unit balances by token id. */
  balances: Readonly<Record<string, string>>;
  entries: readonly ConfidentialBalance[];
  /** `idle` until the user is authorized (`useIntentsAuth`). */
  status: ResourceStatus;
  error?: Error;
  refresh: () => Promise<unknown>;
};

const EMPTY_ENTRIES: readonly ConfidentialBalance[] = Object.freeze([]);

/**
 * Confidential (private) balances of the authorized user. Reads nothing
 * until `useIntentsAuth().authorize()` has opened a session for the wallet's
 * account; refreshes the session's access token as needed.
 */
export const useConfidentialBalances = ({
  tokenIds,
  refreshIntervalMs = 60_000,
}: {
  /** Limit to these token ids. All non-zero balances when omitted. */
  tokenIds?: readonly string[];
  refreshIntervalMs?: number;
} = {}): UseConfidentialBalancesResult => {
  const { session, confidentialBalances } = useIntentsAccountContext();
  const { intentsAccountId } = useIntentsAccount();
  const sessionSnapshot = useSnapshot(session.state);

  const authorized =
    sessionSnapshot.status === 'authorized' &&
    !!intentsAccountId &&
    sessionSnapshot.intentsAccountId === intentsAccountId;

  const key = authorized
    ? `${intentsAccountId}|${[...(tokenIds ?? [])].sort().join(',')}`
    : undefined;

  const { snapshot, refresh } = useResourceKey(
    confidentialBalances,
    key,
    refreshIntervalMs,
  );

  const entries = snapshot.data?.balances ?? EMPTY_ENTRIES;
  // Stable while the data is: callers put it in effect dependencies.
  const balances = useMemo(
    () =>
      Object.fromEntries(
        entries.map((entry) => [entry.tokenId, entry.available]),
      ),
    [entries],
  );

  return {
    balances,
    entries,
    status: snapshot.status,
    error: snapshot.error,
    refresh,
  };
};
