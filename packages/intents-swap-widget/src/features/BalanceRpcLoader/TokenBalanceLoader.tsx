import { memo, useEffect } from 'react';

import { useTokenBalanceRpc } from './useTokenBalanceRpc';
import { WalletAddresses } from '../../types';
import type { Token, TokenBalances } from '@/types/token';
import type { ChainRpcUrls } from '@/types/chain';

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

    onBalancesLoaded({ [token.assetId]: '0' });
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

    useEffect(() => {
      // != checks for both null and undefined
      if (!token.isIntent && balance != null) {
        onBalancesLoaded({ [token.assetId]: balance });
      }
    }, [token, balance, onBalancesLoaded]);

    return null;
  },
  (prev, next) =>
    prev.token.assetId === next.token.assetId &&
    prev.connectedWallets === next.connectedWallets,
);

TokenBalanceBaseLoader.displayName = 'TokenBalanceLoader';

export const TokenBalanceLoader = Object.assign(TokenBalanceBaseLoader, {
  Zero: TokenBalanceZeroLoader,
});
