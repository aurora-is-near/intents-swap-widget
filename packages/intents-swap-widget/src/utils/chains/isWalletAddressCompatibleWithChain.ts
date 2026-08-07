import { isEvmChain } from '@/utils/evm/isEvmChain';
import type { Chains } from '@/types/chain';

import { isEvmAddress } from './isEvmAddress';
import { isTonAddress } from './isTonAddress';
import { isNearAddress } from './isNearAddress';
import { isSolanaAddress } from './isSolanaAddress';

export const isWalletAddressCompatibleWithChain = (
  address: string,
  chain: Chains,
): boolean => {
  if (isEvmChain(chain)) {
    return isEvmAddress(address);
  }

  switch (chain) {
    case 'near':
      // A lowercase 0x address also satisfies NEAR's permissive account ID
      // grammar, but connected 0x wallets must be treated as EVM wallets.
      return !isEvmAddress(address) && isNearAddress(address);
    case 'sol':
      return isSolanaAddress(address);
    case 'ton':
      return isTonAddress(address);
    default:
      // Balance loading for other non-EVM chains either validates the address
      // in its chain integration or is not implemented by this loader yet.
      return true;
  }
};
