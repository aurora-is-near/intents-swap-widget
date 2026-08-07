import type { Chains } from '@/types/chain';
import { isEvmChain } from '@/utils/evm/isEvmChain';
import { isEvmAddress } from './isEvmAddress';
import { isNearAddress } from './isNearAddress';
import { isSolanaAddress } from './isSolanaAddress';
import { isTonAddress } from './isTonAddress';

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
