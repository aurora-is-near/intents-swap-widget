import type { Context } from '@/machine/context';

export type PollingTransactionsSetPayload = number | null;

export const pollingTransactionsSet = (
  ctx: Context,
  payload: PollingTransactionsSetPayload,
): void => {
  ctx.pollingTransactionsStartedAt = payload;
};
