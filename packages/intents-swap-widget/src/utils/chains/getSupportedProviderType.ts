import { isEvmAddress } from './isEvmAddress';
import { isNearAddress } from './isNearAddress';
import { isSolanaAddress } from './isSolanaAddress';

import type { Providers } from '@/types';

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

  throw new Error('Unsupported provider type');
};
