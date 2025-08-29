import type { Chains } from '@/types/chain';
import type { Token } from '@/types/token';

type Args = {
  tokens: ReadonlyArray<Token>;
  walletSupportedChains: ReadonlyArray<Chains>;
};

export const getMainTokenByChain = ({
  tokens,
  walletSupportedChains,
}: Args) => {
  if (walletSupportedChains.includes('near')) {
    return (
      tokens.find(
        (t) => !t.isIntent && t.name === 'Near' && t.blockchain === 'near',
      ) ?? tokens[0]
    );
  }

  if (walletSupportedChains.includes('sol')) {
    return (
      tokens.find(
        (t) => !t.isIntent && t.name === 'Solana' && t.blockchain === 'sol',
      ) ?? tokens[0]
    );
  }

  return (
    tokens.find(
      (t) => !t.isIntent && t.name === 'ETH' && t.blockchain === 'eth',
    ) ?? tokens[0]
  );
};
