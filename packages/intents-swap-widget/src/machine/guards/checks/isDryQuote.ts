import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';
import type { Context } from '@/machine/context';
import { isBalanceSufficient } from './isBalanceSufficient';

export const isDryQuote = (ctx: Context): boolean => {
  return (
    // wallet is not connected & not QR code
    (!ctx.isDepositFromExternalWallet &&
      !ctx.walletAddress &&
      isNotEmptyAmount(ctx.sourceTokenAmount)) ||
    // or insufficient balance for connected wallet
    (!!ctx.walletAddress &&
      !ctx.isDepositFromExternalWallet &&
      isNotEmptyAmount(ctx.sourceTokenAmount) &&
      !isBalanceSufficient(ctx))
  );
};
