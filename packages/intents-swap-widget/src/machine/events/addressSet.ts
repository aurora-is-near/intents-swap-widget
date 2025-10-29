import type { Context } from '@/machine/context';

export type AddressSetPayload = string;

export const addressSet = (ctx: Context, payload: AddressSetPayload): void => {
  ctx.sendAddress = payload;
};
