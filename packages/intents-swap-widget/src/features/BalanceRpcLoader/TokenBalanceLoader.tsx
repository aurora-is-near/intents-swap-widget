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
  rpcs,
  token,
  onBalancesLoaded,
}: Omit<Props, 'connectedWallets'>) => {
  useEffect(() => {
    if (token.isIntent || !Object.keys(rpcs).includes(token.blockchain)) {
      return;
    }

    onBalancesLoaded({ [getTokenBalanceKey(token)]: '0' });
    // eslint-disable-next-line
  }, [token.assetId]);

  return null;
};

const TokenBalanceBaseLoader = memo(
  ({ rpcs, token, connectedWallets, onBalancesLoaded }: Props) => {
    const { data: balance } = useTokenBalanceRpc({
      rpcs,
      token,
      connectedWallets,
    });

    const lastSent = useRef<string | null>(null);

    useEffect(() => {
      if (token.isIntent || balance == null) {
        return;
      }

      // A unique key to avoid firing onBalancesLoaded with duplicate balances
      const key = `${getTokenBalanceKey(token)}:${balance}`;

      if (lastSent.current === key) {
        return;
      }

      lastSent.current = key;
      onBalancesLoaded({ [getTokenBalanceKey(token)]: balance });
    }, [token, balance, onBalancesLoaded]);

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
