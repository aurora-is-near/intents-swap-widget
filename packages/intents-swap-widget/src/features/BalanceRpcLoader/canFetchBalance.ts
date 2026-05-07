import type { ChainRpcUrls, Chains } from '@/types/chain';

// Chains whose balance is fetched via an external service (Alchemy, Blockchair,
// etc.) rather than a JSON-RPC URL from `rpcs`.
const EXTERNAL_API_BALANCE_CHAINS: readonly Chains[] = [
  'starknet',
  'dash',
  'bch',
];

export const canFetchBalance = (rpcs: ChainRpcUrls, blockchain: Chains) =>
  Object.keys(rpcs).includes(blockchain) ||
  EXTERNAL_API_BALANCE_CHAINS.includes(blockchain);
