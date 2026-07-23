import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';
import type { Context, InputValidExternalContext } from '@/machine/context';
import { isSendAddressValid } from './checks/isSendAddressValid';
import { isBalanceSufficient } from './checks/isBalanceSufficient';
import { isRefundAddressValid } from './checks/isRefundAddressValid';

// External -- target token IS NOT intent
export const guardInputValidExternal = (
  ctx: Context,
): ctx is InputValidExternalContext => {
  return (
    !ctx.quote &&
    ctx.quoteStatus !== 'success' &&
    ctx.transferStatus.status === 'idle' &&
    !!ctx.sendAddress &&
    (!!ctx.walletAddress || ctx.isDepositFromExternalWallet) &&
    isRefundAddressValid(ctx) &&
    !!ctx.sourceToken &&
    !!ctx.targetToken &&
    !ctx.targetToken.isIntent &&
    isSendAddressValid(ctx) &&
    (isBalanceSufficient(ctx) || ctx.isDepositFromExternalWallet) &&
    (isNotEmptyAmount(ctx.sourceTokenAmount) || ctx.isDepositFromExternalWallet)
  );
};
