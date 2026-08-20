import { isValidChainAddress } from '@/utils/checkers/isValidChainAddress';
import type { Context } from '@/machine/context';

export const isRefundAddressValid = (ctx: Context): boolean => {
  if (!!ctx.walletAddress || !ctx.isDepositFromExternalWallet) {
    return true;
  }

  return (
    !!ctx.refundToAddress &&
    !!ctx.sourceToken &&
    isValidChainAddress(ctx.sourceToken.blockchain, ctx.refundToAddress) ===
      true
  );
};
