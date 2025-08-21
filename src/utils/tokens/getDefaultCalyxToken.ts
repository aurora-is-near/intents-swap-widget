import type { Token } from '@/types/token';

type Args = {
  tokens: ReadonlyArray<Token>;
  butNot?: Token;
};

export const getDefaultCalyxToken = ({ tokens, butNot }: Args) => {
  return (
    tokens.find((t) =>
      butNot?.symbol === 'USDT'
        ? t.isIntent && t.symbol === 'ETH'
        : t.isIntent && t.symbol === 'USDT',
    ) ?? tokens[0]
  );
};
