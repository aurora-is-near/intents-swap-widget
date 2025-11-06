import { notReachable } from '../notReachable';
import { logger } from '@/logger';

type Args = {
  walletAddress: string;
  addressType: 'evm' | 'near';
};

// For EVM and NEAR wallets, the account ID is the wallet address in lowercase
// this hook is here to extend it in the future with other wallet types
export const getIntentsAccountId = ({ walletAddress, addressType }: Args) => {
  switch (addressType) {
    case 'evm':
    case 'near':
      return walletAddress.toLowerCase();
    default:
      logger.error('Unsupported connected wallet type');

      return notReachable(addressType, { throwError: false });
  }
};
