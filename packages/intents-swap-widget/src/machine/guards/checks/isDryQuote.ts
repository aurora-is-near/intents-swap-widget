import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';
import type { Context } from '@/machine/context';
import { isBalanceSufficient } from './isBalanceSufficient';

export const isDryQuote = (ctx: Context): boolean => {
  return (
    !ctx.walletAddress ||
    (isNotEmptyAmount(ctx.sourceTokenAmount) && !isBalanceSufficient(ctx))
  );
};
