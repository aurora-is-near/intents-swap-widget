import { z } from 'zod';
import { type QueryClient, queryOptions } from '@tanstack/react-query';

import { logger } from '@/logger';
import { feeServiceApi } from '@/network';

// Shield also blocks individual addresses, which say nothing about a swap.
const INCIDENT_SCOPE_TYPES = ['chain', 'chain_all', 'token'] as const;

const scopeSchema = z.object({
  scopeType: z.enum(INCIDENT_SCOPE_TYPES),
  scopeValue: z.string(),
});

const incidentSchema = scopeSchema.extend({
  direction: z.string().nullish(),
});

// Read apart from the scope, so an incident without these fields still counts.
const incidentStateSchema = z.object({
  status: z.string().nullish(),
  resolvedAt: z.string().nullish(),
});

const maintenanceSchema = z.object({
  direction: z.string().nullish(),
  scopes: z.array(z.unknown()),
});

// `incidents` only comes with `status: 'incidents'`, and an older fee service
// may not send `maintenance` at all.
const responseSchema = z.object({
  incidents: z.array(z.unknown()).optional(),
  maintenance: z.array(z.unknown()).optional(),
});

/**
 * A paused network or token. `scopeValue` is a chain name (`eth`, `sol`, ...)
 * for chain scopes and an asset ID for token scopes; `*` covers them all.
 * A `deposit` or `withdraw` direction pauses one way, anything else both.
 */
export type IncidentScope = z.infer<typeof incidentSchema>;

const isResolved = (raw: unknown) => {
  const state = incidentStateSchema.safeParse(raw);

  return (
    state.success &&
    (!!state.data.resolvedAt || state.data.status === 'resolved')
  );
};

const parseIncident = (raw: unknown): IncidentScope[] => {
  if (isResolved(raw)) {
    return [];
  }

  const result = incidentSchema.safeParse(raw);

  return result.success ? [result.data] : [];
};

// A maintenance window pauses each of its scopes in its own direction.
const parseMaintenance = (raw: unknown): IncidentScope[] => {
  const result = maintenanceSchema.safeParse(raw);

  if (!result.success) {
    return [];
  }

  return result.data.scopes.flatMap((scope) => {
    const parsed = scopeSchema.safeParse(scope);

    return parsed.success
      ? [{ ...parsed.data, direction: result.data.direction }]
      : [];
  });
};

export const FEE_SERVICE_INCIDENTS_QUERY_KEY = 'fee-service-incidents';

/**
 * Ongoing incidents and maintenance, flattened into paused scopes. A malformed
 * response reads as none. A failed request throws, so it isn't cached as "no
 * incidents" and the next failed quote asks again.
 */
export const fetchFeeServiceIncidents = async (
  apiKey?: string,
): Promise<IncidentScope[]> => {
  // The fee service doesn't check the key, and a widget on a custom
  // `fetchQuote` may have none.
  const key = apiKey === undefined || apiKey === '' ? 'widget' : apiKey;

  let data: unknown;

  try {
    ({ data } = await feeServiceApi.get<unknown>(`/api/incidents/${key}`));
  } catch (error) {
    logger.warn('[WIDGET] Failed to load chain incidents', error);
    throw error;
  }

  const parsed = responseSchema.safeParse(data);

  if (!parsed.success) {
    return [];
  }

  return [
    ...(parsed.data.incidents ?? []).flatMap(parseIncident),
    ...(parsed.data.maintenance ?? []).flatMap(parseMaintenance),
  ];
};

// Incidents change while the widget stays open, so they're only trusted for a
// minute. Nothing polls them: a failed quote asks again once they're older.
export const INCIDENTS_STALE_TIME_MS = 60_000;

export const chainIncidentsQueryOptions = (apiKey?: string) =>
  queryOptions({
    queryKey: [FEE_SERVICE_INCIDENTS_QUERY_KEY, apiKey],
    queryFn: () => fetchFeeServiceIncidents(apiKey),
    staleTime: INCIDENTS_STALE_TIME_MS,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

// How long a failed quote waits on incidents before showing its own error.
export const INCIDENTS_WAIT_MS = 3_000;

/**
 * Incidents that may explain a failed quote: the cached ones while fresh,
 * otherwise fetched again. A failed or slow request reads as none, since
 * incidents only ever explain a failure and must never hold one up for long.
 */
export const getChainIncidents = async (
  queryClient: QueryClient,
  apiKey?: string,
): Promise<IncidentScope[]> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<IncidentScope[]>((resolve) => {
    timeoutId = setTimeout(() => resolve([]), INCIDENTS_WAIT_MS);
  });

  try {
    return await Promise.race([
      queryClient.fetchQuery(chainIncidentsQueryOptions(apiKey)),
      timeout,
    ]);
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
};
