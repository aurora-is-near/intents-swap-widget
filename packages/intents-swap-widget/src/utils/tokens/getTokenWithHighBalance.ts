import { notReachable } from '../notReachable';

import { getDefaultIntentsToken } from './getDefaultIntentsToken';
import { createTokenSorter } from './sort';
import type { Chains } from '@/types/chain';
import type { Token, TokenBalances } from '@/types/token';

type Args = {
  balances: TokenBalances;
  tokens: ReadonlyArray<Token>;
  walletSupportedChains: ReadonlyArray<Chains>;
  across: 'all' | 'wallet' | 'intents';
};

export const getTokenWithHighBalance = ({
  across,
  tokens,
  balances,
  walletSupportedChains,
}: Args) => {
  if (Object.keys(balances).length > 0) {
    const intentsTokens = tokens.filter((t) => {
      switch (across) {
        case 'all':
          return true;
        case 'wallet':
          return !t.isIntent;
        case 'intents':
          return t.isIntent;
        default:
          notReachable(across, { throwError: false });

          return true;
      }
    });

    const highestBalanceTkn =
      intentsTokens.sort(
        createTokenSorter(balances, walletSupportedChains),
      )[0] ?? getDefaultIntentsToken({ tokens });

    return highestBalanceTkn;
  }

  return undefined;
};
