import type { AlchemyBalanceItem } from '@/ext/alchemy/types';

const bigIntToHex = (value: string) => {
  const bigIntValue = BigInt(value);
  const hexString = bigIntValue.toString(16);

  return `0x${hexString}`;
};

type Return = {
  data: {
    data: {
      pageKey: string | null;
      tokens: AlchemyBalanceItem[];
    };
  };
};

export const mockAlchemyResponse = (tokens: AlchemyBalanceItem[]): Return => ({
  data: {
    data: {
      pageKey: null,
      tokens: tokens.map(({ tokenAddress, network, tokenBalance }) => ({
        network,
        tokenAddress,
        tokenBalance: bigIntToHex(tokenBalance),
      })),
    },
  },
});
