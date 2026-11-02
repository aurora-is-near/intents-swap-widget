import type { IntentsApi } from '@/intentsApi/types';
import { DEFAULT_NEAR_RPC_URLS } from '@/near/rpc';

/**
 * Endpoints for ownership-proof calls (`current_salt`, `simulate_intents`,
 * `has_public_key`): the intents-api proxy first, public RPCs as fallback.
 * These are rare, user-initiated calls, so spending the proxy's per-key rate
 * limit on them is fine.
 */
export const proofRpcUrls = (
  intentsApi?: Pick<IntentsApi, 'nearRpcUrl'>,
  custom?: readonly string[],
): string[] => [
  ...(intentsApi ? [intentsApi.nearRpcUrl] : []),
  ...(custom ?? DEFAULT_NEAR_RPC_URLS),
];

/**
 * Endpoints for balance reads, which poll: public RPCs first and the proxy
 * last. The proxy's limit (100 per 10 s, 2000 per hour) is shared by every
 * user of an API key, so polling through it would starve the whole
 * integration.
 */
export const balanceRpcUrls = (
  intentsApi?: Pick<IntentsApi, 'nearRpcUrl'>,
  custom?: readonly string[],
): string[] => [
  ...(custom ?? DEFAULT_NEAR_RPC_URLS),
  ...(intentsApi ? [intentsApi.nearRpcUrl] : []),
];
