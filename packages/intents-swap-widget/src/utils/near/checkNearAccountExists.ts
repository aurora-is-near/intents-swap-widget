import { noop } from '@tanstack/react-query';

import { nearSingleRpcClient } from './rpc';
import { localStorageTyped } from '@/utils/localstorage';
import { logger } from '@/logger';

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

const addVerifiedAccount = (accountId: string): void => {
  const accounts = new Set(localStorageTyped.getItem('verifiedNearAccounts'));

  accounts.add(accountId);
  localStorageTyped.setItem('verifiedNearAccounts', [...accounts]);
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

  if (
    new Set(localStorageTyped.getItem('verifiedNearAccounts')).has(accountId)
  ) {
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

  let resolvePromise: (exists: boolean) => void = noop;
  let rejectPromise: (error: Error) => void = noop;

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
    resolve: resolvePromise,
    reject: rejectPromise,
  };

  return promise;
};
