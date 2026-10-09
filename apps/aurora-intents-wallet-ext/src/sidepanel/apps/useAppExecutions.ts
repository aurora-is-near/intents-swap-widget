import { useQuery } from '@tanstack/react-query';

import { IN_FLIGHT_STATUSES } from '@aurora-is-near/intents-connect';
import type { Execution } from '@aurora-is-near/intents-connect';

import { intentsConnectApi } from './api';
import { useAppsRuntime } from './AppsRuntime';

const POLL_MS = 5_000;

export const isInFlight = (execution: Execution) =>
  IN_FLIGHT_STATUSES.includes(execution.status);

/**
 * Every Intents Connect execution of the active wallet account, newest
 * first, polled while one is in flight. Empty where apps aren't available.
 */
export const useAppExecutions = () => {
  const address = useAppsRuntime()?.account.address;

  const query = useQuery({
    queryKey: ['appExecutions', address],
    enabled: !!address,
    queryFn: async () =>
      address
        ? (await intentsConnectApi.listExecutions(address)).sort(
            (a, b) =>
              new Date(b.createdAt ?? 0).getTime() -
              new Date(a.createdAt ?? 0).getTime(),
          )
        : [],
    refetchInterval: (state) =>
      state.state.data?.some(isInFlight) ? POLL_MS : false,
    staleTime: 10_000,
  });

  return { ...query, executions: query.data ?? [] };
};
