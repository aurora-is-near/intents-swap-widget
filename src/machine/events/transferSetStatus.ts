import type { Context } from '@/machine/context';

type TransferStatus =
  | { status: 'idle' | 'error' | 'success'; reason?: never }
  | { status: 'pending'; reason: 'PROCESSING' | 'WAITING_CONFIRMATION' };

export type TransferSetStatusPayload = TransferStatus;

export const transferSetStatus = (
  ctx: Context,
  payload: TransferSetStatusPayload,
): void => {
  // @ts-expect-error
  ctx.transferStatus = payload;
};
