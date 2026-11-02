import { base58, hex } from '@scure/base';

import type { Account } from './types';

/**
 * The account's NEAR Intents account ID, as the widget derives it: the
 * lowercase address for EVM, the NEAR account ID, the hex public key for
 * Solana, the derived ID for a passkey.
 */
export const getAccountIntentsId = (account: Account): string => {
  if (account.kind === 'passkey') {
    return account.intentsAccountId;
  }

  switch (account.family) {
    case 'sol':
      return hex.encode(base58.decode(account.address));
    case 'evm':
    case 'near':
    default:
      return account.address.toLowerCase();
  }
};
