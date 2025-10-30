import { providers } from 'near-api-js';
import { type JsonRpcProvider } from 'near-api-js/lib/providers';

const reserveNearRpcUrls = [
  'https://relmn.aurora.dev',
  'https://free.rpc.fastnear.com',
  'https://rpc.mainnet.near.org',
];

function createNearFailoverRpcProvider({
  providersList,
}: {
  providersList: JsonRpcProvider[];
}) {
  return new providers.FailoverRpcProvider(providersList);
}

/**
 * @note This function is specifically designed for NEAR RPC providers and should not be used with other blockchain networks.
 * It creates a failover provider that will automatically switch between the provided RPC endpoints if one fails.
 */
export function nearFailoverRpcProvider({ urls }: { urls: string[] }) {
  const providersList = urls.map(
    (url) => new providers.JsonRpcProvider({ url }),
  );

  return createNearFailoverRpcProvider({ providersList });
}

export const nearRpcClient = nearFailoverRpcProvider({
  urls: reserveNearRpcUrls,
});
