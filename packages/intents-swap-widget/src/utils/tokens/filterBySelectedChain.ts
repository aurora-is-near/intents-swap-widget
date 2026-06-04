import type { Chains, ChainsFilter } from '@/types/chain';
import type { Token, TokenBalances } from '@/types/token';
import { getTokenBalanceKey } from '../intents/getTokenBalanceKey';
import { showEveryTargetIntentBalances } from '../checkers/showEveryTargetIntentBalances';

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

  // Read the URL flag once per filter creation (not per token).
  const includeHeldIntentBalances = showEveryTargetIntentBalances();

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
      if (uniqueIntentTokenIds.includes(token.assetId)) {
        return true;
      }

      // Behind the ?showEveryTargetIntentBalances=1 flag: also surface tokens the
      // user already holds on another chain (e.g. ZEC on Zcash) so their balances
      // appear in the target list too — not only in the source list, which uses
      // the 'with-balance' filter above. Without this, the dedupe picks the
      // on-Near representative (zero balance) and the user's actual balance on the
      // other chain is hidden on the target side.
      if (includeHeldIntentBalances) {
        const balance = intentBalances[getTokenBalanceKey(token)];

        return !!balance && balance !== '0';
      }

      return false;
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
