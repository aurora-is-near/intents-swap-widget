import { notReachable } from '@/utils/notReachable';

import type { Context } from '@/machine/context';

export type TokenSetAmountPayload = {
  variant: 'source' | 'target';
  amount: string;
};

export const tokenSetAmount = (
  ctx: Context,
  payload: TokenSetAmountPayload,
): void => {
  const { variant, amount } = payload;

  switch (variant) {
    case 'source':
      ctx.sourceTokenAmount = amount;
      break;
    case 'target':
      ctx.targetTokenAmount = amount;
      break;
    default:
      notReachable(variant, { throwError: false });
  }
};
