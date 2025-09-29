import { useMemo } from 'react';

import { useConfig } from '@/config';
import { CHAINS_LIST } from '@/constants/chains';
import type { Chain, Chains } from '@/types/chain';

import { useTokens } from './useTokens';

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

export const useChains = () => {
  const { chainsOrder, allowedChainsList } = useConfig();
  const { tokens } = useTokens();

  return useMemo(() => {
    const chainsFromTokens = Array.from(
      new Set(tokens.map((token) => CHAINS_LIST[token.blockchain])),
    ).filter((chain) =>
      allowedChainsList ? allowedChainsList.includes(chain.id) : true,
    );

    if (chainsOrder) {
      return sortChains(chainsFromTokens, chainsOrder);
    }

    return chainsFromTokens;
  }, [tokens, chainsOrder, allowedChainsList]);
};
