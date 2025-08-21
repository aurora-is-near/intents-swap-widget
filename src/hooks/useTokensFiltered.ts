import { createTokenSorter } from '@/utils/tokens/sort';
import { createFilterByIntents } from '@/utils/tokens/filterByIntents';
import { createFilterBySearch } from '@/utils/tokens/filterBySearchString';
import { createFilterBySelectedChain } from '@/utils/tokens/filterBySelectedChain';
import type { Chains, DefaultChainsFilter } from '@/types/chain';

import { useChains } from './useChains';
import { useTokens } from './useTokens';
import { useMergedBalance } from './useMergedBalance';
import { useIntentsBalance } from './useIntentsBalance';

export type TokensFilterOptions = {
  search: string;
  selectedChain: Chains | 'all' | 'calyx';
  chainsFilter: DefaultChainsFilter;
  walletSupportedChains: ReadonlyArray<Chains>;
};

// TODO: memoize
export const useTokensFiltered = (options: TokensFilterOptions) => {
  const chains = useChains();
  const { tokens } = useTokens();
  const { mergedBalance } = useMergedBalance();
  const { intentBalances } = useIntentsBalance();

  const sorter = createTokenSorter(
    mergedBalance,
    options.walletSupportedChains,
  );

  const filteredTokens = tokens
    .filter(createFilterBySearch({ ...options, chains }))
    .filter(
      createFilterBySelectedChain({
        ...options,
        intentBalances,
      }),
    );

  return {
    all: filteredTokens.sort(sorter),
    intents: filteredTokens
      .filter(createFilterByIntents({ isIntent: true }))
      .sort(sorter),
    wallet: filteredTokens
      .filter(createFilterByIntents({ isIntent: false }))
      .sort(sorter),
  };
};
