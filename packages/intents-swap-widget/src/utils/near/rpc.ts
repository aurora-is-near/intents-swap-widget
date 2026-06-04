import {
  FailoverRpcProvider,
  JsonRpcProvider,
} from 'near-api-js/lib/providers';
import { snapshot } from 'valtio';

import { configStore } from '@/config';

const FEE_SERVICE_RPC_BASE = 'https://intents-api.aurora.dev/rpc';

// Public NEAR RPCs used as failover behind the rate-limited fee-service proxy.
const PUBLIC_NEAR_RPC_URLS = ['https://rpc.mainnet.near.org'];

export const nearProxyRpcUrl = (
  apiKey: string | undefined,
): string | undefined =>
  apiKey ? `${FEE_SERVICE_RPC_BASE}/${apiKey}` : undefined;

export const buildNearRpcUrls = (
  apiKey: string | undefined,
  fallbacks: string[],
): string[] => {
  const proxyUrl = nearProxyRpcUrl(apiKey);

  return proxyUrl ? [proxyUrl, ...fallbacks] : fallbacks;
};

function createNearFailoverRpcProvider({
  providersList,
}: {
  providersList: JsonRpcProvider[];
}) {
  return new FailoverRpcProvider(providersList);
}

/**
 * @note This function is specifically designed for NEAR RPC providers and should not be used with other blockchain networks.
 * It creates a failover provider that will automatically switch between the provided RPC endpoints if one fails.
 */
export function nearFailoverRpcProvider({ urls }: { urls: string[] }) {
  const providersList = urls.map((url) => new JsonRpcProvider({ url }));

  return createNearFailoverRpcProvider({ providersList });
}

// The clients depend on the configured API key, which is only known at runtime,
// so they are built lazily and rebuilt whenever the key changes.
let failoverCache:
  | { apiKey: string | undefined; client: FailoverRpcProvider }
  | undefined;

let singleCache:
  | { apiKey: string | undefined; client: JsonRpcProvider }
  | undefined;

export const getNearRpcClient = (): FailoverRpcProvider => {
  const { apiKey } = snapshot(configStore).config;

  if (!failoverCache || failoverCache.apiKey !== apiKey) {
    failoverCache = {
      apiKey,
      client: nearFailoverRpcProvider({
        urls: buildNearRpcUrls(apiKey, PUBLIC_NEAR_RPC_URLS),
      }),
    };
  }

  return failoverCache.client;
};

// Single RPC for precise error messages (failover loses original errors)
export const getNearSingleRpcClient = (): JsonRpcProvider => {
  const { apiKey } = snapshot(configStore).config;

  if (!singleCache || singleCache.apiKey !== apiKey) {
    singleCache = {
      apiKey,
      client: new JsonRpcProvider({
        url: buildNearRpcUrls(apiKey, PUBLIC_NEAR_RPC_URLS)[0] as string,
      }),
    };
  }

  return singleCache.client;
};
