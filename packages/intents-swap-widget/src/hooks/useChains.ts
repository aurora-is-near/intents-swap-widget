import { useMemo } from 'react';

import { useTokens } from './useTokens';
import { useConfig } from '@/config';
import { CHAINS_LIST } from '@/constants/chains';
import type { Chain, Chains } from '@/types/chain';

function sortChains(items: Chain[], order: ReadonlyArray<Chains>) {
  const pos = new Map(order.map((id, i) => [id, i]));

  return [...items].sort((a, b) => {
    const ai = pos.has(a.id) ? pos.get(a.id)! : Infinity;
    const bi = pos.has(b.id) ? pos.get(b.id)! : Infinity;

    if (ai !== bi) {
      return ai - bi;
    }

    return a.id.localeCompare(b.id, undefined, { sensitivity: 'base' });
  });
}

export const useChains = (variant: 'source' | 'target') => {
  const {
    chainsOrder,
    allowedChainsList,
    allowedSourceChainsList,
    allowedTargetChainsList,
  } = useConfig();

  const { tokens } = useTokens();

  return useMemo(() => {
    const chainsFromTokens = Array.from(
      new Set(tokens.map((token) => CHAINS_LIST[token.blockchain])),
    ).filter((chain) => {
      if (allowedChainsList && !allowedChainsList.includes(chain.id)) {
        return false;
      }

      if (
        variant === 'source' &&
        allowedSourceChainsList &&
        !allowedSourceChainsList.includes(chain.id)
      ) {
        return false;
      }

      if (
        variant === 'target' &&
        allowedTargetChainsList &&
        !allowedTargetChainsList.includes(chain.id)
      ) {
        return false;
      }

      return true;
    });

    return sortChains(chainsFromTokens, chainsOrder);
  }, [tokens, chainsOrder, allowedChainsList]);
};
