import type { Context } from '@/machine/context';

export type PendingTransactionsCountSetPayload = number;

export const pendingTransactionsCountSet = (
  ctx: Context,
  payload: PendingTransactionsCountSetPayload,
): void => {
  ctx.pendingTransactionsCount = payload;
};
