import type { Context, ContextChange } from '@/machine/context';

/** One connected wallet replaced by another (not connected or disconnected). */
export const isWalletSwitched = (_ctx: Context, changes: ContextChange[]) =>
  changes.some(
    (change) =>
      change &&
      change.key === 'walletAddress' &&
      !!change.previousValue &&
      !!change.value &&
      change.previousValue !== change.value,
  );
