import { base58, hex } from '@scure/base';

import { isStellarAddress } from '@/utils/chains/isStellarAddress';
import { logger } from '@/logger';
import { notReachable } from '../notReachable';
import { IntentsAccountType } from '../../types';
import { stellarAddressToBytes } from '../stellar/stellarAddressToBytes';

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

  if (!isStellarAddress(walletAddress) && addressType === 'stellar') {
    logger.error('Stellar address should start with G');

    return;
  }

  // A passkey account's address already is its intents account ID: `0x` +
  // 20 bytes for P-256, 64 hex chars for Ed25519.
  if (
    addressType === 'webauthn' &&
    !/^(0x[0-9a-f]{40}|[0-9a-f]{64})$/i.test(walletAddress)
  ) {
    logger.error('Passkey account ID is malformed');

    return;
  }

  switch (addressType) {
    case 'evm':
    case 'near':
    case 'webauthn':
      return walletAddress.toLowerCase();
    case 'stellar':
      return hex.encode(stellarAddressToBytes(walletAddress));
    case 'sol':
      return hex.encode(base58.decode(walletAddress));
    default:
      logger.error('Unsupported connected wallet type');
      // not returned: notReachable is typed `void` here, which would widen the
      // return type to `string | void` and force `?? ''` on every caller
      notReachable(addressType, { throwError: false });

      return;
  }
};
