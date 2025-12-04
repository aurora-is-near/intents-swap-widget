import { nearRpcClient } from './rpc';
import { logger } from '@/logger';

const STORAGE_KEY = 'intents-widget:verified-near-accounts';

const getVerifiedAccounts = (): Set<string> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

const addVerifiedAccount = (accountId: string): void => {
  try {
    const accounts = getVerifiedAccounts();
    accounts.add(accountId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...accounts]));
  } catch {
    // localStorage not available
  }
};

/**
 * Check if a NEAR account exists on-chain using the view_account RPC method.
 * Results are cached in localStorage.
 */
export const checkNearAccountExists = async (
  accountId: string,
): Promise<boolean> => {
  if (getVerifiedAccounts().has(accountId)) {
    return true;
  }

  try {
    await nearRpcClient.query({
      request_type: 'view_account',
      account_id: accountId,
      finality: 'final',
    });

    addVerifiedAccount(accountId);

    return true;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes('does not exist while viewing')
    ) {
      return false;
    }

    logger.error(
      new Error('error checking near account existence', { cause: err }),
    );

    // Network error - allow quote to proceed
    return true;
  }
};
