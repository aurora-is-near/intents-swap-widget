import { useContext } from 'react';

import { IntentsConnectError } from '@/errors';
import type { ResourceStatus } from '@/resource';
import type { Execution, ExecutionStatus } from '@/types/execution';
import { IntentsAccountContext } from '@/react/accountContext';
import { useIntentsConnect } from '@/react/context';
import { useResourceKey } from '@/react/useResourceKey';

export type UseWalletExecutionsOptions = {
  /**
   * Another wallet's executions than the provider wallet's: its address, as
   * its connector reports it (`getAddress()`), which runs are filed under.
   */
  address?: string;
  /** Only these statuses, e.g. `IN_FLIGHT_STATUSES`. All when unset. */
  status?: ExecutionStatus | readonly ExecutionStatus[];
  /** Milliseconds; `0` disables polling. Defaults to 30_000. */
  refreshIntervalMs?: number;
};

export type UseWalletExecutionsResult = {
  /** Newest first. Empty while loading and without a wallet. */
  executions: readonly Execution[];
  status: ResourceStatus;
  error?: Error;
  refresh: () => Promise<unknown>;
};

const EMPTY: readonly Execution[] = Object.freeze([]);

/**
 * The provider wallet's executions (or `address`'s), from `listExecutions`:
 * shared at provider level, so hooks asking for the same wallet and
 * statuses share one request. Needs no `intentsApi`.
 *
 * With `IN_FLIGHT_STATUSES` it finds the execution holding the wallet's
 * lock, to resume (`exec.resume(id)`) or cancel after a reload.
 */
export const useWalletExecutions = ({
  address: other,
  status,
  refreshIntervalMs = 30_000,
}: UseWalletExecutionsOptions = {}): UseWalletExecutionsResult => {
  const stores = useContext(IntentsAccountContext);
  const { wallet } = useIntentsConnect();

  if (!stores) {
    throw new IntentsConnectError(
      'useWalletExecutions must be used inside an <IntentsConnectProvider>',
    );
  }

  const address = other ?? wallet?.getAddress();
  const statuses = status === undefined ? [] : [status].flat().sort();
  const key = address ? JSON.stringify([address, statuses]) : undefined;

  const { snapshot, refresh } = useResourceKey(
    stores.walletExecutions,
    key,
    refreshIntervalMs,
  );

  return {
    executions: (snapshot.data as readonly Execution[] | undefined) ?? EMPTY,
    status: snapshot.status,
    error: snapshot.error,
    refresh,
  };
};
