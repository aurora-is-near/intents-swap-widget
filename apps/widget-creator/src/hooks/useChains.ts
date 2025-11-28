import { useTokens } from './useTokens';
import { CHAINS_LIST } from '../config';

export function useChains() {
  const tokens = useTokens();

  const chainsFromTokens = Array.from(
    new Set(
      tokens
        .map(
          (token) => CHAINS_LIST[token.blockchain as keyof typeof CHAINS_LIST],
        )
        .filter((chain) => chain),
    ),
  );

  return chainsFromTokens;
}
