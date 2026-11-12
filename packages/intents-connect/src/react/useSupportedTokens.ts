import { useContext } from 'react';

import type { SupportedToken, SupportedTokensFlow } from '@/api/types';
import { IntentsConnectError } from '@/errors';
import type { ResourceStatus } from '@/resource';
import { IntentsAccountContext } from '@/react/accountContext';
import { useResourceKey } from '@/react/useResourceKey';

export type UseSupportedTokensOptions = {
  /** `outOperation` swaps the lists for EVM-origin out-operations. */
  flow?: SupportedTokensFlow;
  /** Milliseconds; `0` disables polling. Defaults to 10 minutes. */
  refreshIntervalMs?: number;
};

export type UseSupportedTokensResult = {
  /** Tokens an execution can start from: what the user can pay with (`in`). */
  origins: readonly SupportedToken[];
  /** Tokens an execution can deliver: a recipe's destination (`out`). */
  destinations: readonly SupportedToken[];
  status: ResourceStatus;
  error?: Error;
  refresh: () => Promise<unknown>;
};

const EMPTY: readonly SupportedToken[] = Object.freeze([]);

/**
 * The tokens Intents Connect routes, from `listSupportedTokens`: fetched once
 * per provider and flow, and shared by every hook asking. Needs no wallet and
 * no `intentsApi`.
 */
export const useSupportedTokens = ({
  flow = 'inOperation',
  refreshIntervalMs = 10 * 60_000,
}: UseSupportedTokensOptions = {}): UseSupportedTokensResult => {
  const stores = useContext(IntentsAccountContext);

  if (!stores) {
    throw new IntentsConnectError(
      'useSupportedTokens must be used inside an <IntentsConnectProvider>',
    );
  }

  const { snapshot, refresh } = useResourceKey(
    stores.supportedTokens,
    flow,
    refreshIntervalMs,
  );

  return {
    origins: snapshot.data?.in ?? EMPTY,
    destinations: snapshot.data?.out ?? EMPTY,
    status: snapshot.status,
    error: snapshot.error,
    refresh,
  };
};
