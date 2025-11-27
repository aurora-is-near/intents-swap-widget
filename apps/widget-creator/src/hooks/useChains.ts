import { useTokens } from "./useTokens";
import { CHAINS_LIST } from '../config';

export function useChains() {
  const tokens = useTokens()
  tokens[0]?.blockchain
    const chainsFromTokens = Array.from(
      new Set(tokens.map((token) => CHAINS_LIST[token.blockchain]).filter((chain) => chain)))
  return chainsFromTokens;
}
