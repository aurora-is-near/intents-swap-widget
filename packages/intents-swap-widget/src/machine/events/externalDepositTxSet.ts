import type { Context } from '@/machine/context';

export const externalDepositTxSet = (
  ctx: Context,
  received: boolean | undefined,
): void => {
  ctx.externalDepositTxReceived = received;
};
