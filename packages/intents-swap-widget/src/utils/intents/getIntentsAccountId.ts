import { base58, hex } from '@scure/base';

import { notReachable } from '../notReachable';
import { isTonAddress } from '../ton/isTonAddress';
import { logger } from '@/logger';

type Args = {
  walletAddress: string;
  addressType: 'evm' | 'near' | 'sol';
};

// For EVM and NEAR wallets, the account ID is the wallet address in lowercase
// this hook is here to extend it in the future with other wallet types
export const getIntentsAccountId = ({ walletAddress, addressType }: Args) => {
  // Early return for empty or invalid addresses
  if (!walletAddress || walletAddress.trim() === '') {
    logger.error(
      '[getIntentsAccountId] Empty wallet address provided',
      'addressType:',
      addressType,
    );

    return;
  }

  // Filter out zero addresses (EVM placeholder addresses)
  if (walletAddress === '0x0000000000000000000000000000000000000000') {
    logger.error(
      '[getIntentsAccountId] Zero address provided',
      'addressType:',
      addressType,
    );

    return;
  }

  // Handle TON addresses - they work like NEAR addresses for intents
  // This allows TON tokens to be used as source even when addressType is set
  // based on a different connected wallet (e.g., Solana or EVM)
  if (isTonAddress(walletAddress)) {
    return walletAddress.toLowerCase();
  }

  // sanity check, there are multiple places in the widget where the addressType is not getting updated reactively
  // causing the app to crash
  if (walletAddress.includes('0x') && addressType === 'sol') {
    logger.error(
      'Solana address should not start with 0x, received:',
      walletAddress,
    );

    return;
  }

  // Validate Solana address format - must be valid base58
  if (addressType === 'sol') {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

    if (!base58Regex.test(walletAddress)) {
      logger.error(
        'Invalid Solana address format, expected base58, received:',
        walletAddress,
      );

      return;
    }
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
