import type { Providers } from '@/types';
import { isEvmAddress } from './isEvmAddress';
import { isNearAddress } from './isNearAddress';
import { isSolanaAddress } from './isSolanaAddress';
import { isStellarAddress } from './isStellarAddress';

export const getSupportedProviderType = (
  depositAddress: string,
): keyof Providers => {
  if (isEvmAddress(depositAddress)) {
    return 'evm';
  }

  if (isNearAddress(depositAddress)) {
    return 'near';
  }

  if (isSolanaAddress(depositAddress)) {
    return 'sol';
  }

  if (isStellarAddress(depositAddress)) {
    return 'stellar';
  }

  throw new Error('Unsupported provider type');
};
