import type { Context, InitialDryContext } from '@/machine/context';
import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';
import { isBalanceSufficient } from './checks/isBalanceSufficient';
import { isRefundAddressValid } from './checks/isRefundAddressValid';
import { isSendAddressValid } from './checks/isSendAddressValid';

export const guardInitialDry = (ctx: Context): ctx is InitialDryContext => {
  return (
    !ctx.quote &&
    ctx.quoteStatus === 'idle' &&
    ctx.transferStatus.status === 'idle' &&
    (!ctx.sourceToken ||
      !ctx.targetToken ||
      !isNotEmptyAmount(ctx.sourceTokenAmount) ||
      (!ctx.walletAddress &&
        ctx.isDepositFromExternalWallet &&
        (!ctx.sendAddress ||
          !isSendAddressValid(ctx) ||
          !isRefundAddressValid(ctx))) ||
      (!!ctx.walletAddress &&
        !isBalanceSufficient(ctx) &&
        !ctx.isDepositFromExternalWallet))
  );
};
