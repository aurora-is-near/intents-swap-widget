import type { Context } from '@/machine/context';

export type RefundToAddressSetPayload = string | null;

export const refundToAddressSet = (
  ctx: Context,
  payload: RefundToAddressSetPayload,
): void => {
  const address = payload?.trim();

  if (!address) {
    delete ctx.refundToAddress;

    return;
  }

  ctx.refundToAddress = address;
};
