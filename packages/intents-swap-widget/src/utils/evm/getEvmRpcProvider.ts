import { JsonRpcProvider } from 'ethers';

const providersByUrl = new Map<string, JsonRpcProvider>();

export const getEvmRpcProvider = (rpcUrl: string): JsonRpcProvider => {
  const cachedProvider = providersByUrl.get(rpcUrl);

  if (cachedProvider) {
    return cachedProvider;
  }

  // Some public RPCs (including dRPC's free tier) reject batches larger than
  // three. A shared provider can otherwise batch one balance call per token up
  // to Ethers' default limit of 100.
  const provider = new JsonRpcProvider(rpcUrl, undefined, {
    batchMaxCount: 3,
  });

  providersByUrl.set(rpcUrl, provider);

  return provider;
};

/** Clear shared providers when disposing the integration or resetting tests. */
export const clearEvmRpcProviderCache = () => {
  providersByUrl.forEach((provider) => provider.destroy());
  providersByUrl.clear();
};
