import { useChains } from './useChains';
import { useTokens } from './useTokens';
import { useMergedBalance } from './useMergedBalance';
import { useIntentsBalance } from './useIntentsBalance';
import { useTokensIntentsUnique } from './useTokensIntentsUnique';
import { createTokenSorter } from '@/utils/tokens/sort';
import { createFilterByIntents } from '@/utils/tokens/filterByIntents';
import { createFilterBySearch } from '@/utils/tokens/filterBySearchString';
import { createFilterBySelectedChain } from '@/utils/tokens/filterBySelectedChain';
import type { Chains, ChainsFilter } from '@/types/chain';

export type TokensFilterOptions = {
  variant: 'source' | 'target';
  search: string;
  selectedChain: Chains | 'all' | 'intents';
  chainsFilter: ChainsFilter;
  walletSupportedChains: ReadonlyArray<Chains>;
};

// TODO: memoize
export const useTokensFiltered = ({
  variant,
  search,
  selectedChain,
  chainsFilter,
  walletSupportedChains,
}: TokensFilterOptions) => {
  const chains = useChains(variant);
  const { tokens } = useTokens(variant);
  const { mergedBalance } = useMergedBalance();
  const { intentBalances } = useIntentsBalance();
  const { uniqueIntentsTokens } = useTokensIntentsUnique();

  const sorter = createTokenSorter(
    mergedBalance,
    walletSupportedChains,
    search,
  );

  const filteredTokens = tokens
    .filter(createFilterBySearch({ search, chains }))
    .filter(
      createFilterBySelectedChain({
        search,
        selectedChain,
        chainsFilter,
        walletSupportedChains,
        intentBalances,
        uniqueIntentTokenIds: uniqueIntentsTokens.map((t) => t.assetId),
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
