import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';

import type { Context, InputValidExternalContext } from '@/machine/context';

import { isBalanceSufficient } from './checks/isBalanceSufficient';

export const guardInputValidExternal = (
  ctx: Context,
): ctx is InputValidExternalContext => {
  return (
    !ctx.quote &&
    ctx.quoteStatus !== 'success' &&
    ctx.transferStatus.status === 'idle' &&
    !!ctx.sendAddress &&
    !!ctx.walletAddress &&
    !!ctx.sourceToken &&
    !!ctx.targetToken &&
    !ctx.targetToken.isIntent &&
    isBalanceSufficient(ctx) &&
    isNotEmptyAmount(ctx.sourceTokenAmount)
  );
};
