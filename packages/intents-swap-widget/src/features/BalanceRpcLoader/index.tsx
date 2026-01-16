import { useMemo } from 'react';

import { TokenBalanceLoader } from './TokenBalanceLoader';
import { useAllTokens } from '../../hooks/useAllTokens';
import { useConfig } from '@/config';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { getTokenBalanceKey } from '@/utils/intents/getTokenBalanceKey';
import type { ChainRpcUrls } from '@/types/chain';
import type { Token } from '@/types/token';
import { useConnectedWallets } from '@/hooks/useConnectedWallets';

type Props = {
  rpcs: ChainRpcUrls;
};

const tokensBalancePriority: Record<string, string[]>[] = [
  { eth: ['ETH', 'USDT', 'USDC', 'AURORA'] },
  { near: ['USDT', 'USDC', 'AURORA'] },
  { arb: ['ARB', 'ETH', 'USDT', 'USDC'] },
  { btc: ['BTC'] },
];

const sortTokensByPriority = (tokens: ReadonlyArray<Token>) => {
  return [...tokens].sort((a, b) => {
    const aChainIndex = tokensBalancePriority.findIndex(
      (p) => Object.keys(p)[0] === a.blockchain,
    );

    const bChainIndex = tokensBalancePriority.findIndex(
      (p) => Object.keys(p)[0] === b.blockchain,
    );

    if (aChainIndex !== bChainIndex) {
      if (aChainIndex === -1) {
        return 1;
      }

      if (bChainIndex === -1) {
        return -1;
      }

      return aChainIndex - bChainIndex;
    }

    const chainPriority =
      tokensBalancePriority[aChainIndex]?.[a.blockchain] ?? [];

    const aPriority = chainPriority.indexOf(a.symbol);
    const bPriority = chainPriority.indexOf(b.symbol);

    if (aPriority === -1 && bPriority === -1) {
      return 0;
    }

    if (aPriority === -1) {
      return 1;
    }

    if (bPriority === -1) {
      return -1;
    }

    return aPriority - bPriority;
  });
};

export const BalanceRpcLoader = ({ rpcs }: Props) => {
  const { connectedWallets } = useConnectedWallets();
  const { tokens } = useAllTokens();
  const { walletSupportedChains } = useConfig();
  const { setWalletBalance } = useWalletBalance(connectedWallets);
  const sortedTokens = useMemo(() => sortTokensByPriority(tokens), [tokens]);

  return sortedTokens.map((tkn) => {
    if (walletSupportedChains.includes(tkn.blockchain)) {
      return (
        <TokenBalanceLoader
          rpcs={rpcs}
          token={tkn}
          connectedWallets={connectedWallets}
          key={getTokenBalanceKey(tkn)}
          onBalancesLoaded={(balance) =>
            setWalletBalance(connectedWallets, balance)
          }
        />
      );
    }

    return (
      <TokenBalanceLoader.Zero
        rpcs={rpcs}
        token={tkn}
        key={getTokenBalanceKey(tkn)}
        onBalancesLoaded={(balance) =>
          setWalletBalance(connectedWallets, balance)
        }
      />
    );
  });
};
