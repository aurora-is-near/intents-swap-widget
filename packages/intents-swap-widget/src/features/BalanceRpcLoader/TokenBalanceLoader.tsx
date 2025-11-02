import { memo, useEffect } from 'react';

import { useTokenBalanceRpc } from './useTokenBalanceRpc';
import type { Token, TokenBalances } from '@/types/token';
import type { ChainRpcUrls } from '@/types/chain';

type Props = {
  token: Token;
  rpcs: ChainRpcUrls;
  walletAddress: string | undefined;
  onBalancesLoaded: (balances: TokenBalances) => void;
};

const TokenBalanceZeroLoader = ({
  rpcs,
  token,
  onBalancesLoaded,
}: Omit<Props, 'walletAddress'>) => {
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
  ({ rpcs, token, walletAddress, onBalancesLoaded }: Props) => {
    const { data: balance } = useTokenBalanceRpc({
      rpcs,
      token,
      walletAddress,
    });

    useEffect(() => {
      // != checks for both null and undefined
      if (!token.isIntent && balance != null) {
        onBalancesLoaded({ [token.assetId]: balance });
      }
    }, [token, balance, onBalancesLoaded]);

    return null;
  },
  (prevProps, nextProps) => prevProps.token.assetId === nextProps.token.assetId,
);

TokenBalanceBaseLoader.displayName = 'TokenBalanceLoader';

export const TokenBalanceLoader = Object.assign(TokenBalanceBaseLoader, {
  Zero: TokenBalanceZeroLoader,
});
