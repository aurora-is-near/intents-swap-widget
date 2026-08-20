import { isAlchemySupportedChain } from '@/ext/alchemy/types';
import type { ChainRpcUrls, Chains } from '@/types/chain';

export type ExternalBalanceSource = 'alchemy' | 'rpc' | 'none';

type Args = {
  alchemyApiKey?: string;
  chain: Chains;
  rpcs: ChainRpcUrls;
};

export const getBalanceSourceForChain = ({
  alchemyApiKey,
  chain,
  rpcs,
}: Args): ExternalBalanceSource => {
  if (alchemyApiKey && isAlchemySupportedChain(chain)) {
    return 'alchemy';
  }

  if (rpcs[chain]?.length) {
    return 'rpc';
  }

  return 'none';
};
