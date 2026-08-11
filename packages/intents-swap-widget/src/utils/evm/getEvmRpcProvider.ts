import { FetchRequest, JsonRpcProvider } from 'ethers';

const RPC_REQUEST_TIMEOUT_MS = 10_000;

const providersByUrl = new Map<string, JsonRpcProvider>();

export const getEvmRpcProvider = (rpcUrl: string): JsonRpcProvider => {
  const cachedProvider = providersByUrl.get(rpcUrl);

  if (cachedProvider) {
    return cachedProvider;
  }

  // Some public RPCs (including dRPC's free tier) reject batches larger than
  // three. A shared provider can otherwise batch one balance call per token up
  // to Ethers' default limit of 100.
  const request = new FetchRequest(rpcUrl);

  request.timeout = RPC_REQUEST_TIMEOUT_MS;

  const provider = new JsonRpcProvider(request, undefined, {
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
