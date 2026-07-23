import type { Context } from '@/machine/context';

export type RefundToAddressSetPayload = string | null;

export const refundToAddressSet = (
  ctx: Context,
  payload: RefundToAddressSetPayload,
): void => {
  if (!payload) {
    delete ctx.refundToAddress;

    return;
  }

  ctx.refundToAddress = payload;
};
