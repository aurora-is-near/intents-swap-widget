import type { IntentsAccountFamily } from '@aurora-is-near/intents-connect';

import type { BalanceSource } from './useWalletAssets';

/**
 * Which balance lists a wallet gets in the asset picker: its own, plus its
 * intents account's where a supply can be paid from them. Funding from
 * intents needs a wallet that signs intents (EVM, Solana, NEAR); the intents
 * API opens no session for Solana wallets, so they get no confidential list.
 * Shown as soon as the account id derives: there is no "account exists"
 * call, and confidential funds can't be seen before authorizing.
 */
export const balanceSources = ({
  family,
  intentsAccountId,
}: {
  family?: IntentsAccountFamily;
  intentsAccountId?: string;
}): BalanceSource[] => {
  if (!intentsAccountId) {
    return ['wallet'];
  }

  switch (family) {
    case 'evm':
    case 'near':
      return ['wallet', 'intents', 'confidential'];
    case 'sol':
      return ['wallet', 'intents'];
    default:
      return ['wallet'];
  }
};
