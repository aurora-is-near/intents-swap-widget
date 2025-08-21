import type { Context, ContextChange } from '@/machine/context';

export const isWalletDisconnected = (
  _ctx: Context,
  changes: ContextChange[],
) => {
  return !!changes.find(
    (change) =>
      change &&
      change.key === 'walletAddress' &&
      !!change.previousValue &&
      !change.value,
  );
};
