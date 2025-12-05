import { nearSingleRpcClient } from './rpc';
import { logger } from '@/logger';

const STORAGE_KEY = 'intents-widget:verified-near-accounts';
const DEBOUNCE_MS = 300;

const sessionCache = new Map<string, boolean>();

type PendingCheck = {
  accountId: string;
  promise: Promise<boolean>;
  timer: ReturnType<typeof setTimeout>;
  resolve: (exists: boolean) => void;
  reject: (error: Error) => void;
};

let pendingCheck: PendingCheck | null = null;

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
    await nearSingleRpcClient.query({
      request_type: 'view_account',
      account_id: accountId,
      finality: 'final',
    });

    addVerifiedAccount(accountId);
    sessionCache.set(accountId, true);

    return true;
  } catch (err: unknown) {
    const pattern =
      /doesn.t exist|does not exist|UNKNOWN_ACCOUNT|AccountDoesNotExist/i;

    // Safe string conversion (JSON.stringify can throw on circular refs)
    const errText =
      err instanceof Error ? `${err.message} ${String(err)}` : String(err);

    if (pattern.test(errText)) {
      sessionCache.set(accountId, false);

      return false;
    }

    // RPC/network failures: allow quote, backend will validate
    logger.error(new Error('NEAR RPC check failed', { cause: err }));

    return true;
  }
};

/**
 * Check if a NEAR account exists on-chain. Results are cached and debounced.
 */
export const checkNearAccountExists = async (
  accountId: string,
): Promise<boolean> => {
  if (sessionCache.has(accountId)) {
    return sessionCache.get(accountId) ?? false;
  }

  if (getVerifiedAccounts().has(accountId)) {
    sessionCache.set(accountId, true);

    return true;
  }

  if (pendingCheck?.accountId === accountId) {
    return pendingCheck.promise;
  }

  if (pendingCheck) {
    clearTimeout(pendingCheck.timer);
    pendingCheck.reject(new Error('ACCOUNT_CHECK_SUPERSEDED'));
    pendingCheck = null;
  }

  let resolvePromise: (exists: boolean) => void;
  let rejectPromise: (error: Error) => void;
  const promise = new Promise<boolean>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const timer = setTimeout(async () => {
    pendingCheck = null;
    resolvePromise(await queryAccountExists(accountId));
  }, DEBOUNCE_MS);

  pendingCheck = {
    accountId,
    promise,
    timer,
    resolve: resolvePromise!,
    reject: rejectPromise!,
  };

  return promise;
};
