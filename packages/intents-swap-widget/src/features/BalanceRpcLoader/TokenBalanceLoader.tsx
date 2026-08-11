import { memo, useEffect, useRef } from 'react';

import type { Token, TokenBalances } from '@/types/token';
import type { ChainRpcUrls } from '@/types/chain';
import { getTokenBalanceKey } from '@/utils/intents/getTokenBalanceKey';
import { useTokenBalanceRpc } from './useTokenBalanceRpc';
import { WalletAddresses } from '../../types';

type Props = {
  token: Token;
  rpcs: ChainRpcUrls;
  connectedWallets: WalletAddresses;
  onBalancesLoaded: (balances: TokenBalances) => void;
};

const TokenBalanceZeroLoader = ({
  token,
  onBalancesLoaded,
}: Pick<Props, 'token' | 'onBalancesLoaded'>) => {
  useEffect(() => {
    if (token.isIntent) {
      return;
    }

    onBalancesLoaded({ [getTokenBalanceKey(token)]: '0' });
    // eslint-disable-next-line
  }, [token.assetId]);

  return null;
};

const TokenBalanceBaseLoader = memo(
  ({ rpcs, token, connectedWallets, onBalancesLoaded }: Props) => {
    const {
      data: balance,
      isError,
      isFetched,
    } = useTokenBalanceRpc({
      rpcs,
      token,
      connectedWallets,
    });

    const lastSent = useRef<string | null>(null);

    useEffect(() => {
      if (token.isIntent || (balance == null && !isError && !isFetched)) {
        return;
      }

      // A missing result or an exhausted query should settle the UI instead of
      // leaving the token balance skeleton visible forever.
      const settledBalance = balance ?? '0';

      // A unique key to avoid firing onBalancesLoaded with duplicate balances
      const key = `${getTokenBalanceKey(token)}:${settledBalance}`;

      if (lastSent.current === key) {
        return;
      }

      lastSent.current = key;
      onBalancesLoaded({ [getTokenBalanceKey(token)]: settledBalance });
    }, [token, balance, isError, isFetched, onBalancesLoaded]);

    return null;
  },
  (prev, next) =>
    getTokenBalanceKey(prev.token) === getTokenBalanceKey(next.token) &&
    prev.connectedWallets === next.connectedWallets &&
    prev.onBalancesLoaded === next.onBalancesLoaded,
);

TokenBalanceBaseLoader.displayName = 'TokenBalanceLoader';

export const TokenBalanceLoader = Object.assign(TokenBalanceBaseLoader, {
  Zero: TokenBalanceZeroLoader,
});
