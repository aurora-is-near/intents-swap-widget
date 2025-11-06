import { DRY_QUOTE_ZERO_ADDRESSES, EVM_CHAINS } from '../constants/chains';
import type { Chains, EvmChains } from '@/types/chain';

export function getDryQuoteAddress(
  tokenBlockchain: Chains | EvmChains,
  isIntent?: boolean,
): string {
  if (isIntent) {
    return DRY_QUOTE_ZERO_ADDRESSES.near;
  }

  const sourceTokenEngineType = Object.keys(EVM_CHAINS).includes(
    tokenBlockchain,
  )
    ? 'evm'
    : tokenBlockchain;

  // intents supports only EVM and NEAR for wallet connection, check getIntentsAccountId.ts
  switch (sourceTokenEngineType) {
    case 'evm':
      return DRY_QUOTE_ZERO_ADDRESSES.evm;
    case 'near':
      return DRY_QUOTE_ZERO_ADDRESSES.near;
    default:
      return DRY_QUOTE_ZERO_ADDRESSES.evm;
  }
}
