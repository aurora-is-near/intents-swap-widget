import { JsonRpcProvider } from 'near-api-js/lib/providers';
import { snapshot } from 'valtio';

import { configStore } from '@/config';
import { getIntentsApiBaseUrl } from '@/network';
import { nearFailoverRpcProvider } from './nearFailoverRpcProvider';

export { nearFailoverRpcProvider } from './nearFailoverRpcProvider';

// Public NEAR RPCs used as failover behind the rate-limited fee-service proxy.
const PUBLIC_NEAR_RPC_URLS = ['https://rpc.mainnet.near.org'];

export const nearProxyRpcUrl = (
  apiKey: string | undefined,
): string | undefined => {
  if (!apiKey) {
    return undefined;
  }

  return `${getIntentsApiBaseUrl()}/rpc/${apiKey}`;
};

export const buildNearRpcUrls = (
  apiKey: string | undefined,
  fallbacks: string[],
): string[] => {
  const proxyUrl = nearProxyRpcUrl(apiKey);

  return proxyUrl ? [proxyUrl, ...fallbacks] : fallbacks;
};

// The clients depend on the configured API key and environment, which are only
// known at runtime, so cache them by their complete ordered URL list.
let failoverCache: { urlsKey: string; client: JsonRpcProvider } | undefined;

let singleCache: { urlsKey: string; client: JsonRpcProvider } | undefined;

export const getNearRpcClient = (): JsonRpcProvider => {
  const { apiKey } = snapshot(configStore).config;
  const urls = buildNearRpcUrls(apiKey, PUBLIC_NEAR_RPC_URLS);
  const urlsKey = JSON.stringify(urls);

  if (!failoverCache || failoverCache.urlsKey !== urlsKey) {
    failoverCache = {
      urlsKey,
      client: nearFailoverRpcProvider({ urls }),
    };
  }

  return failoverCache.client;
};

// Single RPC for precise error messages (failover loses original errors)
export const getNearSingleRpcClient = (): JsonRpcProvider => {
  const { apiKey } = snapshot(configStore).config;
  const urls = buildNearRpcUrls(apiKey, PUBLIC_NEAR_RPC_URLS);
  const urlsKey = JSON.stringify(urls);

  if (!singleCache || singleCache.urlsKey !== urlsKey) {
    singleCache = {
      urlsKey,
      client: new JsonRpcProvider({
        url: urls[0] as string,
      }),
    };
  }

  return singleCache.client;
};
