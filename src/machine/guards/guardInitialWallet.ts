import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';

import type { Context, InitialWalletContext } from '@/machine/context';

import { isSendAddressValid } from './checks/isSendAddressValid';
import { isBalanceSufficient } from './checks/isBalanceSufficient';

export const guardInitialWallet = (
  ctx: Context,
): ctx is InitialWalletContext => {
  return (
    !ctx.quote &&
    ctx.quoteStatus === 'idle' &&
    ctx.transferStatus.status === 'idle' &&
    !!ctx.walletAddress &&
    (!ctx.sourceToken ||
      !ctx.targetToken ||
      !isNotEmptyAmount(ctx.sourceTokenAmount) ||
      !isSendAddressValid(ctx) ||
      !isBalanceSufficient(ctx))
  );
};
