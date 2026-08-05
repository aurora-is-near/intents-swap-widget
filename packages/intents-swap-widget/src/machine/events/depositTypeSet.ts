import type { Context } from '@/machine/context';

export type DepositTypeSetPayload = { isExternal: boolean };

export const depositTypeSet = (
  ctx: Context,
  payload: DepositTypeSetPayload,
): void => {
  ctx.isDepositFromExternalWallet = payload.isExternal;

  // The amounts used to be cleared on the way in, because an empty source
  // amount was what selected FLEX_INPUT in `useMakeQuote`. External deposits
  // are unconditionally FLEX_INPUT now, so the figures are the user's to keep -
  // they survive a toggle round trip and stay out of the quote request.
  if (!payload.isExternal) {
    delete ctx.refundToAddress;
  }
};
