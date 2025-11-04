import type { Context } from '@/machine/context';

export const externalDepositTxSet = (ctx: Context, received: boolean): void => {
  ctx.externalDepositTxReceived = received;
};
