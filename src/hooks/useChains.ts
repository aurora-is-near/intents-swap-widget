import { useMemo } from 'react';

import { useConfig } from '@/config';
import { CHAINS_LIST } from '@/constants/chains';

import { useTokens } from './useTokens';

export const useChains = () => {
  const { filterChains } = useConfig();
  const { tokens } = useTokens();

  return useMemo(
    () =>
      Array.from(
        new Set(tokens.map((token) => CHAINS_LIST[token.blockchain])),
      ).filter(filterChains),
    [tokens, filterChains],
  );
};
