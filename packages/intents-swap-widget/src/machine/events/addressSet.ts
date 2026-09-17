import type { Context } from '@/machine/context';

export type AddressSetPayload = string | null;

export const addressSet = (ctx: Context, payload: AddressSetPayload): void => {
  const address = payload?.trim();

  if (!address) {
    delete ctx.sendAddress;

    return;
  }

  ctx.sendAddress = address;
};
