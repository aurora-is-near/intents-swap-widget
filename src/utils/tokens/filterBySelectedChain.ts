import type { Chains, DefaultChainsFilter } from '@/types/chain';
import type { Token, TokenBalances } from '@/types/token';

import { getTokenBalanceKey } from '../intents/getTokenBalanceKey';

type Options = {
  search: string;
  selectedChain: Chains | 'all' | 'intents';
  chainsFilter: DefaultChainsFilter;
  walletSupportedChains: ReadonlyArray<Chains>;
  intentBalances: TokenBalances;
};

export const createFilterBySelectedChain = (options: Options) => {
  const { chainsFilter, selectedChain, intentBalances, walletSupportedChains } =
    options;

  return (token: Token) => {
    if (
      token.isIntent &&
      (chainsFilter.intents === 'none' ||
        !['all', 'intents'].includes(selectedChain))
    ) {
      return false;
    }

    if (token.isIntent && chainsFilter.intents === 'with-balance') {
      const balance = intentBalances[getTokenBalanceKey(token)];

      return !!balance && balance !== '0';
    }

    if (chainsFilter.external === 'all' && selectedChain === 'all') {
      return true;
    }

    if (token.isIntent && ['all', 'intents'].includes(selectedChain)) {
      return true;
    }

    if (selectedChain === 'all') {
      // do not show unsupported chain tokens in ALL list
      if (!walletSupportedChains.includes(token.blockchain)) {
        return false;
      }

      return true;
    }

    return token.blockchain === selectedChain;
  };
};
