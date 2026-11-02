import type { Account } from '../accounts/types';

/** Where the widget's WalletCompatibilityCheck records verified addresses. */
const VERIFIED_WALLETS_KEY = 'sw.verifiedWallets';

const verifiedWallets = (): string[] => {
  try {
    const stored = JSON.parse(
      localStorage.getItem(VERIFIED_WALLETS_KEY) ?? '[]',
    ) as unknown;

    return Array.isArray(stored) ? (stored as string[]) : [];
  } catch {
    return [];
  }
};

/**
 * Whether the account's wallet passed the widget's compatibility check on
 * this device. Passkeys are checked against intents.near when created.
 */
export const isAccountVerified = (account: Account) =>
  account.kind === 'passkey' || verifiedWallets().includes(account.address);
