/** Rejects after `ms`, clearing its timer either way. */
export const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('wallet did not respond')), ms);
    }),
  ]).finally(() => clearTimeout(timer));
};

/**
 * Calls a wallet API so that a synchronous throw becomes a rejection: wallet
 * code is third-party, and a sync throw would otherwise escape the caller's
 * `.catch()`.
 */
export const callWallet = <T>(call: () => Promise<T>): Promise<T> => {
  try {
    return Promise.resolve(call());
  } catch (error) {
    return Promise.reject(error);
  }
};
