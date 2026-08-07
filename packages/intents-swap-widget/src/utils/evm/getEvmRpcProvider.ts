import { JsonRpcProvider } from 'ethers';

const providersByUrl = new Map<string, JsonRpcProvider>();

export const getEvmRpcProvider = (rpcUrl: string): JsonRpcProvider => {
  const cachedProvider = providersByUrl.get(rpcUrl);

  if (cachedProvider) {
    return cachedProvider;
  }

  const provider = new JsonRpcProvider(rpcUrl);

  providersByUrl.set(rpcUrl, provider);

  return provider;
};

/** Clear shared providers when disposing the integration or resetting tests. */
export const clearEvmRpcProviderCache = () => {
  providersByUrl.forEach((provider) => provider.destroy());
  providersByUrl.clear();
};
