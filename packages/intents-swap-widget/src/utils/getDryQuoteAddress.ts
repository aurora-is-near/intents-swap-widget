import type { Chains, EvmChains } from '@/types/chain';
import { DRY_QUOTE_ZERO_ADDRESSES } from '../constants/chains';
import { isEvmChain } from './evm/isEvmChain';

export function getDryQuoteAddress(
  tokenBlockchain: Chains | EvmChains,
  isIntent?: boolean,
): string {
  if (isIntent) {
    return DRY_QUOTE_ZERO_ADDRESSES.near;
  }

  const sourceTokenEngineType = isEvmChain(tokenBlockchain)
    ? 'evm'
    : tokenBlockchain;

  // intents supports only this three chains for wallet connection, check getIntentsAccountId.ts
  switch (sourceTokenEngineType) {
    case 'evm':
      return DRY_QUOTE_ZERO_ADDRESSES.evm;
    case 'near':
      return DRY_QUOTE_ZERO_ADDRESSES.near;
    case 'sol':
      return DRY_QUOTE_ZERO_ADDRESSES.sol;
    case 'stellar':
      return DRY_QUOTE_ZERO_ADDRESSES.stellar;
    default:
      return DRY_QUOTE_ZERO_ADDRESSES.evm;
  }
}
