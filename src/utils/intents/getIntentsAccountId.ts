import { base58, hex } from '@scure/base';

import { logger } from '@/logger';

import { notReachable } from '../notReachable';

type Args = {
  walletAddress: string;
  addressType: 'evm' | 'near' | 'sol';
};

// For EVM and NEAR wallets, the account ID is the wallet address in lowercase
// this hook is here to extend it in the future with other wallet types
export const getIntentsAccountId = ({ walletAddress, addressType }: Args) => {
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
