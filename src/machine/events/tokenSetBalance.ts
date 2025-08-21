import type { TokenBalance } from '@/types/token';

import type { Context } from '@/machine/context';

export type TokenSetBalancePayload = TokenBalance;

export const tokenSetBalance = (
  ctx: Context,
  payload: TokenSetBalancePayload,
): void => {
  ctx.sourceTokenBalance = payload;
};
