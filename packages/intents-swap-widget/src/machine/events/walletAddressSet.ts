import type { Context } from '@/machine/context';

export type WalletAddressSetPayload = string | undefined;

export const walletAddressSet = (
  ctx: Context,
  payload: WalletAddressSetPayload,
): void => {
  ctx.walletAddress = payload;
};
