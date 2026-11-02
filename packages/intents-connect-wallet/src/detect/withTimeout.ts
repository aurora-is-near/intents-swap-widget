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
