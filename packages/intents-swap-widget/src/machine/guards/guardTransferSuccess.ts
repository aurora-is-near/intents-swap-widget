import type { Context, TransferSuccessContext } from '@/machine/context';

export const guardTransferSuccess = (
  ctx: Context,
): ctx is TransferSuccessContext => {
  return !!ctx.walletAddress && ctx.transferStatus.status === 'success';
};
