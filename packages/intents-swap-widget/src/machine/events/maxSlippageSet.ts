import type { Context } from '@/machine/context';

export type MaxSlippageSetPayload = number;

export const maxSlippageSet = (
  ctx: Context,
  payload: MaxSlippageSetPayload,
): void => {
  ctx.maxSlippage = payload;
};
