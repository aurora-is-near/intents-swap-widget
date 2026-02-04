import type { Context } from '@/machine/context';

export type AddressSetPayload = string | null;

export const addressSet = (ctx: Context, payload: AddressSetPayload): void => {
  if (!payload) {
    delete ctx.sendAddress;

    return;
  }

  ctx.sendAddress = payload;
};
