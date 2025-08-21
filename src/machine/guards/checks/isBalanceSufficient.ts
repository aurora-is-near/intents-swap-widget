import { parseUnits } from 'ethers';

import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';

import type { Context } from '@/machine/context';

export const isBalanceSufficient = (ctx: Context): boolean => {
  return (
    !!ctx.sourceToken &&
    !!ctx.sourceTokenAmount &&
    !!ctx.sourceTokenBalance &&
    isNotEmptyAmount(ctx.sourceTokenAmount) &&
    isNotEmptyAmount(ctx.sourceTokenBalance) &&
    parseUnits(ctx.sourceTokenAmount, ctx.sourceToken.decimals) <
      parseUnits(ctx.sourceTokenBalance, ctx.sourceToken.decimals)
  );
};
