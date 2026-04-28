import { isEvmAddress } from './isEvmAddress';
import { isNearAddress } from './isNearAddress';
import { isSolanaAddress } from './isSolanaAddress';
import { isStellarAddress } from './isStellarAddress';
import { isTronAddress } from './isTronAddress';
import type { IntentsAccountType } from '@/types/config';

export const getIntentsAccountTypeFromAddress = (
  address: string,
): IntentsAccountType | undefined => {
  if (isTronAddress(address)) {
    return 'tron';
  }

  if (isSolanaAddress(address)) {
    return 'sol';
  }

  if (isEvmAddress(address)) {
    return 'evm';
  }

  if (isNearAddress(address)) {
    return 'near';
  }

  if (isStellarAddress(address)) {
    return 'stellar';
  }

  if (isTronAddress(address)) {
    return 'tron';
  }

  return undefined;
};
