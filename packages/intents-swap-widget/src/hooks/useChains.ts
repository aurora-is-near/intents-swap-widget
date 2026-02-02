import { useMemo } from 'react';

import { useTokens } from './useTokens';
import { isAllowedChain } from '../utils/chains/isAllowedChain';
import { useConfig } from '@/config';
import { CHAINS_LIST, DEFAULT_CHAINS_ORDER } from '@/constants/chains';
import type { Chain, Chains } from '@/types/chain';

function sortChains(items: Chain[], chainsOrder: ReadonlyArray<Chains>) {
  // Sort by any custom `chainsOrder` first, falling back to the default order
  // for any chains not specified there.
  const order = Array.from(
    new Set([...(chainsOrder ?? []), ...DEFAULT_CHAINS_ORDER]),
  );

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
      return isAllowedChain({
        chainId: chain.id,
        variant,
        allowedChainsList,
        allowedSourceChainsList,
        allowedTargetChainsList,
      });
    });

    return sortChains(chainsFromTokens, chainsOrder);
  }, [tokens, chainsOrder, allowedChainsList]);
};
