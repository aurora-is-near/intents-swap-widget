import { nearRpcClient } from './rpc';
import { logger } from '@/logger';

const STORAGE_KEY = 'intents-widget:verified-near-accounts';
const DEBOUNCE_MS = 300;

// In-memory cache for current session (includes non-existent accounts)
const sessionCache = new Map<string, boolean>();

// Debounce state
let pendingAccountId: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

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

const queryAccountExists = async (accountId: string): Promise<boolean> => {
  try {
    await nearRpcClient.query({
      request_type: 'view_account',
      account_id: accountId,
      finality: 'final',
    });

    addVerifiedAccount(accountId);
    sessionCache.set(accountId, true);
    return true;
  } catch (err: unknown) {
    const errorString = JSON.stringify(err);

    // Account doesn't exist
    if (/does not exist|UNKNOWN_ACCOUNT|AccountDoesNotExist/i.test(errorString)) {
      sessionCache.set(accountId, false);
      return false;
    }

    // RPC failures - block quote (better safe than sorry)
    if (/RetriesExceeded|providers/i.test(errorString)) {
      logger.error(new Error('NEAR RPC providers failed', { cause: err }));
      return false;
    }

    logger.error(new Error('Error checking NEAR account', { cause: err }));
    return true;
  }
};

/**
 * Check if a NEAR account exists on-chain using the view_account RPC method.
 * Results are cached. Requests are debounced to avoid excessive RPC calls.
 */
export const checkNearAccountExists = async (
  accountId: string,
): Promise<boolean> => {
  // Check session cache first (includes non-existent accounts)
  if (sessionCache.has(accountId)) {
    return sessionCache.get(accountId) ?? false;
  }

  // Check localStorage cache (only verified/existing accounts)
  if (getVerifiedAccounts().has(accountId)) {
    sessionCache.set(accountId, true);
    return true;
  }

  // Debounce: cancel previous pending request
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  pendingAccountId = accountId;

  return new Promise((resolve) => {
    debounceTimer = setTimeout(async () => {
      // Only proceed if this is still the latest request
      if (pendingAccountId !== accountId) {
        resolve(true); // Allow quote to proceed, will be re-checked
        return;
      }

      const exists = await queryAccountExists(accountId);
      resolve(exists);
    }, DEBOUNCE_MS);
  });
};
