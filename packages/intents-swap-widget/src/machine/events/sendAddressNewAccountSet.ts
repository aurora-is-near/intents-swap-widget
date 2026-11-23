import type { Context } from '@/machine/context';

/** The send address found not to exist on-chain yet, or undefined. */
export type SendAddressNewAccountSetPayload = string | undefined;

export const sendAddressNewAccountSet = (
  ctx: Context,
  payload: SendAddressNewAccountSetPayload,
): void => {
  ctx.newAccountSendAddress = payload;
};
