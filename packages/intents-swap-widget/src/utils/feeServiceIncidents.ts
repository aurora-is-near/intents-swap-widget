import { z } from 'zod';
import { queryOptions } from '@tanstack/react-query';

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
 * `deposit` or `withdraw` pauses one way, anything else both.
 */
export type IncidentScope = z.infer<typeof incidentSchema>;

const parseIncident = (raw: unknown): IncidentScope[] => {
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
 * Ongoing incidents and maintenance, flattened into paused scopes. A failed
 * or malformed response reads as none: incidents only ever explain a failure,
 * they must never cause one.
 */
export const fetchFeeServiceIncidents = async (
  apiKey?: string,
): Promise<IncidentScope[]> => {
  try {
    // The fee service doesn't check the key, and a widget on a custom
    // `fetchQuote` may have none.
    const key = apiKey === undefined || apiKey === '' ? 'widget' : apiKey;
    const response = await feeServiceApi.get<unknown>(`/api/incidents/${key}`);

    const parsed = responseSchema.safeParse(response.data);

    if (!parsed.success) {
      return [];
    }

    return [
      ...(parsed.data.incidents ?? []).flatMap(parseIncident),
      ...(parsed.data.maintenance ?? []).flatMap(parseMaintenance),
    ];
  } catch (error) {
    logger.warn('[WIDGET] Failed to load chain incidents', error);

    return [];
  }
};

// Loaded once when the widget mounts and never refetched.
export const chainIncidentsQueryOptions = (apiKey?: string) =>
  queryOptions({
    queryKey: [FEE_SERVICE_INCIDENTS_QUERY_KEY, apiKey],
    queryFn: () => fetchFeeServiceIncidents(apiKey),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
