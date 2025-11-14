import { base58, hex } from '@scure/base';

import { notReachable } from '../notReachable';
import { IntentsAccountType } from '../../types';
import { logger } from '@/logger';

type Args = {
  walletAddress?: string;
  addressType?: IntentsAccountType;
};

// For EVM and NEAR wallets, the account ID is the wallet address in lowercase
// this hook is here to extend it in the future with other wallet types
export const getIntentsAccountId = ({ walletAddress, addressType }: Args) => {
  if (!walletAddress || !addressType) {
    return;
  }

  // sanity check, there are multiple places in the widget where the addressType is not getting updated reactively
  // causing the app to crash
  if (walletAddress.includes('0x') && addressType === 'sol') {
    logger.error('Solana address should not start with 0x');

    return;
  }

  switch (addressType) {
    case 'evm':
    case 'near':
      return walletAddress.toLowerCase();
    case 'sol':
      return hex.encode(base58.decode(walletAddress));
    default:
      logger.error('Unsupported connected wallet type');

      return notReachable(addressType, { throwError: false });
  }
};
