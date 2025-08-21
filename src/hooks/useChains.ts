import { useMemo } from 'react';

import { CHAINS_LIST } from '@/constants/chains';

import { useTokens } from './useTokens';

export const useChains = () => {
  const { tokens } = useTokens();

  return useMemo(
    () =>
      Array.from(new Set(tokens.map((token) => CHAINS_LIST[token.blockchain]))),
    [tokens],
  );
};
