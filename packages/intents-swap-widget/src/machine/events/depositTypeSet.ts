import type { Context } from '@/machine/context';

export type DepositTypeSetPayload = { isExternal: boolean };

export const depositTypeSet = (
  ctx: Context,
  payload: DepositTypeSetPayload,
): void => {
  ctx.isDepositFromExternalWallet = payload.isExternal;
};
