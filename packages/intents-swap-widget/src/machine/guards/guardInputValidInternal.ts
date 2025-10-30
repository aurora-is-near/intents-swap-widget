import { isBalanceSufficient } from './checks/isBalanceSufficient';
import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';

import type { Context, InputValidInternalContext } from '@/machine/context';

export const guardInputValidInternal = (
  ctx: Context,
): ctx is InputValidInternalContext => {
  return (
    !ctx.quote &&
    ctx.quoteStatus !== 'success' &&
    ctx.transferStatus.status === 'idle' &&
    !ctx.sendAddress &&
    !!ctx.walletAddress &&
    !!ctx.sourceToken &&
    !!ctx.targetToken &&
    ctx.targetToken.isIntent &&
    (isBalanceSufficient(ctx) || ctx.isDepositFromExternalWallet) &&
    isNotEmptyAmount(ctx.sourceTokenAmount)
  );
};
