import { getTokenBalanceKey } from '../intents/getTokenBalanceKey';
import type { Chains, ChainsFilter } from '@/types/chain';
import type { Token, TokenBalances } from '@/types/token';

type Options = {
  search: string;
  selectedChain: Chains | 'all' | 'intents';
  chainsFilter: ChainsFilter;
  supportedChains: ReadonlyArray<Chains>;
  intentBalances: TokenBalances;
  uniqueIntentTokenIds: string[];
};

export const createFilterBySelectedChain = (options: Options) => {
  const {
    chainsFilter,
    selectedChain,
    intentBalances,
    supportedChains,
    uniqueIntentTokenIds,
  } = options;

  return (token: Token) => {
    if (
      token.isIntent &&
      (chainsFilter.intents === 'none' ||
        !['all', 'intents'].includes(selectedChain))
    ) {
      return false;
    }

    if (!token.isIntent && chainsFilter.external === 'none') {
      return false;
    }

    if (token.isIntent && chainsFilter.intents === 'with-balance') {
      const balance = intentBalances[getTokenBalanceKey(token)];

      return !!balance && balance !== '0';
    }

    if (token.isIntent && ['all', 'intents'].includes(selectedChain)) {
      return uniqueIntentTokenIds.includes(token.assetId);
    }

    if (selectedChain === 'all') {
      if (
        !token.isIntent &&
        chainsFilter.external === 'wallet-supported' &&
        !supportedChains.includes(token.blockchain)
      ) {
        return false;
      }

      if (!token.isIntent && chainsFilter.external === 'all') {
        return true;
      }

      return true;
    }

    return token.blockchain === selectedChain;
  };
};
